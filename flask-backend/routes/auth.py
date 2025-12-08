from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from bson import ObjectId
import dbConnect
from utils import decode_jwt, generate_jwt

auth_bp = Blueprint('auth', __name__)
users_collection = dbConnect.users_collection


def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"msg": "Token missing"}), 401

        if token.startswith("Bearer "):
            token = token[7:]

        payload = decode_jwt(token)
        if not payload:
            return jsonify({"msg": "Invalid or expired token"}), 401

        return f(payload["user_id"], *args, **kwargs)
    return wrapper


@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"msg": "No data provided"}), 400

        name = data.get("name", "").strip()
        age = data.get("age")
        gender = data.get("gender", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not all([name, age, gender, email, password]):
            return jsonify({"msg": "All fields required"}), 400

        if "@" not in email:
            return jsonify({"msg": "Invalid email"}), 400

        try:
            age = int(age)
            if not (1 <= age <= 120):
                return jsonify({"msg": "Age must be 1-120"}), 400
        except:
            return jsonify({"msg": "Invalid age"}), 400

        if users_collection.find_one({"email": email}):
            return jsonify({"msg": "Email already exists"}), 409

        hashed_password = generate_password_hash(password)

        user_doc = {
            "name": name,
            "age": age,
            "gender": gender,
            "email": email,
            "password": hashed_password,
            "ailments": [],
            "medications": ""
        }

        result = users_collection.insert_one(user_doc)
        user_id = result.inserted_id

        token = generate_jwt(user_id, email)

        return jsonify({
            "msg": "Signup successful",
            "token": token,
            "user": {
                "id": str(user_id),
                "name": name,
                "email": email,
                "age": age,
                "gender": gender
            }
        }), 201

    except:
        return jsonify({"msg": "Server error"}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"msg": "No data provided"}), 400

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"msg": "Email and password required"}), 400

        user = users_collection.find_one({"email": email})
        if not user or not check_password_hash(user["password"], password):
            return jsonify({"msg": "Invalid email or password"}), 401

        token = generate_jwt(user["_id"], user["email"])

        return jsonify({
            "msg": "Login successful",
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "age": user["age"],
                "gender": user["gender"]
            }
        }), 200

    except:
        return jsonify({"msg": "Server error"}), 500


@auth_bp.route('/profile', methods=['GET'])
@auth_required
def get_profile(user_id):
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"msg": "User not found"}), 404

        return jsonify({
            "user": {
                "id": user_id,
                "name": user["name"],
                "email": user["email"],
                "age": user["age"],
                "gender": user["gender"],
                "ailments": user.get("ailments", []),
                "medications": user.get("medications", "")
            }
        }), 200

    except:
        return jsonify({"msg": "Server error"}), 500


@auth_bp.route('/profile', methods=['PUT'])
@auth_required
def update_profile(user_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"msg": "No data provided"}), 400

        update_fields = {}

        if "name" in data:
            update_fields["name"] = data["name"].strip()

        if "age" in data:
            try:
                age = int(data["age"])
                if 1 <= age <= 120:
                    update_fields["age"] = age
                else:
                    return jsonify({"msg": "Age must be 1-120"}), 400
            except:
                return jsonify({"msg": "Invalid age"}), 400

        if "gender" in data:
            update_fields["gender"] = data["gender"].strip()

        if "ailments" in data:
            update_fields["ailments"] = data["ailments"]

        if "medications" in data:
            update_fields["medications"] = data["medications"]

        if not update_fields:
            return jsonify({"msg": "No valid fields"}), 400

        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields}
        )

        return jsonify({"msg": "Profile updated"}), 200

    except:
        return jsonify({"msg": "Server error"}), 500


@auth_bp.route('/verify-token', methods=['GET'])
@auth_required
def verify_token(user_id):
    return jsonify({"msg": "Token is valid", "user_id": user_id}), 200
