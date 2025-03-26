import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from collections import defaultdict
import sys
import math
from rag_model import ResourceAllocationGraph
from utils import create_tooltip

class RAGSimulator(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Resource Allocation Graph Simulator")
        self.geometry("1200x800")
        self.rag = ResourceAllocationGraph()
        self.selected_nodes = []
        self.edge_creation_mode = None
        self.node_positions = {}
        self.dragging = None
        self.offset_x = 0
        self.offset_y = 0
        self.undo_stack = []
        self.redo_stack = []
        self.process_x = 150
        self.resource_x = 1050
        self.node_spacing = 150
        self.process_radius = 35
        self.resource_width = 90
        self.resource_height = 90

        # Styling
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

        control_frame = ttk.LabelFrame(main_frame, text="Control Panel", padding=10)
        control_frame.pack(side=tk.LEFT, fill=tk.Y, padx=10, pady=10)

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
        ttk.Button(sim_frame, text="Reset Graph", 
                  command=self.reset_graph).pack(fill=tk.X, pady=2)

        canvas_frame = ttk.Frame(main_frame, relief=tk.SUNKEN, borderwidth=2)
        canvas_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        self.canvas = tk.Canvas(canvas_frame, bg='white', highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        self.status = ttk.Label(main_frame, text="Ready", style="Status.TLabel", 
                              relief=tk.SUNKEN, anchor='w', padding=5)
        self.status.pack(side=tk.BOTTOM, fill=tk.X)

        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)
        self.create_tooltips()

    def create_tooltips(self):
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
            "Resource Allocation Graph Simulator\n\n"
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
            "6. Export/import graph state\n\n"
            "Tips:\n"
            "• Hover over controls for tooltips\n"
            "• Yellow outline shows selected nodes\n"
            "• Resource color indicates availability"
        )
        help_text.insert(tk.END, content)
        help_text.config(state=tk.DISABLED)
        
        ttk.Button(help_window, text="Close", command=help_window.destroy).pack(pady=5)

    def export_state(self):
        state_json = self.rag.export_state()
        file_path = filedialog.asksaveasfilename(defaultextension=".json", 
                                              filetypes=[("JSON files", "*.json")])
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
                self.push_undo_action('import', None, None, self.rag.export_state())
                self.rag.import_state(state_json)
                old_positions = self.node_positions.copy()
                self.node_positions.clear()
                for p in self.rag.processes:
                    self.node_positions[p] = old_positions.get(p, self.get_next_node_position('process'))
                for r in self.rag.resources:
                    self.node_positions[r] = old_positions.get(r, self.get_next_node_position('resource'))
                self.clear_selection()
                self.update_display()
                messagebox.showinfo("Success", "Graph state imported successfully!")
                self.status.config(text="State imported")
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
        edge_counter = defaultdict(int)
        for (p, r), count in self.rag.requests.items():
            if count > 0 and p in self.node_positions and r in self.node_positions:
                edge_counter[(p, r)] += 1
                self.draw_edge(p, r, 'request', count, edge_counter[(p, r)])
        for (p, r), count in self.rag.allocations.items():
            if count > 0 and p in self.node_positions and r in self.node_positions:
                edge_counter[(p, r)] += 1
                self.draw_edge(p, r, 'allocation', count, edge_counter[(p, r)])

    def draw_edge(self, from_node, to_node, edge_type, count, edge_num):
        x1, y1 = self.node_positions[from_node]
        x2, y2 = self.node_positions[to_node]
        curvature = (edge_num - 1) * 40
        if edge_num % 2 == 0: curvature *= -1
        dx, dy = x2 - x1, y2 - y1
        length = max(1, math.sqrt(dx**2 + dy**2))
        perpendicular = (-dy/length, dx/length)
        cpx = (x1 + x2)/2 + perpendicular[0] * curvature
        cpy = (y1 + y2)/2 + perpendicular[1] * curvature
        color = '#FF3333' if edge_type == 'request' else '#333333'
        self.canvas.create_line(x1, y1, cpx, cpy, x2, y2, smooth=True, splinesteps=24,
                              arrow=tk.LAST if edge_type == 'allocation' else tk.FIRST,
                              fill=color, width=2)
        self.canvas.create_text(cpx, cpy, text=str(count), fill=color, 
                              font=('Arial', 10, 'bold'), tags='edge_label')

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
        if action_type == 'request':
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

    def suggest_deadlock_resolution(self, deadlocked_processes):
        suggestions = []
        for process in deadlocked_processes:
            allocated = [(r, cnt) for (p, r), cnt in self.rag.allocations.items() if p == process]
            if allocated:
                suggestions.append(f"Release resources held by {process}:")
                for resource, count in allocated:
                    suggestions.append(f"  - Release {count} instance(s) of {resource}")
            
            requested = [(r, cnt) for (p, r), cnt in self.rag.requests.items() if p == process]
            if requested:
                suggestions.append(f"Pending requests by {process}:")
                for resource, count in requested:
                    available = self.rag.resources[resource]['available']
                    suggestions.append(f"  - Needs {count} of {resource} (Available: {available})")
                    if available < count:
                        suggestions.append(f"    * Suggestion: Free up {count - available} instance(s) of {resource} from other processes")

        if not suggestions:
            suggestions.append("No specific resource release suggestions available.")
        suggestions.append("\nGeneral Resolution Steps:")
        suggestions.append("1. Identify a process to preempt (terminate temporarily).")
        suggestions.append("2. Release its allocated resources.")
        suggestions.append("3. Re-run the deadlock detection after adjustments.")
        
        return "\n".join(suggestions)

    def detect_deadlock(self):
        try:
            deadlock, processes = self.rag.detect_deadlock()
            if deadlock:
                resolution_guide = self.suggest_deadlock_resolution(processes)
                message = (f"Deadlocked processes: {', '.join(processes)}\n\n"
                          "Resolution Guide:\n" + resolution_guide)
                messagebox.showwarning("Deadlock Detected", message)
                self.status.config(text="Deadlock detected!")
            else:
                messagebox.showinfo("No Deadlock", "System is deadlock-free")
                self.status.config(text="System is deadlock-free")
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def reset_graph(self):
        if messagebox.askyesno("Reset", "Clear everything?"):
            self.push_undo_action('import', None, None, self.rag.export_state())
            self.rag = ResourceAllocationGraph()
            self.node_positions = {}
            self.selected_nodes = []
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