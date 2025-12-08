from flask import Blueprint, request, jsonify, send_file, abort
from functools import wraps
from datetime import datetime
from bson import ObjectId
import os
import hashlib
import secrets
import jwt
from flask_cors import CORS

from dbConnect import db, users_collection

upload_bp = Blueprint('upload', __name__)
CORS(upload_bp, supports_credentials=True)

prescriptions_collection = db['prescriptions']

UPLOAD_DIR = "secure_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf'}
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")


# ---------------- AUTH DECORATOR ----------------

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return jsonify({"message": "CORS preflight OK"}), 200

        token = None
        if 'Authorization' in request.headers:
            try:
                token = request.headers['Authorization'].split(" ")[1]
            except:
                return jsonify({'message': 'Token format invalid'}), 401

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = data['user_id']
            current_user = users_collection.find_one({"_id": ObjectId(user_id)})
            if not current_user:
                return jsonify({'message': 'User not found'}), 401

        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
        except Exception as e:
            return jsonify({'message': f'Auth failed: {str(e)}'}), 401

        return f(current_user, *args, **kwargs)
    return decorated


# ---------------- HELPERS ----------------

def allowed_file(filename):
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

def generate_secure_filename(user_id, original_filename):
    ext = os.path.splitext(original_filename)[1].lower()
    random_name = secrets.token_urlsafe(32)
    user_hash = hashlib.sha256(user_id.encode()).hexdigest()[:16]
    user_folder = os.path.join(UPLOAD_DIR, user_hash)
    os.makedirs(user_folder, exist_ok=True)
    return os.path.join(user_folder, f"{random_name}{ext}")

def get_file_hash(file_path):
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for block in iter(lambda: f.read(4096), b""):
            sha256.update(block)
    return sha256.hexdigest()


# ---------------- ROUTES ----------------

@upload_bp.route('/prescription', methods=['POST', 'OPTIONS'])
@token_required
def upload_prescription(current_user):
    if request.method == 'OPTIONS':
        return jsonify({"message": "CORS OK"}), 200

    if 'file' not in request.files:
        return jsonify({'message': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'message': 'Invalid or missing file'}), 400

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size == 0:
        return jsonify({'message': 'File is empty'}), 400
    if file_size > MAX_FILE_SIZE:
        return jsonify({'message': 'File too large'}), 400

    try:
        user_id = str(current_user["_id"])
        secure_path = generate_secure_filename(user_id, file.filename)

        file.save(secure_path)
        file_hash = get_file_hash(secure_path)

        doc = {
            "user_id": ObjectId(user_id),
            "original_filename": file.filename,
            "secure_path": secure_path,
            "file_hash": file_hash,
            "file_size": file_size,
            "file_type": os.path.splitext(file.filename)[1].lower(),
            "upload_date": datetime.utcnow(),
            "status": "pending_ocr",
            "ocr_data": None,
            "metadata": {"content_type": file.content_type, "is_deleted": False}
        }

        result = prescriptions_collection.insert_one(doc)

        return jsonify({
            "message": "Prescription uploaded successfully",
            "prescription_id": str(result.inserted_id),
            "filename": file.filename,
            "upload_date": doc["upload_date"].isoformat(),
            "status": "pending_ocr"
        }), 201

    except Exception as e:
        if os.path.exists(secure_path):
            os.remove(secure_path)
        return jsonify({'message': f'Upload failed: {str(e)}'}), 500


@upload_bp.route('/prescriptions', methods=['GET'])
@token_required
def get_user_prescriptions(current_user):
    prescriptions = prescriptions_collection.find({
        "user_id": current_user["_id"],
        "metadata.is_deleted": False
    }).sort("upload_date", -1).limit(100)

    return jsonify({
        "prescriptions": [
            {
                "id": str(p["_id"]),
                "filename": p["original_filename"],
                "upload_date": p["upload_date"].isoformat(),
                "status": p["status"],
                "file_size": p["file_size"],
                "file_type": p["file_type"]
            }
            for p in prescriptions
        ]
    }), 200


@upload_bp.route('/prescriptions/<prescription_id>', methods=['DELETE'])
@token_required
def delete_prescription(current_user, prescription_id):
    try:
        prescription = prescriptions_collection.find_one({
            "_id": ObjectId(prescription_id),
            "user_id": current_user["_id"]
        })

        if not prescription:
            return jsonify({'message': 'Prescription not found'}), 404
        
        # Soft delete metadata
        prescriptions_collection.update_one(
            {"_id": ObjectId(prescription_id)},
            {"$set": {
                "metadata.is_deleted": True,
                "metadata.deleted_at": datetime.utcnow()
            }}
        )

        # Delete file if exists
        file_path = prescription.get("secure_path")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print("File delete failed:", e)

        return jsonify({"message": "Prescription deleted successfully"}), 200

    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ---------------- FILE SERVING ----------------
@upload_bp.route('/prescriptions/<prescription_id>/file', methods=['GET'])
@token_required
def serve_prescription_file(current_user, prescription_id):
    try:
        prescription = prescriptions_collection.find_one({
            "_id": ObjectId(prescription_id),
            "user_id": current_user["_id"],
            "metadata.is_deleted": False
        })

        if not prescription:
            return abort(404)

        file_path = prescription.get("secure_path")
        if not file_path or not os.path.exists(file_path):
            return abort(404)

        return send_file(file_path, as_attachment=False)
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500
