import jwt
import datetime
import os
from dotenv import load_dotenv
load_dotenv()

SECRET_KEY = os.environ.get("JWT_SECRET")

def generate_jwt(email):
    payload = {
        "email": email,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=3)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token

def decode_jwt(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
