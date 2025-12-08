# ReMedi — Personal Healthcare Assistant

ReMedi is a personal healthcare portal powered by Machine Learning and an interactive chatbot that predicts possible illnesses based on user symptoms.  
The project combines intelligent symptom extraction with a secure backend to provide a smooth, real-time healthcare experience.

---

## Features

### Machine Learning (Symptom Prediction)
- Built an ML-driven chatbot that interacts with users to collect symptoms conversationally.  
- Uses a Mutual Importance (MI) Matrix to dynamically suggest the next most relevant symptom.  
- Trained a Random Forest Classifier on a processed dataset for disease prediction.  
- Utilizes Sentence Transformers (all-mpnet-base-v2) for semantic symptom matching.

### Backend (Flask + MongoDB)
- Flask backend with JWT authentication and role-based route protection.  
- MongoDB used for storing user details, ailments, and medication data.  
- RESTful APIs for signup, login, and profile management.  
- Chatbot routes for:
  - Extracting initial symptoms  
  - Suggesting next symptom  
  - Making final disease prediction  

---

## Backend Workflow Pipeline

App Initialization → Blueprint Registration → Authentication Setup → Database Connection → Auth Routes (Signup/Login/Profile) → Chatbot Routes (Initial → Next → Prediction) → Error Handling & App Run

---

## Machine Learning Workflow Pipeline

Data Collection → Cleaning → Unique Symptom Extraction → Binary Transformation → Label Encoding → Random Forest Training → MI Matrix Generation

---

## Tech Stack

### Backend
- Flask  
- PyMongo  
- JWT  
- Werkzeug  
- dotenv  

### Machine Learning
- Scikit-learn  
- Pandas, NumPy  
- Sentence Transformers (all-mpnet-base-v2)  
- NLTK  
- Joblib  

---

## How It Works

1. User signs up or logs in securely using JWT-authenticated routes.  
2. The chatbot asks the user to describe symptoms in natural language.  
3. The system extracts possible symptoms using a hybrid semantic + keyword approach.  
4. Based on confirmed symptoms, the MI Matrix dynamically suggests the next symptom.  
5. Once symptoms are finalized, the Random Forest model predicts the most likely disease.

---

## Authentication Flow

1. When a user signs up or logs in, a JWT token is generated.  
2. All protected routes require this token, verified using a custom decorator.  
3. The token embeds the user's email and expires after a specific duration for security.

---

## Model Highlights

- Random Forest chosen for interpretability and robustness to noisy data.  
- Mutual Information (MI) Matrix captures relationships between symptoms and enables intelligent question flow in the chatbot.

---

## How to Run

1. Clone this repository:
   ```bash
   git clone https://github.com/<your-username>/ReMedi.git
   cd ReMedi
## Setup Instructions

1. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate   # for Linux/Mac
venv\Scripts\activate      # for Windows
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Add your `.env` file:

```env
DB_URI = your_mongodb_uri
JWT_SECRET = your_secret_key
```

4. Run the Flask server:

```bash
python app.py
```

5. Test endpoints using Postman or the frontend (React app).

## Future Enhancements

* Add multilingual chatbot responses.
* Integrate real-time medicine reminder notifications.
* Expand dataset to include rare diseases.
* Deploy the system using Docker and cloud services (AWS/GCP).

## Author

**Veneela**  
Undergraduate | Software and Data Science Enthusiast  
Passionate about Machine Learning, Healthcare AI, and Intelligent Systems.

