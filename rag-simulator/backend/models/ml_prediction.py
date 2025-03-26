from typing import Dict, List, Any
import numpy as np
import networkx as nx
import joblib
from pathlib import Path
import os
from .graph import Graph

# Default model path
MODEL_PATH = Path("data/models/deadlock_prediction_model.pkl")

def extract_features(graph: Graph) -> Dict[str, Any]:
    """
    Extract features from a resource allocation graph for machine learning
    
    Args:
        graph: The resource allocation graph
        
    Returns:
        Dictionary of features
    """
    G = graph.to_networkx()
    
    # Basic counts
    process_nodes = [n for n, attr in G.nodes(data=True) if attr.get('type') == 'process']
    resource_nodes = [n for n, attr in G.nodes(data=True) if attr.get('type') == 'resource']
    
    process_count = len(process_nodes)
    resource_count = len(resource_nodes)
    
    # Edge counts
    request_edges = [(u, v) for u, v, attr in G.edges(data=True) if attr.get('type') == 'request']
    allocation_edges = [(u, v) for u, v, attr in G.edges(data=True) if attr.get('type') == 'allocation']
    
    request_edge_count = len(request_edges)
    allocation_edge_count = len(allocation_edges)
    
    # Resource utilization
    total_instances = sum(G.nodes[r].get('instances', 1) for r in resource_nodes)
    resource_utilization = allocation_edge_count / total_instances if total_instances > 0 else 0
    
    # Cycle detection
    try:
        cycles = list(nx.simple_cycles(G))
        cycle_count = len(cycles)
    except:
        cycle_count = 0
    
    # Feature vector
    features = {
        "processCount": process_count,
        "resourceCount": resource_count,
        "requestEdgeCount": request_edge_count,
        "allocationEdgeCount": allocation_edge_count,
        "resourceUtilization": resource_utilization,
        "cycleCount": cycle_count
    }
    
    return features

def predict_deadlock(graph: Graph) -> Dict[str, Any]:
    """
    Predict the likelihood of deadlock in a resource allocation graph
    
    Args:
        graph: The resource allocation graph
        
    Returns:
        Dictionary with prediction results
    """
    # Extract features
    features = extract_features(graph)
    
    # Check if model exists
    if not MODEL_PATH.exists():
        # If no model exists, use a simple heuristic
        deadlock_probability = simple_heuristic_prediction(features)
    else:
        # Load the model
        model = joblib.load(MODEL_PATH)
        
        # Create feature vector
        X = np.array([
            features["processCount"],
            features["resourceCount"],
            features["requestEdgeCount"],
            features["allocationEdgeCount"],
            features["resourceUtilization"],
            features["cycleCount"]
        ]).reshape(1, -1)
        
        # Make prediction
        deadlock_probability = float(model.predict_proba(X)[0, 1])
    
    # Generate explanation
    explanation = generate_prediction_explanation(features, deadlock_probability)
    
    return {
        "deadlockProbability": deadlock_probability,
        "features": features,
        "explanation": explanation
    }

def simple_heuristic_prediction(features: Dict[str, Any]) -> float:
    """
    Simple heuristic for deadlock prediction when no ML model is available
    
    Args:
        features: Graph features
        
    Returns:
        Probability of deadlock
    """
    # Base probability
    probability = 0.0
    
    # If cycles exist, high probability of deadlock
    if features["cycleCount"] > 0:
        probability += 0.7
    
    # High resource utilization increases deadlock probability
    if features["resourceUtilization"] > 0.8:
        probability += 0.2
    
    # More processes and resources increase complexity and deadlock probability
    complexity_factor = min(0.1, (features["processCount"] + features["resourceCount"]) / 100)
    probability += complexity_factor
    
    # Cap probability at 1.0
    return min(1.0, probability)

def generate_prediction_explanation(features: Dict[str, Any], probability: float) -> str:
    """
    Generate an explanation for the deadlock prediction
    
    Args:
        features: Graph features
        probability: Predicted probability of deadlock
        
    Returns:
        Explanation string
    """
    if probability > 0.7:
        explanation = "High risk of deadlock detected. "
    elif probability > 0.3:
        explanation = "Moderate risk of deadlock detected. "
    else:
        explanation = "Low risk of deadlock detected. "
    
    # Add feature-specific explanations
    if features["cycleCount"] > 0:
        explanation += f"The graph contains {features['cycleCount']} cycles, which is a necessary condition for deadlock. "
    
    if features["resourceUtilization"] > 0.8:
        explanation += "Resource utilization is very high, increasing the risk of deadlock. "
    elif features["resourceUtilization"] > 0.5:
        explanation += "Resource utilization is moderate. "
    
    if features["requestEdgeCount"] > features["allocationEdgeCount"]:
        explanation += "There are more resource requests than allocations, which may indicate resource contention. "
    
    return explanation

def train_model(training_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Train a machine learning model for deadlock prediction
    
    Args:
        training_data: Training data with features and labels
        
    Returns:
        Dictionary with training results
    """
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
    
    # Extract features and labels
    X = np.array(training_data["features"])
    y = np.array(training_data["labels"])
    
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
    
    # Save model
    joblib.dump(model, MODEL_PATH)
    
    # Feature importance
    feature_names = training_data.get("feature_names", [
        "processCount", "resourceCount", "requestEdgeCount", 
        "allocationEdgeCount", "resourceUtilization", "cycleCount"
    ])
    
    feature_importance = {
        name: float(importance) 
        for name, importance in zip(feature_names, model.feature_importances_)
    }
    
    return {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "feature_importance": feature_importance,
        "model_path": str(MODEL_PATH)
    }

