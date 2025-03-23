import tkinter as tk
from tkinter import ttk, messagebox
from collections import defaultdict
import sys
import math

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

class RAGSimulator(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Advanced RAG Simulator")
        self.geometry("1200x800")
        self.rag = ResourceAllocationGraph()
        self.selected_nodes = []
        self.edge_creation_mode = None
        self.node_positions = {}
        self.dragging = None
        self.offset_x = 0
        self.offset_y = 0
        self.edge_counts = defaultdict(int)

        # Undo/Redo stacks
        self.undo_stack = []
        self.redo_stack = []

        # Layout parameters
        self.process_x = 150
        self.resource_x = 1050
        self.node_spacing = 150
        self.process_radius = 30
        self.resource_width = 80
        self.resource_height = 80
        
        self.create_widgets()
        self.protocol("WM_DELETE_WINDOW", self.on_close)

    def create_widgets(self):
        control_frame = ttk.Frame(self)
        control_frame.pack(side=tk.LEFT, fill=tk.Y, padx=10, pady=10)

        # Process controls
        ttk.Label(control_frame, text="Add Process").pack(pady=5)
        self.process_entry = ttk.Entry(control_frame)
        self.process_entry.pack(pady=2)
        ttk.Button(control_frame, text="Add Process", command=self.add_process).pack(pady=2)

        # Resource controls
        ttk.Label(control_frame, text="Add Resource").pack(pady=5)
        self.resource_entry = ttk.Entry(control_frame)
        self.resource_entry.pack(pady=2)
        self.instance_spin = ttk.Spinbox(control_frame, from_=1, to=10, width=5)
        self.instance_spin.pack(pady=2)
        ttk.Button(control_frame, text="Add Resource", command=self.add_resource).pack(pady=2)

        # Edge controls
        ttk.Label(control_frame, text="Edge Creation").pack(pady=(20, 5))
        self.count_spin = ttk.Spinbox(control_frame, from_=1, to=5, width=5)
        self.count_spin.pack(pady=2)
        ttk.Button(control_frame, text="Request Edge", 
                 command=lambda: self.set_edge_mode("request")).pack(pady=2)
        ttk.Button(control_frame, text="Allocation Edge", 
                 command=lambda: self.set_edge_mode("allocation")).pack(pady=2)
        ttk.Button(control_frame, text="Clear Selection", 
                 command=self.clear_selection).pack(pady=2)

        # Undo/Redo controls
        ttk.Button(control_frame, text="Undo", command=self.undo).pack(pady=2)
        ttk.Button(control_frame, text="Redo", command=self.redo).pack(pady=2)

        # Simulation controls
        ttk.Label(control_frame, text="Simulation").pack(pady=(20, 5))
        ttk.Button(control_frame, text="Detect Deadlock", 
                 command=self.detect_deadlock).pack(pady=2)
        ttk.Button(control_frame, text="Reset Graph", 
                 command=self.reset_graph).pack(pady=2)

        # Canvas setup
        self.canvas = tk.Canvas(self, bg='white')
        self.canvas.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        self.status = ttk.Label(self, text="Ready", relief=tk.SUNKEN)
        self.status.pack(side=tk.BOTTOM, fill=tk.X)

        # Event bindings
        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)

    def set_edge_mode(self, edge_type):
        self.edge_creation_mode = edge_type
        self.status.config(text=f"Creating {edge_type} edge - select two nodes")
        self.selected_nodes = []

    def update_display(self):
        self.canvas.delete("all")
        self.handle_boundaries()
        self.draw_edges()
        self.draw_nodes()
        self.highlight_selected()

    def handle_boundaries(self):
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
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
        edge_counter = defaultdict(int)
        for (p, r), count in self.rag.requests.items():
            if count > 0:
                edge_counter[(p, r)] += 1
                self.draw_edge(p, r, 'request', count, edge_counter[(p, r)])
        
        for (r, p), count in self.rag.allocations.items():
            if count > 0:
                edge_counter[(r, p)] += 1
                self.draw_edge(r, p, 'allocation', count, edge_counter[(r, p)])

    def draw_edge(self, from_node, to_node, edge_type, count, edge_num):
        x1, y1 = self.node_positions[from_node]
        x2, y2 = self.node_positions[to_node]
        
        # Calculate curvature
        curvature = (edge_num - 1) * 40
        if edge_num % 2 == 0: curvature *= -1
        
        # Calculate control point for quadratic Bézier curve
        dx, dy = x2 - x1, y2 - y1
        perpendicular = (-dy, dx)
        length = math.sqrt(perpendicular[0]**2 + perpendicular[1]**2)
        if length == 0: length = 1
        scale = curvature / length
        cpx = (x1 + x2)/2 + perpendicular[0] * scale
        cpy = (y1 + y2)/2 + perpendicular[1] * scale
        
        # Draw curved line
        color = 'red' if edge_type == 'request' else 'black'
        self.canvas.create_line(
            x1, y1, cpx, cpy, x2, y2,
            smooth=True,
            splinesteps=24,
            arrow=tk.LAST if edge_type == 'allocation' else tk.NONE,
            fill=color,
            width=2
        )
        
        # Draw count label
        self.canvas.create_text(
            cpx, cpy, 
            text=str(count), 
            fill=color,
            font=('Arial', 10, 'bold')
        )

    def draw_nodes(self):
        for node in self.rag.processes:
            self.draw_process_node(node)
        for node in self.rag.resources:
            self.draw_resource_node(node)

    def draw_process_node(self, node_id):
        x, y = self.node_positions[node_id]
        self.canvas.create_oval(
            x-self.process_radius, y-self.process_radius,
            x+self.process_radius, y+self.process_radius,
            fill='lightblue', tags=('node', node_id)
        )
        self.canvas.create_text(
            x, y, 
            text=node_id, 
            tags=('text', node_id),
            justify='center'
        )

    def draw_resource_node(self, node_id):
        x, y = self.node_positions[node_id]
        width = self.resource_width
        height = self.resource_height
        
        # Main rectangle
        self.canvas.create_rectangle(
            x-width/2, y-height/2,
            x+width/2, y+height/2,
            fill='lightgreen', tags=('node', node_id)
        )
        
        # Instance dots
        total = self.rag.resources[node_id]['total']
        available = self.rag.resources[node_id]['available']
        allocated = total - available
        
        dot_size = 8
        cols = 3
        rows = (total + cols - 1) // cols
        spacing = 20
        start_x = x - width/2 + spacing
        start_y = y - height/2 + spacing
        
        for i in range(total):
            row = i // cols
            col = i % cols
            dot_x = start_x + col * spacing
            dot_y = start_y + row * spacing
            
            fill_color = 'gray' if i < allocated else 'white'
            self.canvas.create_oval(
                dot_x - dot_size/2, dot_y - dot_size/2,
                dot_x + dot_size/2, dot_y + dot_size/2,
                fill=fill_color, outline='black'
            )
        
        # Resource ID text
        self.canvas.create_text(
            x, y + height/2 - 15,
            text=node_id,
            tags=('text', node_id),
            anchor=tk.S
        )

    def highlight_selected(self):
        for node in self.selected_nodes:
            if node in self.rag.processes:
                x, y = self.node_positions[node]
                self.canvas.create_oval(
                    x-self.process_radius-5, y-self.process_radius-5,
                    x+self.process_radius+5, y+self.process_radius+5,
                    outline='yellow', width=3
                )
            else:
                x, y = self.node_positions[node]
                self.canvas.create_rectangle(
                    x-self.resource_width/2-5, y-self.resource_height/2-5,
                    x+self.resource_width/2+5, y+self.resource_height/2+5,
                    outline='yellow', width=3
                )

    def on_click(self, event):
        x = self.canvas.canvasx(event.x)
        y = self.canvas.canvasy(event.y)
        items = self.canvas.find_overlapping(x-5, y-5, x+5, y+5)
        
        if items:
            item = items[0]
            tags = self.canvas.gettags(item)
            if 'node' in tags or 'text' in tags:
                node_id = tags[1]
                self.handle_node_click(node_id)
                return
        self.clear_selection()

    def handle_node_click(self, node_id):
        if self.edge_creation_mode:
            self.selected_nodes.append(node_id)
            if len(self.selected_nodes) == 2:
                self.create_edge()
            self.update_display()
        else:
            self.start_drag(node_id)

    def start_drag(self, node_id):
        self.dragging = node_id
        x, y = self.node_positions[node_id]
        self.offset_x = x - self.canvas.canvasx(self.winfo_pointerx() - self.winfo_rootx())
        self.offset_y = y - self.canvas.canvasy(self.winfo_pointery() - self.winfo_rooty())

    def on_drag(self, event):
        if self.dragging:
            x = self.canvas.canvasx(event.x) + self.offset_x
            y = self.canvas.canvasy(event.y) + self.offset_y
            self.node_positions[self.dragging] = (x, y)
            self.update_display()

    def on_release(self, event):
        self.dragging = None

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
                    valid = True
                    self.push_undo_action('request', node1, node2, count)
            elif self.edge_creation_mode == 'allocation':
                if node2 in self.rag.processes and node1 in self.rag.resources:
                    self.rag.add_allocation(node2, node1, count)
                    valid = True
                    self.push_undo_action('allocation', node2, node1, count)
            
            if not valid:
                raise ValueError("Invalid edge direction for selected mode")
            
            self.clear_selection()
            self.update_display()
        except ValueError as e:
            messagebox.showerror("Error", str(e))
            self.clear_selection()

    def push_undo_action(self, action_type, node1, node2, count):
        self.undo_stack.append((action_type, node1, node2, count))
        self.redo_stack.clear()  # Clear redo stack on new action

    def undo(self):
        if not self.undo_stack:
            messagebox.showinfo("Undo", "No actions to undo.")
            return
        
        action_type, node1, node2, count = self.undo_stack.pop()
        if action_type == 'request':
            self.rag.requests[(node1, node2)] -= count
            if self.rag.requests[(node1, node2)] <= 0:
                del self.rag.requests[(node1, node2)]
        elif action_type == 'allocation':
            self.rag.allocations[(node2, node1)] -= count
            self.rag.resources[node1]['available'] += count
            if self.rag.allocations[(node2, node1)] <= 0:
                del self.rag.allocations[(node2, node1)]
        
        self.redo_stack.append((action_type, node1, node2, count))
        self.update_display()

    def redo(self):
        if not self.redo_stack:
            messagebox.showinfo("Redo", "No actions to redo.")
            return
        
        action_type, node1, node2, count = self.redo_stack.pop()
        if action_type == 'request':
            self.rag.add_request(node1, node2, count)
        elif action_type == 'allocation':
            self.rag.add_allocation(node2, node1, count)
        
        self.undo_stack.append((action_type, node1, node2, count))
        self.update_display()

    def add_process(self):
        custom_name = self.process_entry.get().strip()
        try:
            process_id = self.rag.add_process(custom_name if custom_name else None)
            if not custom_name:
                self.process_entry.delete(0, tk.END)
            self.node_positions[process_id] = self.get_next_node_position('process')
            self.push_undo_action('add_process', process_id, None, 0)
            self.update_display()
        except ValueError as e:
            messagebox.showerror("Error", str(e))

    def add_resource(self):
        custom_name = self.resource_entry.get().strip()
        try:
            instances = int(self.instance_spin.get())
            resource_id = self.rag.add_resource(custom_name if custom_name else None, instances)
            if not custom_name:
                self.resource_entry.delete(0, tk.END)
            self.node_positions[resource_id] = self.get_next_node_position('resource')
            self.push_undo_action('add_resource', resource_id, None, instances)
            self.update_display()
        except ValueError as e:
            messagebox.showerror("Error", str(e))

    def clear_selection(self):
        self.selected_nodes = []
        self.edge_creation_mode = None
        self.status.config(text="Selection cleared")
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
                self.status.config(text="No deadlock detected")
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def reset_graph(self):
        self.rag = ResourceAllocationGraph()
        self.node_positions = {}
        self.selected_nodes = []
        self.undo_stack.clear()
        self.redo_stack.clear()
        self.update_display()
        self.status.config(text="Graph reset")

    def get_next_node_position(self, node_type):
        existing = [pos for node, pos in self.node_positions.items() 
                   if (node_type == 'process' and node in self.rag.processes) or
                      (node_type == 'resource' and node in self.rag.resources)]
        
        y = 100
        while any(abs(y - pos[1]) < self.node_spacing for pos in existing):
            y += self.node_spacing
            
        x = self.process_x if node_type == 'process' else self.resource_x
        
        # Ensure nodes stay within initial canvas bounds
        canvas_width = self.canvas.winfo_width() or 1000
        if x + self.resource_width/2 > canvas_width - 20:
            x = canvas_width - self.resource_width/2 - 20
        if x - self.process_radius < 20:
            x = self.process_radius + 20
            
        return (x, y)

    def on_close(self):
        if messagebox.askokcancel("Quit", "Do you want to quit?"):
            self.destroy()
            sys.exit()

if __name__ == "__main__":
    app = RAGSimulator()
    app.mainloop()