#import statements
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from collections import defaultdict
import sys
import math
import json
import joblib
import numpy as np
import os
#exe builder stuff
def resource_path(relative_path):
    """Get the absolute path to a resource, works for dev and PyInstaller."""
    if hasattr(sys, '_MEIPASS'):
        # Running as bundled exe, use temporary directory
        return os.path.join(sys._MEIPASS, relative_path)
    # In development, use the absolute path to the file
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)
#graph
class ResourceAllocationGraph:
    def __init__(self):
        self.processes = set()
        self.resources = {}
        self.allocations = defaultdict(int)
        self.requests = defaultdict(int)
        self.next_process_id = 1
        self.next_resource_id = 1

    def get_auto_process_name(self):
        while f"P{self.next_process_id}" in self.processes:
            self.next_process_id += 1
        return f"P{self.next_process_id}"

    def get_auto_resource_name(self):
        while f"R{self.next_resource_id}" in self.resources:
            self.next_resource_id += 1
        return f"R{self.next_resource_id}"

    def add_process(self, process_id=None):
        if not process_id:
            process_id = self.get_auto_process_name()
        if process_id in self.processes:
            raise ValueError(f"Process {process_id} already exists")
        self.processes.add(process_id)
        return process_id

    def add_resource(self, resource_id=None, instances=1):
        if not resource_id:
            resource_id = self.get_auto_resource_name()
        if resource_id in self.resources:
            raise ValueError(f"Resource {resource_id} already exists")
        self.resources[resource_id] = {'total': instances, 'available': instances}
        return resource_id

    def add_request(self, process, resource, count=1):
        if process not in self.processes:
            raise ValueError(f"Process {process} does not exist")
        if resource not in self.resources:
            raise ValueError(f"Resource {resource} does not exist")
        self.requests[(process, resource)] += count

    def add_allocation(self, process, resource, count=1):
        if process not in self.processes:
            raise ValueError(f"Process {process} does not exist")
        if resource not in self.resources:
            raise ValueError(f"Resource {resource} does not exist")
        available = self.resources[resource]['available']
        if count > available:
            raise ValueError(f"Not enough instances available ({available}) in {resource}")
        self.allocations[(process, resource)] += count
        self.resources[resource]['available'] -= count

    def remove_allocation(self, process, resource, count=1):
        if (process, resource) in self.allocations:
            self.allocations[(process, resource)] -= count
            self.resources[resource]['available'] += count
            if self.allocations[(process, resource)] <= 0:
                del self.allocations[(process, resource)]

    def detect_deadlock(self):
        work = {r: info['available'] for r, info in self.resources.items()}
        allocation = defaultdict(lambda: defaultdict(int))
        request = defaultdict(lambda: defaultdict(int))
        for (p, r), cnt in self.allocations.items():
            allocation[p][r] = cnt
        for (p, r), cnt in self.requests.items():
            request[p][r] = cnt
        finish = {p: False for p in self.processes}
        while True:
            found = False
            for p in self.processes:
                if not finish[p] and all(request[p][r] <= work[r] for r in self.resources):
                    for r in self.resources:
                        work[r] += allocation[p][r]
                    finish[p] = True
                    found = True
            if not found:
                break
        deadlocked = [p for p, done in finish.items() if not done]
        return len(deadlocked) > 0, deadlocked

    def is_safe(self):
        deadlock, deadlocked_processes = self.detect_deadlock()
        if not deadlock:
            return True, 0.0
        else:
            total_processes = len(self.processes)
            if total_processes == 0:
                return True, 0.0
            deadlock_percentage = (len(deadlocked_processes) / total_processes) * 100
            return False, deadlock_percentage

    def export_state(self):
        state = {
            "processes": list(self.processes),
            "resources": self.resources,
            "allocations": {f"{k[0]}->{k[1]}": v for k, v in self.allocations.items()},
            "requests": {f"{k[0]}->{k[1]}": v for k, v in self.requests.items()}
        }
        return json.dumps(state, indent=4)

    def import_state(self, state_json):
        state = json.loads(state_json)
        self.processes = set(state["processes"])
        self.resources = state["resources"]
        self.allocations = defaultdict(int, {(k.split("->")[0], k.split("->")[1]): v for k, v in state["allocations"].items()})
        self.requests = defaultdict(int, {(k.split("->")[0], k.split("->")[1]): v for k, v in state["requests"].items()})
