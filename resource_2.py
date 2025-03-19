import tkinter as tk
from tkinter import ttk, messagebox
from collections import defaultdict
import sys

class ResourceAllocationGraph:
    def __init__(self):
        self.processes = set()
        self.resources = {}
        self.allocations = defaultdict(int)
        self.requests = defaultdict(int)

    def add_process(self, process_id):
        if process_id in self.processes:
            raise ValueError(f"Process {process_id} already exists")
        if not process_id:
            raise ValueError("Process ID cannot be empty")
        self.processes.add(process_id)

    def add_resource(self, resource_id, instances=1):
        if resource_id in self.resources:
            raise ValueError(f"Resource {resource_id} already exists")
        if not resource_id:
            raise ValueError("Resource ID cannot be empty")
        if instances < 1:
            raise ValueError("Resource must have at least 1 instance")
        self.resources[resource_id] = {'total': instances, 'available': instances}

    def add_request(self, process, resource, count=1):
        if process not in self.processes:
            raise ValueError(f"Process {process} does not exist")
        if resource not in self.resources:
            raise ValueError(f"Resource {resource} does not exist")
        if count < 1:
            raise ValueError("Request count must be at least 1")
        self.requests[(process, resource)] += count

    def add_allocation(self, process, resource, count=1):
        if process not in self.processes:
            raise ValueError(f"Process {process} does not exist")
        if resource not in self.resources:
            raise ValueError(f"Resource {resource} does not exist")
        if count < 1:
            raise ValueError("Allocation count must be at least 1")
        
        available = self.resources[resource]['available']
        if count > available:
            raise ValueError(f"Not enough instances available ({available}) in {resource}")
        
        self.allocations[(process, resource)] += count
        self.resources[resource]['available'] -= count

    def release_allocation(self, process, resource, count=1):
        current = self.allocations[(process, resource)]
        if count > current:
            raise ValueError(f"Cannot release more than allocated ({current})")
        
        self.allocations[(process, resource)] -= count
        self.resources[resource]['available'] += count

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
        
        # Layout parameters
        self.process_x = 150
        self.resource_x = 1050
        self.node_spacing = 150  # Increased spacing for larger resource nodes
        self.process_radius = 30
        self.resource_width = 80
        self.resource_height = 80
        
        self.create_widgets()
        self.protocol("WM_DELETE_WINDOW", self.on_close)

    def create_widgets(self):
        control_frame = ttk.Frame(self)
        control_frame.pack(side=tk.LEFT, fill=tk.Y, padx=10, pady=10)

        ttk.Label(control_frame, text="Add Process").pack(pady=5)
        self.process_entry = ttk.Entry(control_frame)
        self.process_entry.pack(pady=2)
        ttk.Button(control_frame, text="Add Process", command=self.add_process).pack(pady=2)

        ttk.Label(control_frame, text="Add Resource").pack(pady=5)
        self.resource_entry = ttk.Entry(control_frame)
        self.resource_entry.pack(pady=2)
        self.instance_spin = ttk.Spinbox(control_frame, from_=1, to=10, width=5)
        self.instance_spin.pack(pady=2)
        ttk.Button(control_frame, text="Add Resource", command=self.add_resource).pack(pady=2)

        ttk.Label(control_frame, text="Edge Creation").pack(pady=(20, 5))
        self.count_spin = ttk.Spinbox(control_frame, from_=1, to=5, width=5)
        self.count_spin.pack(pady=2)
        ttk.Button(control_frame, text="Request Edge", 
                  command=lambda: self.set_edge_mode("request")).pack(pady=2)
        ttk.Button(control_frame, text="Allocation Edge", 
                  command=lambda: self.set_edge_mode("allocation")).pack(pady=2)
        ttk.Button(control_frame, text="Clear Selection", 
                  command=self.clear_selection).pack(pady=2)

        ttk.Label(control_frame, text="Simulation").pack(pady=(20, 5))
        ttk.Button(control_frame, text="Detect Deadlock", 
                  command=self.detect_deadlock).pack(pady=2)
        ttk.Button(control_frame, text="Reset Graph", 
                  command=self.reset_graph).pack(pady=2)

        self.canvas = tk.Canvas(self, bg='white')
        self.canvas.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        self.status = ttk.Label(self, text="Ready", relief=tk.SUNKEN)
        self.status.pack(side=tk.BOTTOM, fill=tk.X)

        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)

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

    def set_edge_mode(self, edge_type):
        self.edge_creation_mode = edge_type
        self.status.config(text=f"Creating {edge_type} edge - select two nodes")
        self.selected_nodes = []

    def update_display(self):
        self.canvas.delete("all")
        
        # Ensure nodes stay within current canvas bounds
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

        # Draw edges first
        for (p, r), count in self.rag.requests.items():
            if count > 0:
                self.draw_edge(p, r, 'request', count)
        for (p, r), count in self.rag.allocations.items():
            if count > 0:
                self.draw_edge(r, p, 'allocation', count)

        # Draw nodes
        for node in self.rag.processes:
            self.draw_process_node(node)
        for node in self.rag.resources:
            self.draw_resource_node(node)

        # Highlight selected nodes
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

    def draw_process_node(self, node_id):
        x, y = self.node_positions.get(node_id, (100, 100))
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
        x, y = self.node_positions.get(node_id, (100, 100))
        width = self.resource_width
        height = self.resource_height
        
        # Draw main rectangle
        self.canvas.create_rectangle(
            x-width/2, y-height/2,
            x+width/2, y+height/2,
            fill='lightgreen', tags=('node', node_id)
        )
        
        # Draw instance dots
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
        
        # Add resource ID text
        self.canvas.create_text(
            x, y + height/2 - 15,
            text=node_id,
            tags=('text', node_id),
            anchor=tk.S
        )

    def draw_edge(self, from_node, to_node, edge_type, count):
        x1, y1 = self.node_positions.get(from_node, (0, 0))
        x2, y2 = self.node_positions.get(to_node, (0, 0))
        
        color = 'red' if edge_type == 'request' else 'black'
        arrow = tk.LAST if edge_type == 'allocation' else tk.NONE
        self.canvas.create_line(
            x1, y1, x2, y2, 
            arrow=arrow, 
            fill=color, 
            width=2, 
            smooth=True
        )
        
        mid_x = (x1 + x2) / 2 + 10
        mid_y = (y1 + y2) / 2 + 10
        self.canvas.create_text(
            mid_x, mid_y, 
            text=str(count), 
            fill=color,
            font=('Arial', 10, 'bold')
        )


    def on_click(self, event):
        item = self.canvas.find_closest(event.x, event.y)
        if item:
            tags = self.canvas.gettags(item[0])
            if 'node' in tags or 'text' in tags:
                node_id = tags[1]
                self.handle_node_click(node_id)

    def handle_node_click(self, node_id):
        if self.edge_creation_mode:
            if node_id in self.selected_nodes:
                self.selected_nodes.remove(node_id)
            else:
                self.selected_nodes.append(node_id)
            
            if len(self.selected_nodes) == 2:
                self.create_edge()
            
            self.update_display()
        else:
            self.start_drag(node_id, event)

    def start_drag(self, node_id, event):
        self.dragging = node_id
        x, y = self.node_positions[node_id]
        self.offset_x = x - event.x
        self.offset_y = y - event.y

    def on_drag(self, event):
        if self.dragging:
            new_x = event.x + self.offset_x
            new_y = event.y + self.offset_y
            self.node_positions[self.dragging] = (new_x, new_y)
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
            elif self.edge_creation_mode == 'allocation':
                if node2 in self.rag.processes and node1 in self.rag.resources:
                    self.rag.add_allocation(node2, node1, count)
                    valid = True
            
            if not valid:
                raise ValueError("Invalid edge direction for selected mode")
            
            self.clear_selection()
            self.update_display()
        except ValueError as e:
            messagebox.showerror("Error", str(e))
            self.clear_selection()

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

    def add_process(self):
        process_id = self.process_entry.get().strip()
        try:
            self.rag.add_process(process_id)
            self.node_positions[process_id] = self.get_next_node_position('process')
            self.process_entry.delete(0, tk.END)
            self.update_display()
        except ValueError as e:
            messagebox.showerror("Error", str(e))

    def add_resource(self):
        resource_id = self.resource_entry.get().strip()
        try:
            instances = int(self.instance_spin.get())
            self.rag.add_resource(resource_id, instances)
            self.node_positions[resource_id] = self.get_next_node_position('resource')
            self.resource_entry.delete(0, tk.END)
            self.update_display()
        except ValueError as e:
            messagebox.showerror("Error", str(e))

    def clear_selection(self):
        self.selected_nodes = []
        self.edge_creation_mode = None
        self.status.config(text="Selection cleared")
        self.update_display()

    def reset_graph(self):
        self.rag = ResourceAllocationGraph()
        self.node_positions = {}
        self.selected_nodes = []
        self.update_display()
        self.status.config(text="Graph reset")

    def on_close(self):
        if messagebox.askokcancel("Quit", "Do you want to quit?"):
            self.destroy()
            sys.exit()

if __name__ == "__main__":
    app = RAGSimulator()
    app.mainloop()
    