import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import os
from pathlib import Path

# Create data directory if it doesn't exist
Path("data").mkdir(exist_ok=True)
Path("data/models").mkdir(exist_ok=True)

# Generate synthetic training data
def generate_training_data(n_samples=1000):
    np.random.seed(42)
    
    # Features: process_count, resource_count, request_edge_count, allocation_edge_count, resource_utilization, cycle_count
    X = np.zeros((n_samples, 6))
    y = np.zeros(n_samples)
    
    for i in range(n_samples):
        # Generate random features
        process_count = np.random.randint(1, 10)
        resource_count = np.random.randint(1, 10)
        request_edge_count = np.random.randint(0, process_count * resource_count)
        allocation_edge_count = np.random.randint(0, process_count * resource_count)
        resource_utilization = allocation_edge_count / (resource_count * np.random.randint(1, 5))
        cycle_count = np.random.randint(0, 5)
        
        X[i] = [process_count, resource_count, request_edge_count, allocation_edge_count, resource_utilization, cycle_count]
        
        # Generate label (deadlock or not)
        # Higher probability of deadlock if cycles exist and resource utilization is high
        if cycle_count > 0 and resource_utilization > 0.7:
            y[i] = 1
        elif cycle_count > 0 and np.random.random() < 0.7:
            y[i] = 1
        elif resource_utilization > 0.9 and np.random.random() < 0.5:
            y[i] = 1
        else:
            y[i] = 0
    
    return X, y

# Generate training data
X, y = generate_training_data()

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate model
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print(f"Model performance:")
print(f"Accuracy: {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall: {recall:.4f}")
print(f"F1 Score: {f1:.4f}")

# Feature importance
feature_names = ["Process Count", "Resource Count", "Request Edge Count", 
                "Allocation Edge Count", "Resource Utilization", "Cycle Count"]

print("\nFeature importance:")
for name, importance in zip(feature_names, model.feature_importances_):
    print(f"{name}: {importance:.4f}")

# Save model
model_path = "data/models/deadlock_prediction_model.pkl"
joblib.dump(model, model_path)
print(f"\nModel saved to {model_path}")

