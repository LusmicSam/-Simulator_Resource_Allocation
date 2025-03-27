

---

```markdown
# Resource Allocation Graph Simulator 🔄

A modern simulator for visualizing and analyzing resource allocation graphs and deadlock detection in operating systems. This project comes in two flavors:

- 💿 **Standalone Executable**: A desktop application built with Python and tkinter, perfect for offline use with ML-powered deadlock prediction and direct file system access.
- 🌐 **Web-based Application**: A browser-based tool with real-time features, natural language support, and a responsive design.

Both versions allow you to create, visualize, and analyze resource allocation graphs, detect deadlocks, and explore system safety—great for learning and experimenting with operating system concepts! 🚀

---

## Features ✨

### Common Features
- 📊 **Interactive Resource Allocation Graph Visualization**: See processes and resources in action.
- 🔍 **Deadlock Detection**: Identify deadlocks using the Banker's algorithm.
- 🤖 **AI-Powered Deadlock Prediction**: Estimate deadlock likelihood with machine learning.
- 📂 **Export/Import Graph States**: Save and load your work easily.
- 🔧 **Deadlock Resolution**: Resolve deadlocks via resource preemption or process termination.

### Standalone Executable Specific 💿
- 🖥️ **Offline Functionality**: Works without an internet connection.
- 📝 **Undo/Redo Support**: Experiment freely with Ctrl+Z and Ctrl+Y.
- 📂 **Direct File System Access**: Save and load graphs locally.
- 🎨 **Draggable Nodes**: Customize the graph layout interactively.

### Web Version Specific 🌐
- 💡 **Natural Language Support**: Create graphs using plain English (e.g., "Process P0 requests Resource R1").
- ⚡ **Real-time Syntax Validation**: Get instant feedback as you type.
- 🎨 **Dark/Light Theme Support**: Switch between themes for comfort.
- 📱 **Responsive Design**: Use it on any device—desktop, tablet, or phone.

---

## Tech Stack 🛠️

### Standalone Executable 💿
- **Core**: Python, tkinter (GUI), scikit-learn (ML), joblib (model loading), NumPy (numerical operations)
- **Packaging**: PyInstaller (for creating the executable)

### Web Version 🌐
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Monaco Editor (code editing), Recharts (visualizations)
- **Backend**: FastAPI, Python, scikit-learn, NetworkX (graph operations), NumPy

---

## Getting Started 🚀

### Prerequisites ✅
- **For the Standalone Executable**:
  - No prerequisites for running the pre-built executable!
  - To build from source: Python 3.8+, PyInstaller
- **For the Web Version**:
  - Python 3.8 or higher (backend)
  - Node.js 14 or higher (frontend)
  - npm 6 or higher

### Installation and Running 📥

#### For the Standalone Executable 💿
1. **Option 1: Download Pre-built Executable**
   - Grab the latest `rag-simulator.exe` from the [releases page](https://github.com/yourusername/rag-simulator/releases).
   - Double-click to run—no installation needed!

2. **Option 2: Build from Source**
   - Clone the repository:
     ```bash
     git clone https://github.com/yourusername/rag-simulator.git
     cd rag-simulator
     ```
   - Install dependencies:
     ```bash
     pip install -r requirements.txt
     ```
   - Build the executable with PyInstaller:
     ```bash
     pyinstaller --onefile --windowed simulator.py
     ```
   - Find the executable in the `dist/` folder and run it.

#### For the Web Version 🌐
1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/rag-simulator.git
   cd rag-simulator
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Start the Backend Server**
   ```bash
   uvicorn main:app --reload
   ```

5. **Start the Frontend Development Server**
   ```bash
   npm run dev
   ```
   - Open your browser to `http://localhost:3000`.

---

## Usage 📖

1. **Launch the Application**:
   - Executable: Run the `.exe` file or Python script.
   - Web: Visit `http://localhost:3000` after starting the servers.

2. **Create a Graph**:
   - **Executable**: Use the GUI to add processes/resources and create request/allocation edges.
   - **Web**: Use the visual editor, RAG language, or natural language input.

3. **Analyze**:
   - Detect deadlocks, check safety, predict deadlock percentages, or resolve deadlocks.

4. **Save Your Work**:
   - Export graphs as JSON (both versions).
   - Import saved states to pick up where you left off.

### RAG Language Example 📝
This syntax works in both versions (web version also supports natural language):
```plaintext
create_graph {
  processes = [P0, P1];
  resources = [R0(1), R1(1)];
  
  allocations {
    R0 > P0;
    R1 > P1;
  }
  
  requests {
    P0 > R1;
    P1 > R0;
  }
}
```

---

## Contributing 🤝

We’d love your help! Feel free to:
- Open an issue to report bugs or suggest features.
- Submit a **Pull Request** with your improvements. 🌟

---

## License 📄

This project is licensed under the **MIT License**—see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments 🙏

- A big **thank you** to all contributors!
- Web version built with [shadcn/ui](https://ui.shadcn.com/).
- Inspired by operating systems education and deadlock theory.

---

## Contact 📧

**Your Name** - [Shivam Panjolia](https://github.com/LusmicSam/)  
**Project Link**:[https://github.com/LusmicSam/-Simulator_Resource_Allocation])

---



