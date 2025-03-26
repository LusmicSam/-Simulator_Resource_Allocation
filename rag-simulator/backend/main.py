from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Union
import networkx as nx
import numpy as np
import json
import os
import logging
from datetime import datetime
import joblib
from pathlib import Path

# Import modules
from models.graph import Graph, Node, Edge
from models.deadlock import detect_deadlock, check_resource_request
from models.bankers import run_bankers_algorithm, check_safety
from models.ml_prediction import predict_deadlock, train_model
from models.language_parser import parse_language_to_graph, validate_syntax

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create data directory if it doesn't exist
Path("data").mkdir(exist_ok=True)
Path("data/temp").mkdir(exist_ok=True)
Path("data/models").mkdir(exist_ok=True)
Path("data/feedback").mkdir(exist_ok=True)

app = FastAPI(title="Resource Allocation Graph Simulator API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API version
API_VERSION = "1.0.0"

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": API_VERSION}

# Deadlock detection endpoint
@app.post("/api/detect-deadlock")
async def api_detect_deadlock(graph_data: Dict[str, Any]):
    try:
        graph = Graph(**graph_data)
        result = detect_deadlock(graph)
        return result
    except Exception as e:
        logger.error(f"Error in deadlock detection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Banker's algorithm endpoint
@app.post("/api/bankers-algorithm")
async def api_bankers_algorithm(state_data: Dict[str, Any]):
    try:
        result = run_bankers_algorithm(state_data)
        return result
    except Exception as e:
        logger.error(f"Error in Banker's algorithm: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Check resource request endpoint
@app.post("/api/check-resource-request")
async def api_check_resource_request(request_data: Dict[str, Any]):
    try:
        state = request_data.get("state")
        process = request_data.get("process")
        request = request_data.get("request")
        
        result = check_resource_request(state, process, request)
        return result
    except Exception as e:
        logger.error(f"Error checking resource request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Language to graph conversion endpoint
@app.post("/api/language-to-graph")
async def api_language_to_graph(text_data: Dict[str, str]):
    try:
        text = text_data.get("text", "")
        graph = parse_language_to_graph(text)
        return {"graph": graph}
    except Exception as e:
        logger.error(f"Error in language to graph conversion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Syntax validation endpoint
@app.post("/api/validate-syntax")
async def api_validate_syntax(text_data: Dict[str, str]):
    try:
        text = text_data.get("text", "")
        errors = validate_syntax(text)
        return {"errors": errors}
    except Exception as e:
        logger.error(f"Error in syntax validation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ML prediction endpoint
@app.post("/api/predict-deadlock")
async def api_predict_deadlock(graph_data: Dict[str, Any]):
    try:
        graph = Graph(**graph_data)
        prediction = predict_deadlock(graph)
        return prediction
    except Exception as e:
        logger.error(f"Error in deadlock prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Train ML model endpoint
@app.post("/api/train-model")
async def api_train_model(training_data: Dict[str, Any]):
    try:
        model_info = train_model(training_data)
        return model_info
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Save temporary graph endpoint
@app.post("/api/save-temp-graph")
async def api_save_temp_graph(graph_data: Dict[str, Any]):
    try:
        # Save the graph to a temporary file
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"data/temp/graph_{timestamp}.json"
        
        with open(filename, "w") as f:
            json.dump(graph_data, f)
        
        return {"status": "success", "filename": filename}
    except Exception as e:
        logger.error(f"Error saving temporary graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Get example graphs endpoint
@app.get("/api/example-graphs")
async def api_get_example_graphs():
    try:
        examples_dir = Path("data/examples")
        if not examples_dir.exists():
            return {"examples": []}
        
        examples = []
        for file in examples_dir.glob("*.json"):
            with open(file, "r") as f:
                graph_data = json.load(f)
                examples.append({
                    "id": file.stem,
                    "title": graph_data.get("title", file.stem),
                    "description": graph_data.get("description", ""),
                    "graphData": graph_data.get("graph", {})
                })
        
        return {"examples": examples}
    except Exception as e:
        logger.error(f"Error getting example graphs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Submit feedback endpoint
@app.post("/api/submit-feedback")
async def api_submit_feedback(feedback_data: Dict[str, str]):
    try:
        name = feedback_data.get("name", "Anonymous")
        email = feedback_data.get("email", "")
        message = feedback_data.get("message", "")
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"data/feedback/feedback_{timestamp}.json"
        
        with open(filename, "w") as f:
            json.dump({
                "name": name,
                "email": email,
                "message": message,
                "timestamp": timestamp
            }, f)
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)

