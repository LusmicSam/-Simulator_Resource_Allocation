import os
import subprocess
import sys
from pathlib import Path

def setup_backend():
    """Set up the backend environment and dependencies"""
    print("Setting up backend environment...")
    
    # Create data directories
    Path("data").mkdir(exist_ok=True)
    Path("data/models").mkdir(exist_ok=True)
    Path("data/examples").mkdir(exist_ok=True)
    Path("data/temp").mkdir(exist_ok=True)
    Path("data/feedback").mkdir(exist_ok=True)
    
    # Install dependencies
    print("Installing Python dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    
    # Create example graphs
    print("Creating example graphs...")
    subprocess.check_call([sys.executable, "create_examples.py"])
    
    # Train initial ML model
    print("Training initial ML model...")
    subprocess.check_call([sys.executable, "train_model.py"])
    
    print("Backend setup complete!")

if __name__ == "__main__":
    setup_backend()

