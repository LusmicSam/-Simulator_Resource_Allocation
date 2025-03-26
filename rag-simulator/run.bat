@echo off
echo Starting the Resource Allocation Graph Simulator...

REM Start the backend
echo Starting the backend server...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
start python main.py

REM Wait for the backend to start
echo Waiting for the backend to start...
timeout /t 5

REM Start the frontend
echo Starting the frontend...
cd ..\frontend
call npm install
start npm run dev

echo Servers are running. Close this window to stop.
pause

