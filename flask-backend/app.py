from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

from routes import auth, chatbot_routes
app.register_blueprint(auth.auth_bp, url_prefix='/api')
app.register_blueprint(chatbot_routes.chatbot_bp, url_prefix='/chatbot')
@app.route('/')
def health_check():
    return {"status": "Server is running", "message": "Welcome to the API"}, 200

@app.errorhandler(404)
def not_found(error):
    return {"error": "Endpoint not found"}, 404

@app.errorhandler(500)
def internal_error(error):
    return {"error": "Internal server error"}, 500

if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=5000)