#simulator
class RAGSimulator(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Resource Allocation Graph Simulator with ML")
        self.geometry("1200x800")
        self.rag = ResourceAllocationGraph()
        self.ml_model = None  # Initialize as None
        self.selected_nodes = []
        self.edge_creation_mode = None
        self.node_positions = {}
        self.dragging = None
        self.offset_x = 0
        self.offset_y = 0
        self.undo_stack = []
        self.redo_stack = []
        self.process_x = 150
        self.resource_x = 400
        self.node_spacing = 150
        self.process_radius = 35
        self.resource_width = 90
        self.resource_height = 90

        # Attempt to load the ML model
        try:
            self.ml_model = joblib.load(resource_path("rag_deadlock_model.joblib"))
        except Exception as e:
            messagebox.showwarning("ML Model Missing", "ML model could not be loaded. Deadlock prediction will be disabled.")
            self.status_message = "ML model not loaded"

        self.style = ttk.Style()
        self.style.configure("TButton", padding=6, font=('Arial', 11))
        self.style.configure("TLabel", font=('Arial', 12))
        self.style.configure("Title.TLabel", font=('Arial', 14, 'bold'))
        self.style.configure("Status.TLabel", font=('Arial', 10), background='#f0f0f0')

        self.create_widgets()
        self.create_menu()
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        
        self.bind("<Control-z>", lambda event: self.undo())
        self.bind("<Control-y>", lambda event: self.redo())
        self.bind("<Control-n>", lambda event: self.add_process())
        self.bind("<Control-m>", lambda event: self.add_resource())

    def create_menu(self):
        menu_bar = tk.Menu(self)
        
        file_menu = tk.Menu(menu_bar, tearoff=0)
        file_menu.add_command(label="New", command=self.reset_graph, accelerator="Ctrl+N")
        file_menu.add_command(label="Export State", command=self.export_state)
        file_menu.add_command(label="Import State", command=self.import_state)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.on_close)
        menu_bar.add_cascade(label="File", menu=file_menu)
        
        edit_menu = tk.Menu(menu_bar, tearoff=0)
        edit_menu.add_command(label="Undo", command=self.undo, accelerator="Ctrl+Z")
        edit_menu.add_command(label="Redo", command=self.redo, accelerator="Ctrl+Y")
        menu_bar.add_cascade(label="Edit", menu=edit_menu)
        
        help_menu = tk.Menu(menu_bar, tearoff=0)
        help_menu.add_command(label="Help", command=self.show_help)
        menu_bar.add_cascade(label="Help", menu=help_menu)
        
        self.config(menu=menu_bar)

    def create_widgets(self):
        main_frame = ttk.Frame(self)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Create a canvas and a scrollbar for the control panel
        control_canvas = tk.Canvas(main_frame, width=300)
        control_scrollbar = ttk.Scrollbar(main_frame, orient="vertical", command=control_canvas.yview)
        control_frame = ttk.Frame(control_canvas)  # Use a regular Frame instead of LabelFrame for scrolling

        # Configure the canvas and scrollbar
        control_canvas.configure(yscrollcommand=control_scrollbar.set)
        control_scrollbar.pack(side=tk.LEFT, fill=tk.Y)
        control_canvas.pack(side=tk.LEFT, fill=tk.Y, padx=10, pady=10)
        control_canvas.create_window((0, 0), window=control_frame, anchor="nw")

        # Ensure the canvas scrolls properly
        def on_frame_configure(event):
            control_canvas.configure(scrollregion=control_canvas.bbox("all"))

        control_frame.bind("<Configure>", on_frame_configure)

        # Enable scrolling with the mouse wheel
        def on_mouse_wheel(event):
            control_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        control_canvas.bind_all("<MouseWheel>", on_mouse_wheel)

        # Add widgets to the control frame
        proc_frame = ttk.LabelFrame(control_frame, text="Process Management", padding=5)
        proc_frame.pack(fill=tk.X, pady=5)
        ttk.Label(proc_frame, text="Process Name:").pack(pady=2)
        self.process_entry = ttk.Entry(proc_frame)
        self.process_entry.pack(fill=tk.X, pady=2)
        ttk.Button(proc_frame, text="Add Process (Ctrl+N)", command=self.add_process).pack(fill=tk.X, pady=2)

        res_frame = ttk.LabelFrame(control_frame, text="Resource Management", padding=5)
        res_frame.pack(fill=tk.X, pady=5)
        ttk.Label(res_frame, text="Resource Name:").pack(pady=2)
        self.resource_entry = ttk.Entry(res_frame)
        self.resource_entry.pack(fill=tk.X, pady=2)
        ttk.Label(res_frame, text="Instances:").pack(pady=2)
        self.instance_spin = ttk.Spinbox(res_frame, from_=1, to=10, width=5)
        self.instance_spin.set(1)
        self.instance_spin.pack(pady=2)
        ttk.Button(res_frame, text="Add Resource (Ctrl+M)", command=self.add_resource).pack(fill=tk.X, pady=2)

        edge_frame = ttk.LabelFrame(control_frame, text="Edge Operations", padding=5)
        edge_frame.pack(fill=tk.X, pady=5)
        ttk.Label(edge_frame, text="Edge Count:").pack(pady=2)
        self.count_spin = ttk.Spinbox(edge_frame, from_=1, to=5, width=5)
        self.count_spin.set(1)
        self.count_spin.pack(pady=2)
        ttk.Button(edge_frame, text="Create Request Edge", 
                  command=lambda: self.set_edge_mode("request")).pack(fill=tk.X, pady=2)
        ttk.Button(edge_frame, text="Create Allocation Edge", 
                  command=lambda: self.set_edge_mode("allocation")).pack(fill=tk.X, pady=2)
        ttk.Button(edge_frame, text="Clear Selection", 
                  command=self.clear_selection).pack(fill=tk.X, pady=2)

        sim_frame = ttk.LabelFrame(control_frame, text="Simulation Controls", padding=5)
        sim_frame.pack(fill=tk.X, pady=5)
        ttk.Button(sim_frame, text="Detect Deadlock", 
                  command=self.detect_deadlock).pack(fill=tk.X, pady=2)
        ttk.Button(sim_frame, text="Check Safety", 
                  command=self.check_safety).pack(fill=tk.X, pady=2)
        ttk.Button(sim_frame, text="Predict Deadlock % with ML", 
                  command=self.predict_deadlock_percentage).pack(fill=tk.X, pady=2)
        ttk.Button(sim_frame, text="Resolve Deadlock", 
                  command=self.resolve_deadlock).pack(fill=tk.X, pady=2)  # New button
        ttk.Button(sim_frame, text="Reset Graph", 
                  command=self.reset_graph).pack(fill=tk.X, pady=2)

        # Add a canvas for the graph display
        canvas_frame = ttk.Frame(main_frame, relief=tk.SUNKEN, borderwidth=2)
        canvas_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        self.canvas = tk.Canvas(canvas_frame, bg='white', highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        # Add a status bar
        self.status = ttk.Label(main_frame, text="Ready", style="Status.TLabel", 
                              relief=tk.SUNKEN, anchor='w', padding=5)
        self.status.pack(side=tk.BOTTOM, fill=tk.X)

        # Bind canvas events
        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)

    def create_tooltips(self):
        def create_tooltip(widget, text):
            tooltip = tk.Toplevel(self)
            tooltip.wm_overrideredirect(True)
            tooltip.wm_geometry("+0+0")
            label = ttk.Label(tooltip, text=text, background="#ffffe0", relief='solid', borderwidth=1)
            label.pack()
            tooltip.withdraw()
            
            def show(event):
                x = event.x_root + 20
                y = event.y_root + 10
                tooltip.wm_geometry(f"+{x}+{y}")
                tooltip.deiconify()
            
            def hide(event):
                tooltip.withdraw()
            
            widget.bind("<Enter>", show)
            widget.bind("<Leave>", hide)

        create_tooltip(self.process_entry, "Enter process name (optional)")
        create_tooltip(self.resource_entry, "Enter resource name (optional)")
        create_tooltip(self.instance_spin, "Number of resource instances (1-10)")
        create_tooltip(self.count_spin, "Number of edge instances (1-5)")
        create_tooltip(self.canvas, "Click and drag nodes to move\nSelect two nodes for edges")

    def show_help(self):
        help_window = tk.Toplevel(self)
        help_window.title("Help - RAG Simulator")
        help_window.geometry("500x500")
        help_window.configure(bg='#f5f5f5')
        
        text_frame = ttk.Frame(help_window, padding=10)
        text_frame.pack(fill=tk.BOTH, expand=True)
        
        help_text = tk.Text(text_frame, wrap=tk.WORD, height=25, bg='white', font=('Arial', 11))
        help_text.pack(fill=tk.BOTH, expand=True)
        
        content = (
            "Resource Allocation Graph Simulator with ML\n\n"
            "Controls:\n"
            "• Ctrl+Z: Undo\n"
            "• Ctrl+Y: Redo\n"
            "• Ctrl+N: New Process\n"
            "• Ctrl+M: New Resource\n\n"
            "Operations:\n"
            "1. Processes: Add with optional custom name\n"
            "2. Resources: Add with name and instance count\n"
            "3. Edges:\n"
            "   - Request: Process → Resource (red)\n"
            "   - Allocation: Resource → Process (black)\n"
            "4. Drag nodes to reposition\n"
            "5. Detect deadlock in current state\n"
            "6. Check safety with Banker's algorithm\n"
            "7. Predict deadlock % with ML\n"
            "8. Export/import graph state\n\n"
            "Tips:\n"
            "• Scroll the control panel if needed\n"
            "• Hover over controls for tooltips\n"
            "• Yellow outline shows selected nodes\n"
            "• Resource color indicates availability"
        )
        help_text.insert(tk.END, content)
        help_text.config(state=tk.DISABLED)
        
        ttk.Button(help_window, text="Close", command=help_window.destroy).pack(pady=5)

    def export_state(self):
        state_json = self.rag.export_state()
        file_path = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON files", "*.json")])
        if file_path:
            with open(file_path, 'w') as file:
                file.write(state_json)
            messagebox.showinfo("Success", "Graph state exported successfully!")
            self.status.config(text="State exported")

    def import_state(self):
        file_path = filedialog.askopenfilename(filetypes=[("JSON files", "*.json")])
        if file_path:
            try:
                with open(file_path, 'r') as file:
                    state_json = file.read()
                self.rag.import_state(state_json)
                self.update_display()
                messagebox.showinfo("Success", "Graph state imported successfully!")
            except Exception as e:
                messagebox.showerror("Error", f"Import failed: {str(e)}")

    def set_edge_mode(self, edge_type):
        self.edge_creation_mode = edge_type
        self.status.config(text=f"Select two nodes for {edge_type} edge")
        self.selected_nodes = []

    def update_display(self):
        self.canvas.delete("all")
        self.handle_boundaries()
        self.draw_edges()
        self.draw_nodes()
        self.highlight_selected()
        proc_count = len(self.rag.processes)
        res_count = len(self.rag.resources)
        edge_count = len(self.rag.allocations) + len(self.rag.requests)
        self.status.config(text=f"Processes: {proc_count} | Resources: {res_count} | Edges: {edge_count}")

    def handle_boundaries(self):
        canvas_width = max(1000, self.canvas.winfo_width())
        canvas_height = max(800, self.canvas.winfo_height())
        for node, (x, y) in self.node_positions.items():
            if node in self.rag.processes:
                radius = self.process_radius
                x = max(radius + 20, min(x, canvas_width - radius - 20))
                y = max(radius + 20, min(y, canvas_height - radius - 20))
            else:
                width = self.resource_width
                height = self.resource_height
                x = max(width/2 + 20, min(x, canvas_width - width/2 - 20))
                y = max(height/2 + 20, min(y, canvas_height - height/2 - 20))
            self.node_positions[node] = (x, y)

    def draw_edges(self):
        for (process, resource), count in self.rag.requests.items():
            if count > 0:
                self.draw_edge(process, resource, 'request', count)

        for (process, resource), count in self.rag.allocations.items():
            if count > 0:
                self.draw_edge(resource, process, 'allocation', count)

    def draw_edge(self, from_node, to_node, edge_type, count, offset=0):
        """
        Draws an edge between two nodes with an arrow.
        :param from_node: The starting node of the edge.
        :param to_node: The ending node of the edge.
        :param edge_type: Type of edge ('allocation' or 'request').
        :param count: The number of instances for the edge.
        :param offset: Offset to avoid overlapping edges.
        """
        x1, y1 = self.node_positions[from_node]
        x2, y2 = self.node_positions[to_node]

        # Adjust the line to avoid overlapping edges
        dx, dy = x2 - x1, y2 - y1
        length = max(1, (dx**2 + dy**2)**0.5)
        perpendicular = (-dy / length, dx / length)
        x1 += offset * perpendicular[0]
        y1 += offset * perpendicular[1]
        x2 += offset * perpendicular[0]
        y2 += offset * perpendicular[1]

        # Set the color based on the edge type
        color = 'black' if edge_type == 'allocation' else 'red'

        # Draw the line with an arrow
        self.canvas.create_line(x1, y1, x2, y2, arrow=tk.LAST, fill=color, width=2)

        # Add a label for the count
        label_x = (x1 + x2) / 2
        label_y = (y1 + y2) / 2
        self.canvas.create_text(label_x, label_y, text=str(count), fill=color, font=('Arial', 10, 'bold'))

    def draw_nodes(self):
        for node in self.rag.processes:
            if node in self.node_positions:
                self.draw_process_node(node)
        for node in self.rag.resources:
            if node in self.node_positions:
                self.draw_resource_node(node)

    def draw_process_node(self, node_id):
        x, y = self.node_positions[node_id]
        self.canvas.create_oval(x-self.process_radius, y-self.process_radius,
                              x+self.process_radius, y+self.process_radius,
                              fill='#BBDEFB', outline='#1976D2', width=2, tags=('node', node_id))
        self.canvas.create_text(x, y, text=node_id, font=('Arial', 12, 'bold'),
                              fill='#0D47A1', tags=('text', node_id))

    def draw_resource_node(self, node_id):
        x, y = self.node_positions[node_id]
        width = self.resource_width
        height = self.resource_height
        fill_color = '#C8E6C9' if self.rag.resources[node_id]['available'] > 0 else '#FFCDD2'
        outline_color = '#4CAF50' if self.rag.resources[node_id]['available'] > 0 else '#F44336'
        self.canvas.create_rectangle(x-width/2, y-height/2, x+width/2, y+height/2,
                                   fill=fill_color, outline=outline_color, width=2,
                                   tags=('node', node_id))
        total = self.rag.resources[node_id]['total']
        available = self.rag.resources[node_id]['available']
        dot_size = 8
        spacing = min(20, (width-20) / max(1, total-1))
        start_x = x - width/2 + 20
        for i in range(total):
            dot_x = start_x + i * spacing
            dot_y = y + height/2 - 20
            fill = '#FFFFFF' if i < available else '#B0BEC5'
            self.canvas.create_oval(dot_x - dot_size/2, dot_y - dot_size/2,
                                  dot_x + dot_size/2, dot_y + dot_size/2,
                                  fill=fill, outline='#455A64', tags=('dot', node_id))
        self.canvas.create_text(x, y-10, text=node_id, font=('Arial', 12, 'bold'),
                              fill='#1B5E20' if available > 0 else '#B71C1C',
                              tags=('text', node_id))

    def highlight_selected(self):
        for node in self.selected_nodes:
            if node in self.node_positions:
                if node in self.rag.processes:
                    x, y = self.node_positions[node]
                    self.canvas.create_oval(x-self.process_radius-5, y-self.process_radius-5,
                                          x+self.process_radius+5, y+self.process_radius+5,
                                          outline='#FFCA28', width=3, dash=(4, 2))
                else:
                    x, y = self.node_positions[node]
                    self.canvas.create_rectangle(x-self.resource_width/2-5, y-self.resource_height/2-5,
                                               x+self.resource_width/2+5, y+self.resource_height/2+5,
                                               outline='#FFCA28', width=3, dash=(4, 2))

    def on_click(self, event):
        x = self.canvas.canvasx(event.x)
        y = self.canvas.canvasy(event.y)
        items = self.canvas.find_overlapping(x-5, y-5, x+5, y+5)
        if items:
            item = items[0]
            tags = self.canvas.gettags(item)
            if 'node' in tags or 'text' in tags:
                self.handle_node_click(tags[1], event)
                return
        self.clear_selection()

    def handle_node_click(self, node_id, event):
        if self.edge_creation_mode:
            if node_id not in self.selected_nodes:
                self.selected_nodes.append(node_id)
            if len(self.selected_nodes) == 2:
                self.create_edge()
        else:
            self.start_drag(node_id, event)
        self.update_display()

    def start_drag(self, node_id, event):
        if node_id in self.node_positions:
            self.dragging = node_id
            x, y = self.node_positions[node_id]
            self.offset_x = x - self.canvas.canvasx(event.x)
            self.offset_y = y - self.canvas.canvasy(event.y)

    def on_drag(self, event):
        if self.dragging and self.dragging in self.node_positions:
            x = self.canvas.canvasx(event.x) + self.offset_x
            y = self.canvas.canvasy(event.y) + self.offset_y
            self.node_positions[self.dragging] = (x, y)
            self.update_display()

    def on_release(self, event):
        self.dragging = None
        self.update_display()

    def create_edge(self):
        try:
            if len(self.selected_nodes) != 2:
                return
            count = int(self.count_spin.get())
            if count <= 0:
                raise ValueError("Count must be at least 1")
            node1, node2 = self.selected_nodes
            valid = False
            if self.edge_creation_mode == 'request':
                if node1 in self.rag.processes and node2 in self.rag.resources:
                    self.rag.add_request(node1, node2, count)
                    self.push_undo_action('request', node1, node2, count)
                    valid = True
            elif self.edge_creation_mode == 'allocation':
                if node2 in self.rag.processes and node1 in self.rag.resources:
                    self.rag.add_allocation(node2, node1, count)
                    self.push_undo_action('allocation', node2, node1, count)
                    valid = True
            if not valid:
                raise ValueError("Invalid edge direction: Request (P->R), Allocation (R->P)")
            self.clear_selection()
            self.update_display()
        except ValueError as e:
            messagebox.showerror("Error", str(e))
            self.clear_selection()

    def push_undo_action(self, action_type, node1, node2, count=0, state=None):
        action = {'type': action_type, 'node1': node1, 'node2': node2, 'count': count}
        if action_type in ['add_process', 'add_resource']:
            action['position'] = self.node_positions.get(node1)
        if action_type == 'import' and state:
            action['prev_state'] = state
        self.undo_stack.append(action)
        self.redo_stack.clear()

    def undo(self):
        if not self.undo_stack:
            messagebox.showinfo("Undo", "No actions to undo.")
            return
        action = self.undo_stack.pop()
        action_type = action['type']
        if action_type == 'import':
            prev_state_json = action['prev_state']
            prev_state = json.loads(prev_state_json)
            self.rag.import_state(prev_state["rag_state"])
            self.node_positions = prev_state["node_positions"]
        elif action_type == 'request':
            self.rag.requests[(action['node1'], action['node2'])] -= action['count']
            if self.rag.requests[(action['node1'], action['node2'])] <= 0:
                del self.rag.requests[(action['node1'], action['node2'])]
        elif action_type == 'allocation':
            self.rag.remove_allocation(action['node2'], action['node1'], action['count'])
        elif action_type == 'add_process':
            self.rag.processes.remove(action['node1'])
            del self.node_positions[action['node1']]
        elif action_type == 'add_resource':
            del self.rag.resources[action['node1']]
            del self.node_positions[action['node1']]
        elif action_type == 'import':
            prev_state = action['prev_state']
            curr_positions = self.node_positions.copy()
            self.rag.import_state(prev_state)
            self.node_positions.clear()
            for p in self.rag.processes:
                self.node_positions[p] = curr_positions.get(p, self.get_next_node_position('process'))
            for r in self.rag.resources:
                self.node_positions[r] = curr_positions.get(r, self.get_next_node_position('resource'))
        self.redo_stack.append(action)
        self.clear_selection()
        self.update_display()

    def redo(self):
        if not self.redo_stack:
            messagebox.showinfo("Redo", "No actions to redo.")
            return
        action = self.redo_stack.pop()
        action_type = action['type']
        if action_type == 'request':
            self.rag.add_request(action['node1'], action['node2'], action['count'])
        elif action_type == 'allocation':
            self.rag.add_allocation(action['node2'], action['node1'], action['count'])
        elif action_type == 'add_process':
            process_id = self.rag.add_process(action['node1'])
            self.node_positions[process_id] = action.get('position', self.get_next_node_position('process'))
        elif action_type == 'add_resource':
            resource_id = self.rag.add_resource(action['node1'], action['count'] or 1)
            self.node_positions[resource_id] = action.get('position', self.get_next_node_position('resource'))
        elif action_type == 'import':
            curr_state = self.rag.export_state()
            curr_positions = self.node_positions.copy()
            self.rag.import_state(action['prev_state'])
            self.node_positions.clear()
            for p in self.rag.processes:
                self.node_positions[p] = curr_positions.get(p, self.get_next_node_position('process'))
            for r in self.rag.resources:
                self.node_positions[r] = curr_positions.get(r, self.get_next_node_position('resource'))
            action['prev_state'] = curr_state
        self.undo_stack.append(action)
        self.clear_selection()
        self.update_display()

    def add_process(self):
        custom_name = self.process_entry.get().strip() or None
        try:
            process_id = self.rag.add_process(custom_name)
            position = self.get_next_node_position('process')
            self.node_positions[process_id] = position
            self.push_undo_action('add_process', process_id, None)
            self.process_entry.delete(0, tk.END)
            self.update_display()
        except ValueError as e:
            messagebox.showerror("Error", str(e))

    def add_resource(self):
        custom_name = self.resource_entry.get().strip() or None
        try:
            instances = int(self.instance_spin.get())
            resource_id = self.rag.add_resource(custom_name, instances)
            position = self.get_next_node_position('resource')
            self.node_positions[resource_id] = position
            self.push_undo_action('add_resource', resource_id, None, instances)
            self.resource_entry.delete(0, tk.END)
            self.update_display()
        except ValueError as e:
            messagebox.showerror("Error", str(e))

    def clear_selection(self):
        self.selected_nodes = []
        self.edge_creation_mode = None
        self.dragging = None
        self.update_display()

    def detect_deadlock(self):
        try:
            deadlock, processes = self.rag.detect_deadlock()
            if deadlock:
                messagebox.showwarning("Deadlock Detected", 
                                     f"Deadlocked processes: {', '.join(processes)}")
                self.status.config(text="Deadlock detected!")
            else:
                messagebox.showinfo("No Deadlock", "System is deadlock-free")
                self.status.config(text="System is deadlock-free")
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def check_safety(self):
        try:
            is_safe, deadlock_percentage = self.rag.is_safe()
            if is_safe:
                messagebox.showinfo("Safety Check", "System is safe, deadlock percentage: 0%")
                self.status.config(text="System is safe")
            else:
                messagebox.showwarning("Safety Check", f"System is not safe, deadlock percentage: {deadlock_percentage:.2f}%")
                self.status.config(text="System is not safe")
        except Exception as e:
            messagebox.showerror("Error", str(e))
    
    def extract_features(self):
        rag = self.rag
        n_processes = len(rag.processes)
        n_resources = len(rag.resources)
        total_instances = sum(info['total'] for info in rag.resources.values())
        total_allocated = sum(rag.allocations.values())
        total_requested = sum(rag.requests.values())
        n_allocation_edges = sum(1 for cnt in rag.allocations.values() if cnt > 0)
        n_request_edges = sum(1 for cnt in rag.requests.values() if cnt > 0)

        # Per-process allocation and request statistics
        allocation_per_process = {p: sum(rag.allocations.get((p, r), 0) for r in rag.resources) for p in rag.processes}
        request_per_process = {p: sum(rag.requests.get((p, r), 0) for r in rag.resources) for p in rag.processes}
        avg_allocation = np.mean(list(allocation_per_process.values())) if n_processes > 0 else 0
        avg_request = np.mean(list(request_per_process.values())) if n_processes > 0 else 0
        max_allocation = max(allocation_per_process.values(), default=0)
        max_request = max(request_per_process.values(), default=0)

        # Resource utilization
        utilization = [sum(rag.allocations.get((p, r), 0) for p in rag.processes) / info['total']
            for r, info in rag.resources.items()]
        resource_utilization = np.mean(utilization) if utilization else 0

        # Waiting edges (P1 -> P2 if P1 requests R and P2 holds R)
        waiting_edges = set()
        for r in rag.resources:
            holders = [p for p in rag.processes if rag.allocations.get((p, r), 0) > 0]
            requesters = [p for p in rag.processes if rag.requests.get((p, r), 0) > 0]
            for p1 in requesters:
                for p2 in holders:
                    if p1 != p2:
                        waiting_edges.add((p1, p2))
        number_of_waiting_edges = len(waiting_edges)

        # Processes with waiting relationships
        outgoing_processes = set(p1 for (p1, p2) in waiting_edges)
        incoming_processes = set(p2 for (p1, p2) in waiting_edges)
        number_of_processes_with_outgoing_waiting_edges = len(outgoing_processes)
        number_of_processes_with_incoming_waiting_edges = len(incoming_processes)
        number_of_processes_with_both = len(outgoing_processes & incoming_processes)

        # Holding and waiting processes
        holding_processes = set(p for p in rag.processes if any(rag.allocations.get((p, r), 0) > 0 for r in rag.resources))
        number_of_holding_processes = len(holding_processes)
        number_of_waiting_processes = len(outgoing_processes)
        both_waiting_and_holding = outgoing_processes & holding_processes
        number_of_both_waiting_and_holding = len(both_waiting_and_holding)

        # Resource contention features
        fully_allocated_resources = sum(1 for r in rag.resources if rag.resources[r]['available'] == 0)
        contested_resources = 0
        total_contention = 0
        max_contention = 0
        for r in rag.resources:
            sum_requests = sum(rag.requests.get((p, r), 0) for p in rag.processes)
            available = rag.resources[r]['available']
            if sum_requests > available:
                contested_resources += 1
                contention = sum_requests - available
                total_contention += contention
                max_contention = max(max_contention, contention)
        average_contention = total_contention / contested_resources if contested_resources > 0 else 0
        maximum_contention = max_contention

        # Compile all 23 features into a list
        features = [
        n_processes, n_resources, total_instances, total_allocated, total_requested,
        avg_allocation, avg_request, max_allocation, max_request,
        n_allocation_edges, n_request_edges, resource_utilization,
        number_of_waiting_edges, number_of_processes_with_outgoing_waiting_edges,
        number_of_processes_with_incoming_waiting_edges, number_of_processes_with_both,
        number_of_waiting_processes, number_of_holding_processes, number_of_both_waiting_and_holding,
        fully_allocated_resources, contested_resources, average_contention, maximum_contention
        ]
        return features

    def predict_deadlock_percentage(self):
        if not self.ml_model:
            messagebox.showwarning("ML Prediction Disabled", "ML model is not loaded. Deadlock prediction is unavailable.")
            self.status.config(text="ML Prediction: Unavailable")
            return

        try:
            features = self.extract_features()
            prediction = self.ml_model.predict([features])[0]
            messagebox.showinfo("ML Prediction", f"Predicted deadlock percentage: {prediction:.2f}%")
            self.status.config(text=f"ML Prediction: {prediction:.2f}% deadlock")
        except Exception as e:
            messagebox.showerror("Error", f"ML Prediction failed: {str(e)}")

    def get_next_node_position(self, node_type):
        existing = [pos for node, pos in self.node_positions.items()
                   if (node_type == 'process' and node in self.rag.processes) or
                      (node_type == 'resource' and node in self.rag.resources)]
        y = 100
        while any(abs(y - pos[1]) < self.node_spacing for pos in existing):
            y += self.node_spacing
        x = self.process_x if node_type == 'process' else self.resource_x
        canvas_width = max(1000, self.canvas.winfo_width())
        if x + self.resource_width/2 > canvas_width - 20:
            x = canvas_width - self.resource_width/2 - 20
        if x - self.process_radius < 20:
            x = self.process_radius + 20
        return (x, y)

    def on_close(self):
        if messagebox.askokcancel("Quit", "Do you want to quit?"):
            self.destroy()
            sys.exit()

    def resolve_deadlock(self):
        """Resolve deadlock using a selected strategy."""
        deadlock, deadlocked_processes = self.rag.detect_deadlock()
        if not deadlock:
            messagebox.showinfo("Deadlock Resolution", "No deadlock detected. No resolution needed.")
            return

        strategy = messagebox.askquestion(
            "Deadlock Detected",
            "Deadlock detected! Choose a resolution strategy:\n"
            "1. Resource Preemption\n"
            "2. Process Termination\n\n"
            "Click 'Yes' for Resource Preemption or 'No' for Process Termination."
        )

        if strategy == "yes":
            self.resource_preemption(deadlocked_processes)
        else:
            self.process_termination(deadlocked_processes)

    
    def resource_preemption(self, deadlocked_processes):
        try:
            for process in deadlocked_processes:
                # Remove allocations
                for resource, allocation in list(self.rag.allocations.items()):
                    if resource[0] == process:
                        self.rag.remove_allocation(process, resource[1], allocation)
                # Remove requests
                for request in list(self.rag.requests.keys()):
                    if request[0] == process:
                        del self.rag.requests[request]
            self.update_display()
            # Recheck deadlock
            deadlock, _ = self.rag.detect_deadlock()
            if deadlock:
                messagebox.showwarning("Partial Resolution", "Deadlock persists after preemption.")
            else:
                messagebox.showinfo("Resource Preemption", "Deadlock resolved by preempting resources.")
            self.status.config(text="Resource preemption applied")
        except Exception as e:
            messagebox.showerror("Error", f"Resource preemption failed: {str(e)}")

    def reset_graph(self):
        """Reset the graph and clear the UI."""
        if not messagebox.askyesno("Reset", "Are you sure you want to clear everything?"):
            self.status.config(text="Reset canceled")
            return  # Exit if user selects "No"

        try:
            print("Resetting graph...")

            # Optionally save the current state for undo (if desired)
            # Commenting this out since you clear stacks later; remove if undo not needed
            # self.push_undo_action('import', None, None, self.rag.export_state())

            # Reset the Resource Allocation Graph
            self.rag = ResourceAllocationGraph()
            
            # Reset UI-related attributes
            self.node_positions.clear()
            self.selected_nodes.clear()
            self.dragging = None
            self.edge_creation_mode = None
            self.process_x = 150  # Reset process column position
            self.resource_x = 400  # Reset resource column position

            # Clear undo/redo stacks (remove if you want undo to persist)
            self.undo_stack.clear()
            self.redo_stack.clear()

            # Clear input fields
            self.process_entry.delete(0, tk.END)
            self.resource_entry.delete(0, tk.END)
            self.instance_spin.set(1)
            self.count_spin.set(1)

            # Update the display
            self.canvas.delete("all")  # Explicitly clear canvas
            self.update_display()

            # Update status bar
            self.status.config(text="Graph reset successfully")
            print("Graph reset completed.")

        except Exception as e:
            messagebox.showerror("Error", f"Failed to reset graph: {str(e)}")
            self.status.config(text="Reset failed")
            print(f"Reset error: {str(e)}")

if __name__ == "__main__":
    app = RAGSimulator()
    app.mainloop()
