from flask import Blueprint, request, jsonify
from routes.auth import auth_required
from chatbot import sym_utils as s
from typing import Dict, List

chatbot_bp = Blueprint('chatbot', __name__)


@chatbot_bp.route('/extract_symptoms/initial', methods=['POST'])
@auth_required
def extract_initial_symptoms(email):
    import sys
    
    try:
        print(f"=== REQUEST START ===", file=sys.stderr)
        print(f"User email: {email}", file=sys.stderr)
        
        data = request.get_json()
        print(f"Request data: {data}", file=sys.stderr)
        
        user_text = data.get("text", "").strip()
        print(f"User text: '{user_text}'", file=sys.stderr)

        if not user_text or len(user_text) < 5:
            print("Text too short, returning 400", file=sys.stderr)
            return jsonify({
                "message": "👋 Hi! Welcome to ReMedi Chatbot. Please describe what symptoms you're facing (e.g., fatigue, nausea)."
            }), 400

        print("About to import/call sym_utils...", file=sys.stderr)
        
        # Test the import first
        try:
            from chatbot import sym_utils as s
            print("sym_utils imported successfully", file=sys.stderr)
        except Exception as import_err:
            print(f"IMPORT ERROR: {import_err}", file=sys.stderr)
            raise import_err
            
        symptom_candidates = s.hybrid_symptom_match(user_text, top_k=5)
        print(f"Symptom candidates: {symptom_candidates}", file=sys.stderr)

        # Create symptom descriptions dictionary for the candidates
        symptom_descriptions = {}
        if symptom_candidates:
            for symptom in symptom_candidates:
                symptom_descriptions[symptom] = s.symptom_descriptions.get(
                    symptom, 
                    "No description available"
                )
        
        print(f"Symptom descriptions: {symptom_descriptions}", file=sys.stderr)

        return jsonify({
            "symptom_candidates": symptom_candidates or [],
            "symptom_descriptions": symptom_descriptions,  # Added this line
            "message": "I found some possible symptoms. Please rate how strongly you experience each one." if symptom_candidates else "No symptoms found. Please describe your symptoms differently.",
        })

    except Exception as e:
        print(f"=== ERROR OCCURRED ===", file=sys.stderr)
        print(f"Error type: {type(e).__name__}", file=sys.stderr)
        print(f"Error message: {str(e)}", file=sys.stderr)
        
        import traceback
        print("Full traceback:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print(f"=== ERROR END ===", file=sys.stderr)
        
        return jsonify({"error": f"{type(e).__name__}: {str(e)}"}), 500

@chatbot_bp.route('/extract_symptoms/next', methods=['POST'])
@auth_required
def extract_next_symptom(email):  # Added email parameter
    try:
        data = request.get_json()
        symptom_weights: Dict[str, float] = data.get("symptom_weights", {})
        asked_symptoms: List[str] = data.get("asked_symptoms", [])

        if not symptom_weights:
            return jsonify({"message": "No symptoms were confirmed."}), 400

        result = s.find_next_best_symptom(symptom_weights, asked_symptoms)

        if result is None:
            return jsonify({
                "message": "No further symptoms detected with high relevance.",
                "next_symptom": None,
                "suggestion_score": 0.0
            })

        next_symptom, score = result
        return jsonify({
            "next_symptom": next_symptom,
            "suggestion_score": round(score, 3),
            "message": f"Do you experience '{next_symptom.replace('_', ' ')}'? Use the slider to let me know how strongly you're feeling it.",
            "description": s.symptom_descriptions.get(next_symptom, "No description available.")
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500