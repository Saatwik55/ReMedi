from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import dbConnect
from utils import decode_jwt, generate_jwt

# Create blueprint
auth_bp = Blueprint('auth', __name__)

# Get database collection
users_collection = dbConnect.users_collection

def auth_required(f):
    """Decorator to require authentication for protected routes"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"msg": "Token missing"}), 401
        
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
            
        payload = decode_jwt(token)
        if not payload:
            return jsonify({"msg": "Invalid or expired token"}), 401
        
        # Pass the email to the wrapped function
        return f(payload["email"], *args, **kwargs)
    return wrapper

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    try:
        data = request.get_json()
        
        # Validate request data
        if not data:
            return jsonify({"msg": "No data provided"}), 400
        
        # Extract fields
        name = data.get("name", "").strip()
        age = data.get("age")
        gender = data.get("gender", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        
        # Validate required fields
        if not all([name, age, gender, email, password]):
            return jsonify({"msg": "All fields (name, age, gender, email, password) are required"}), 400
        
        # Validate email format (basic check)
        if "@" not in email or "." not in email:
            return jsonify({"msg": "Invalid email format"}), 400
        
        # Validate age
        try:
            age = int(age)
            if age < 1 or age > 120:
                return jsonify({"msg": "Age must be between 1 and 120"}), 400
        except (ValueError, TypeError):
            return jsonify({"msg": "Age must be a valid number"}), 400
        
        # Check if user already exists
        if users_collection.find_one({"email": email}):
            return jsonify({"msg": "Email already exists"}), 409
        
        # Hash password
        hashed_password = generate_password_hash(password)
        
        # Create user document
        user_doc = {
            "name": name,
            "age": age,
            "gender": gender,
            "email": email,
            "password": hashed_password,
            "ailments": [],
            "medications": ""
        }
        
        # Insert user into database
        result = users_collection.insert_one(user_doc)
        
        if result.inserted_id:
            # Generate JWT token
            token = generate_jwt(email)
            return jsonify({
                "msg": "Signup successful",
                "token": token,
                "user": {
                    "name": name,
                    "email": email,
                    "age": age,
                    "gender": gender
                }
            }), 201
        else:
            return jsonify({"msg": "Failed to create user"}), 500
            
    except Exception as e:
        return jsonify({"msg": "Server error occurred"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"msg": "No data provided"}), 400
        
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        
        if not email or not password:
            return jsonify({"msg": "Email and password are required"}), 400
        
        # Find user in database
        user = users_collection.find_one({"email": email})
        
        if not user:
            return jsonify({"msg": "Invalid email or password"}), 401
        
        # Verify password
        if not check_password_hash(user["password"], password):
            return jsonify({"msg": "Invalid email or password"}), 401
        
        # Generate JWT token
        token = generate_jwt(email)
        
        return jsonify({
            "msg": "Login successful",
            "token": token,
            "user": {
                "name": user["name"],
                "email": user["email"],
                "age": user["age"],
                "gender": user["gender"]
            }
        }), 200
        
    except Exception as e:
        return jsonify({"msg": "Server error occurred"}), 500

@auth_bp.route('/profile', methods=['GET'])
@auth_required
def get_profile(email):
    """Get user profile - protected route"""
    try:
        user = users_collection.find_one({"email": email})
        
        if not user:
            return jsonify({"msg": "User not found"}), 404
        
        return jsonify({
            "user": {
                "name": user["name"],
                "email": user["email"],
                "age": user["age"],
                "gender": user["gender"],
                "ailments": user.get("ailments", []),
                "medications": user.get("medications", "")
            }
        }), 200
        
    except Exception as e:
        return jsonify({"msg": "Server error occurred"}), 500

@auth_bp.route('/profile', methods=['PUT'])
@auth_required
def update_profile(email):
    """Update user profile - protected route"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"msg": "No data provided"}), 400
        
        # Fields that can be updated
        update_fields = {}
        
        if "name" in data:
            update_fields["name"] = data["name"].strip()
        if "age" in data:
            try:
                age = int(data["age"])
                if 1 <= age <= 120:
                    update_fields["age"] = age
                else:
                    return jsonify({"msg": "Age must be between 1 and 120"}), 400
            except (ValueError, TypeError):
                return jsonify({"msg": "Age must be a valid number"}), 400
        if "gender" in data:
            update_fields["gender"] = data["gender"].strip()
        if "ailments" in data:
            update_fields["ailments"] = data["ailments"]
        if "medications" in data:
            update_fields["medications"] = data["medications"]
        
        if not update_fields:
            return jsonify({"msg": "No valid fields to update"}), 400
        
        # Update user in database
        result = users_collection.update_one(
            {"email": email},
            {"$set": update_fields}
        )
        
        if result.modified_count > 0:
            return jsonify({"msg": "Profile updated successfully"}), 200
        else:
            return jsonify({"msg": "No changes made"}), 200
            
    except Exception as e:
        return jsonify({"msg": "Server error occurred"}), 500

@auth_bp.route('/verify-token', methods=['GET'])
@auth_required
def verify_token(email):
    """Verify if token is valid - protected route"""
    return jsonify({"msg": "Token is valid", "email": email}), 200