import os
import subprocess
import sys
import platform

def main():
    """Initialize the Resource Allocation Graph Simulator"""
    print("Initializing Resource Allocation Graph Simulator...")
    
    # Set up backend
    print("\n=== Setting up backend ===")
    os.chdir("backend")
    
    # Create virtual environment
    print("Creating Python virtual environment...")
    subprocess.check_call([sys.executable, "-m", "venv", "venv"])
    
    # Activate virtual environment
    if platform.system() == "Windows":
        activate_script = os.path.join("venv", "Scripts", "activate")
        activate_cmd = f"call {activate_script}"
    else:
        activate_script = os.path.join("venv", "bin", "activate")
        activate_cmd = f"source {activate_script}"
    
    # Install dependencies and run setup
    setup_cmd = f"{activate_cmd} && python -m pip install -r requirements.txt && python setup.py"
    
    if platform.system() == "Windows":
        subprocess.check_call(setup_cmd, shell=True)
    else:
        subprocess.check_call(setup_cmd, shell=True, executable="/bin/bash")
    
    os.chdir("..")
    
    # Set up frontend
    print("\n=== Setting up frontend ===")
    os.chdir("frontend")
    
    # Install npm dependencies
    print("Installing npm dependencies...")
    subprocess.check_call(["npm", "install"])
    
    os.chdir("..")
    
    print("\n=== Setup complete! ===")
    print("\nTo start the application:")
    if platform.system() == "Windows":
        print("1. Run 'run.bat'")
    else:
        print("1. Run 'bash run.sh'")
    print("2. Open http://localhost:3000 in your browser")

if __name__ == "__main__":
    main()

