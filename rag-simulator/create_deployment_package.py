import os
import shutil
import zipfile
from pathlib import Path
import datetime

def create_deployment_package():
    """Create a deployment package for the Resource Allocation Graph Simulator"""
    print("Creating deployment package...")
    
    # Create timestamp for the package name
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    package_name = f"rag_simulator_deployment_{timestamp}"
    
    # Create a temporary directory for the package
    package_dir = Path(package_name)
    package_dir.mkdir(exist_ok=True)
    
    # Copy backend files
    backend_dir = package_dir / "backend"
    backend_dir.mkdir(exist_ok=True)
    
    for item in os.listdir("backend"):
        if item not in ["venv", "__pycache__", ".pytest_cache"]:
            src = os.path.join("backend", item)
            dst = os.path.join(backend_dir, item)
            if os.path.isdir(src):
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)
    
    # Copy frontend files
    frontend_dir = package_dir / "frontend"
    frontend_dir.mkdir(exist_ok=True)
    
    for item in os.listdir("frontend"):
        if item not in ["node_modules", ".next", "out"]:
            src = os.path.join("frontend", item)
            dst = os.path.join(frontend_dir, item)
            if os.path.isdir(src):
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)
    
    # Copy root files
    for item in ["README.md", "run.sh", "run.bat", "setup.py", "docker-compose.yml"]:
        if os.path.exists(item):
            shutil.copy2(item, package_dir)
    
    # Create data directory structure
    data_dir = package_dir / "data"
    data_dir.mkdir(exist_ok=True)
    
    for subdir in ["models", "examples", "temp", "feedback"]:
        (data_dir / subdir).mkdir(exist_ok=True)
    
    # Create zip file
    zip_filename = f"{package_name}.zip"
    with zipfile.ZipFile(zip_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(package_dir):
            for file in files:
                file_path = os.path.join(root, file)
                zipf.write(file_path, os.path.relpath(file_path, package_dir.parent))
    
    # Clean up temporary directory
    shutil.rmtree(package_dir)
    
    print(f"Deployment package created: {zip_filename}")

if __name__ == "__main__":
    create_deployment_package()

