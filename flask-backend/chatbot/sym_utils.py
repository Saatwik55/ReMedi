import os
import json
import string
import numpy as np
import pandas as pd
import joblib
import torch
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer, util
from nltk.corpus import stopwords

BASE_DIR = os.path.dirname(__file__)

RF_MODEL_PATH = os.path.join(BASE_DIR, "random_forest_model.joblib")
DESC_FILE = os.path.join(BASE_DIR, "sym_desc.json")
EMBED_FILE = os.path.join(BASE_DIR, "symptom_embeddings.npy")
MI_MATRIX_PATH = os.path.join(BASE_DIR, "mi_matrix.csv")

for name, path in {
    "Random Forest Model": RF_MODEL_PATH,
    "Symptom Descriptions": DESC_FILE,
    "Symptom Embeddings": EMBED_FILE,
    "MI Matrix": MI_MATRIX_PATH
}.items():
    if not os.path.exists(path):
        raise FileNotFoundError(f"{name} file not found: {path}")

rf_model = joblib.load(RF_MODEL_PATH)
MI_MATRIX = pd.read_csv(MI_MATRIX_PATH, index_col=0)

stop_words = set(stopwords.words('english'))
punct_table = str.maketrans("", "", string.punctuation)
MODEL_NAME = "all-mpnet-base-v2"

# ---------------- Text Cleaning ----------------
def clean_text(text: str) -> str:
    text = text.lower().translate(punct_table)
    words = text.split()
    return " ".join(w for w in words if w not in stop_words)

# ---------------- Load Symptom Descriptions ----------------
with open(DESC_FILE, "r") as f:
    symptom_descriptions = json.load(f)

symptom_names = list(symptom_descriptions.keys())
description_texts = [symptom_descriptions[s] for s in symptom_names]

model = SentenceTransformer(MODEL_NAME)
if os.path.exists(EMBED_FILE):
    desc_embeddings = np.load(EMBED_FILE)
else:
    desc_embeddings = model.encode(description_texts, convert_to_numpy=True)
    np.save(EMBED_FILE, desc_embeddings)

desc_embeddings_tensor = torch.tensor(desc_embeddings)

# ---------------- Symptom Matching ----------------
def hybrid_symptom_match(user_input: str, top_k: int = 5) -> List[str]:
    cleaned = clean_text(user_input)
    
    keyword_matches = [s for s in symptom_names if s.replace("_", " ") in cleaned]

    user_embedding = model.encode(cleaned, convert_to_tensor=True)
    scores = util.cos_sim(user_embedding, desc_embeddings_tensor)[0]
    top_indices = scores.topk(top_k).indices.tolist()
    semantic_matches = [symptom_names[i] for i in top_indices]

    combined = list(dict.fromkeys(keyword_matches + semantic_matches))[:top_k]
    return combined

# ---------------- Next Best Symptom ----------------
def find_next_best_symptom(symptom_weights: Dict[str, int], asked_symptoms: List[str], threshold=0.01) -> Optional[str]:
    confirmed_symptoms = [s for s, present in symptom_weights.items() if present == 1]
    if not confirmed_symptoms:
        print("No confirmed symptoms yet.")
        return None

    potential_symptoms = set(MI_MATRIX.index) - set(asked_symptoms)
    if not potential_symptoms:
        print("No more potential symptoms to ask.")
        return None

    scores = {}
    for potential in potential_symptoms:
        total_mi = sum(MI_MATRIX.loc[conf, potential] for conf in confirmed_symptoms)
        avg_mi = total_mi / len(confirmed_symptoms)
        scores[potential] = avg_mi
        print(f"Potential: {potential}, Avg MI: {avg_mi:.4f}")

    next_symptom, next_score = max(scores.items(), key=lambda x: x[1])
    print(f"Next candidate: {next_symptom}, Score: {next_score:.4f}")
    if next_score < threshold or len(asked_symptoms) > 10:
        print("Score below threshold or too many questions asked, stopping.")
        return None

    return next_symptom

# ---------------- Prediction ----------------
def predict(user_symptoms: List[str]) -> str:
    all_symptoms = rf_model.feature_names_in_
    vector = [1 if s in user_symptoms else 0 for s in all_symptoms]
    return rf_model.predict([vector])[0]
