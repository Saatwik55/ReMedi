from flask import Blueprint, request, jsonify
from routes.auth import auth_required
from chatbot import sym_utils as s
from typing import Dict, List

chatbot_bp = Blueprint('chatbot', __name__)

# ---------------- INITIAL SYMPTOMS ----------------
@chatbot_bp.route('/extract_symptoms/initial', methods=['POST'])
@auth_required
def extract_initial_symptoms(email):
    try:
        data = request.get_json()
        user_text = data.get("text", "").strip()

        if not user_text or len(user_text) < 5:
            return jsonify({
                "message": "👋 Hi! Welcome to ReMedi Chatbot. Please describe your symptoms (e.g., fatigue, nausea)."
            }), 400

        # Get top symptom candidates
        symptom_candidates = s.hybrid_symptom_match(user_text, top_k=5)

        # Prepare descriptions
        symptom_descriptions = {sym: s.symptom_descriptions.get(sym, "No description available")
                                for sym in symptom_candidates}

        return jsonify({
            "symptom_candidates": symptom_candidates,
            "symptom_descriptions": symptom_descriptions,
            "message": "I found some possible symptoms. Please confirm which ones you are experiencing."
                        if symptom_candidates else "No symptoms found. Please describe your symptoms differently."
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"{type(e).__name__}: {str(e)}"}), 500


# ---------------- NEXT SYMPTOM ----------------
@chatbot_bp.route('/extract_symptoms/next', methods=['POST'])
@auth_required
def extract_next_symptom(email):
    try:
        data = request.get_json()
        symptom_state: Dict[str, int] = data.get("symptom_state", {})

        if not symptom_state:
            return jsonify({
                "message": "No symptom information received."
            }), 400

        symptom_weights = {s: v for s, v in symptom_state.items() if v == 1}
        asked_symptoms = list(symptom_state.keys())
        next_symptom = s.find_next_best_symptom(
            symptom_weights=symptom_weights,
            asked_symptoms=asked_symptoms
        )
        # Termination case → predict disease
        if not next_symptom:
            confirmed_symptoms = list(symptom_weights.keys())
            all_symptoms = s.rf_model.feature_names_in_
            vector = [1 if sym in confirmed_symptoms else 0 for sym in all_symptoms]
            predicted_disease = s.rf_model.predict([vector])[0]

            return jsonify({
                "message": f"Based on your confirmed symptoms, I predict: {predicted_disease}.",
                "next_symptom": None,
                "predicted_disease": predicted_disease
            })

        # Continue questioning
        return jsonify({
            "next_symptom": next_symptom,
            "suggestion_score": 1.0,
            "message": f"Do you experience '{next_symptom.replace('_', ' ')}'?",
            "description": s.symptom_descriptions.get(
                next_symptom, "No description available."
            )
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": f"{type(e).__name__}: {str(e)}"
        }), 500
