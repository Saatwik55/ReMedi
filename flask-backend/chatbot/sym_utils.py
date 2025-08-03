import os
import json
import string
import numpy as np
import pandas as pd
import joblib
from typing import List, Dict, Optional, Tuple
from sentence_transformers import SentenceTransformer, util
from nltk.corpus import stopwords

BASE_DIR = os.path.dirname(__file__)

RF_MODEL_PATH = os.path.join(BASE_DIR, "random_forest_model.joblib")
DESC_FILE = os.path.join(BASE_DIR, "sym_desc.json")
EMBED_FILE = os.path.join(BASE_DIR, "symptom_embeddings.npy")
MI_MATRIX_PATH = os.path.join(BASE_DIR, "mi_matrix.csv")

required_files = {
    "Random Forest Model": RF_MODEL_PATH,
    "Symptom Descriptions": DESC_FILE,
    "Symptom Embeddings": EMBED_FILE,
    "MI Matrix": MI_MATRIX_PATH
}

for file_type, file_path in required_files.items():
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"{file_type} file not found: {file_path}")

rf_model = joblib.load(RF_MODEL_PATH)
MI_MATRIX = pd.read_csv(MI_MATRIX_PATH, index_col=0)

stop_words = set(stopwords.words('english'))
punct_table = str.maketrans("", "", string.punctuation)
MODEL_NAME = "all-mpnet-base-v2"

def clean_text(text: str) -> str:
    text = text.lower().translate(punct_table)
    words = text.split()
    return " ".join(w for w in words if w not in stop_words)

# --- Symptom Descriptions and Embeddings ---
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

# --- Symptom Matching ---
def hybrid_symptom_match(user_input: str, top_k: int = 5) -> List[str]:
    cleaned = clean_text(user_input)
    keyword_matches = [
        s for s in symptom_names if s.replace("_", " ") in cleaned
    ]

    user_embedding = model.encode(cleaned, convert_to_tensor=True)
    scores = util.cos_sim(user_embedding, util.Tensor(desc_embeddings))[0]
    top_indices = scores.topk(top_k).indices.tolist()
    semantic_matches = [symptom_names[i] for i in top_indices]

    combined = list(dict.fromkeys(keyword_matches + semantic_matches))[:top_k]
    return combined

# --- Next Best Symptom Suggestion ---
def find_next_best_symptom(
    symptom_weights: Dict[str, float],
    asked_symptoms: List[str],
    threshold: float = 0.001
) -> Optional[Tuple[str, float]]:
    confirmed_symptoms = [s for s, w in symptom_weights.items() if w > 0]
    if not confirmed_symptoms:
        return None

    potential_symptoms = set(MI_MATRIX.index) - set(asked_symptoms)
    if not potential_symptoms:
        return None

    scores = {}
    for potential in potential_symptoms:
        weighted_scores = [
            symptom_weights[s] * MI_MATRIX.loc[s, potential]
            for s in confirmed_symptoms
        ]
        total_weight = sum(symptom_weights[s] for s in confirmed_symptoms)
        avg_score = sum(weighted_scores) / total_weight
        scores[potential] = avg_score

    best_symptom, best_score = max(scores.items(), key=lambda x: x[1])
    return (best_symptom, best_score) if best_score >= threshold else None

# --- Final Prediction ---
def predict(user_symptoms: List[str]) -> str:
    all_symptoms = rf_model.feature_names_in_
    vector = [1 if symptom in user_symptoms else 0 for symptom in all_symptoms]
    return rf_model.predict([vector])[0]