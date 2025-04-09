import joblib

try:
    model = joblib.load("rag_deadlock_model.joblib")
    print("Model loaded successfully:", model)
except Exception as e:
    print("Error loading model:", e)