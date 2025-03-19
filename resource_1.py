import tkinter as tk
from tkinter import ttk, messagebox
import networkx as nx
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.pyplot as plt
from matplotlib.collections import PathCollection
import sys

class ResourceAllocationGraph:
    def __init__(self):
        self.G = nx.DiGraph()
        self.processes = set()
        self.resources = set()
        
    def add_process(self, process_id):
        if process_id not in self.processes:
            self.G.add_node(process_id, type='process')
            self.processes.add(process_id)
            
    def add_resource(self, resource_id, instances=1):
        if resource_id not in self.resources:
            self.G.add_node(resource_id, type='resource', instances=instances)
            self.resources.add(resource_id)
            
    def add_request_edge(self, process, resource):
        if process in self.processes and resource in self.resources:
            self.G.add_edge(process, resource, type='request')
            
    def add_allocation_edge(self, resource, process):
        if process in self.processes and resource in self.resources:
            self.G.add_edge(resource, process, type='allocation')
            
    def detect_deadlock(self):
        try:
            cycle = nx.find_cycle(self.G, orientation='original')
            return True, cycle
        except nx.NetworkXNoCycle:
            return False, None

class RAGSimulator(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Resource Allocation Graph Simulator")
        self.geometry("1200x800")
        self.rag = ResourceAllocationGraph()
        self.selected_nodes = []
        self.dragging = False
        self.dragged_node = None
        self.node_positions = {}
        self.node_order = []
        self.process_nodes = []
        self.resource_nodes = []
        self.process_collection = None
        self.resource_collection = None

        self.create_widgets()
        self.setup_events()
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
        ttk.Button(control_frame, text="Add Resource", command=self.add_resource).pack(pady=2)

        ttk.Label(control_frame, text="Edge Creation").pack(pady=(20, 5))
        self.edge_type = ttk.Combobox(control_frame, values=["Request", "Allocation"])
        self.edge_type.pack(pady=2)
        ttk.Button(control_frame, text="Add Edge", command=self.add_edge).pack(pady=2)
        ttk.Button(control_frame, text="Clear Selection", command=self.clear_selection).pack(pady=2)

        ttk.Label(control_frame, text="Simulation").pack(pady=(20, 5))
        ttk.Button(control_frame, text="Detect Deadlock", command=self.detect_deadlock).pack(pady=2)
        ttk.Button(control_frame, text="Reset Graph", command=self.reset_graph).pack(pady=2)

        self.figure = plt.figure(figsize=(10, 8))
        self.canvas = FigureCanvasTkAgg(self.figure, master=self)
        self.canvas.get_tk_widget().pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        self.status = ttk.Label(self, text="Ready", relief=tk.SUNKEN)
        self.status.pack(side=tk.BOTTOM, fill=tk.X)

    def setup_events(self):
        self.canvas.mpl_connect('pick_event', self.on_pick)
        self.canvas.mpl_connect('motion_notify_event', self.on_motion)
        self.canvas.mpl_connect('button_release_event', self.on_release)

    def update_graph(self):
        self.figure.clf()
        ax = self.figure.add_subplot(111)
        ax.set_axis_off()
        
        if not self.node_positions:
            self.node_positions = nx.spring_layout(self.rag.G, seed=42)

        self.process_nodes = [n for n in self.rag.G.nodes if n in self.rag.processes]
        self.resource_nodes = [n for n in self.rag.G.nodes if n in self.rag.resources]
        self.node_order = self.process_nodes + self.resource_nodes

        # Draw processes as circles
        self.process_collection = nx.draw_networkx_nodes(
            self.rag.G, self.node_positions, nodelist=self.process_nodes,
            node_shape='o', node_size=1500, ax=ax, node_color='lightblue'
        )

        # Draw resources as squares
        self.resource_collection = nx.draw_networkx_nodes(
            self.rag.G, self.node_positions, nodelist=self.resource_nodes,
            node_shape='s', node_size=1500, ax=ax, node_color='lightgreen'
        )

        # Configure picking for both collections
        for collection in [self.process_collection, self.resource_collection]:
            collection.set_picker(True)
            collection.set_pickradius(20)

        # Highlight selected nodes with different shapes
        if self.selected_nodes:
            for node in self.selected_nodes:
                if node in self.rag.processes:
                    nx.draw_networkx_nodes(
                        self.rag.G, self.node_positions, nodelist=[node],
                        node_shape='o', node_size=1800, ax=ax, 
                        node_color='yellow', alpha=0.7
                    )
                else:
                    nx.draw_networkx_nodes(
                        self.rag.G, self.node_positions, nodelist=[node],
                        node_shape='s', node_size=1800, ax=ax, 
                        node_color='yellow', alpha=0.7
                    )

        # Draw edges
        edge_colors = []
        edge_styles = []
        for u, v in self.rag.G.edges():
            if self.rag.G[u][v]['type'] == 'request':
                edge_colors.append('red')
                edge_styles.append('--')
            else:
                edge_colors.append('black')
                edge_styles.append('-')

        nx.draw_networkx_edges(
            self.rag.G, self.node_positions, ax=ax,
            edge_color=edge_colors, style=edge_styles, arrows=True
        )
        
        # Draw labels
        nx.draw_networkx_labels(self.rag.G, self.node_positions, ax=ax)
        
        self.canvas.draw()

    def on_pick(self, event):
        if event.mouseevent.button != 1:
            return
        
        if not isinstance(event.artist, PathCollection):
            return

        # Determine which collection was clicked
        if event.artist == self.process_collection:
            collection_index = event.ind[0]
            node_index = collection_index
        elif event.artist == self.resource_collection:
            collection_index = event.ind[0]
            node_index = len(self.process_nodes) + collection_index
        else:
            return

        clicked_node = self.node_order[node_index]
        
        if self.edge_type.get():  # Edge creation mode
            if clicked_node in self.selected_nodes:
                self.selected_nodes.remove(clicked_node)
            else:
                if len(self.selected_nodes) < 2:
                    self.selected_nodes.append(clicked_node)
                else:
                    messagebox.showinfo("Info", "Select maximum 2 nodes for edge creation")
            
            self.status.config(text=f"Selected: {', '.join(self.selected_nodes)}")
            self.update_graph()
        else:  # Drag mode
            self.dragged_node = clicked_node
            self.dragging = True

    def on_motion(self, event):
        if self.dragging and self.dragged_node and event.inaxes:
            self.node_positions[self.dragged_node] = [event.xdata, event.ydata]
            self.update_graph()

    def on_release(self, event):
        self.dragging = False
        self.dragged_node = None

    def add_process(self):
        process_id = self.process_entry.get()
        if process_id:
            self.rag.add_process(process_id)
            self.process_entry.delete(0, tk.END)
            self.node_positions = nx.spring_layout(self.rag.G, seed=42)
            self.update_graph()
            self.status.config(text=f"Process {process_id} added")

    def add_resource(self):
        resource_id = self.resource_entry.get()
        if resource_id:
            self.rag.add_resource(resource_id)
            self.resource_entry.delete(0, tk.END)
            self.node_positions = nx.spring_layout(self.rag.G, seed=42)
            self.update_graph()
            self.status.config(text=f"Resource {resource_id} added")

    def add_edge(self):
        if len(self.selected_nodes) != 2:
            messagebox.showerror("Error", "Select exactly two nodes first!")
            return
            
        source, target = self.selected_nodes
        edge_type = self.edge_type.get()
        
        try:
            if edge_type == "Request":
                if source in self.rag.processes and target in self.rag.resources:
                    self.rag.add_request_edge(source, target)
                else:
                    messagebox.showerror("Error", "Request edge must be from Process to Resource")
            elif edge_type == "Allocation":
                if source in self.rag.resources and target in self.rag.processes:
                    self.rag.add_allocation_edge(source, target)
                else:
                    messagebox.showerror("Error", "Allocation edge must be from Resource to Process")
            else:
                messagebox.showerror("Error", "Select edge type first")
            
            self.clear_selection()
            self.update_graph()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def detect_deadlock(self):
        deadlock, cycle = self.rag.detect_deadlock()
        if deadlock:
            messagebox.showwarning("Deadlock Detected", f"Deadlock found in cycle: {cycle}")
            self.status.config(text="Deadlock detected!")
        else:
            messagebox.showinfo("No Deadlock", "System is deadlock-free")
            self.status.config(text="No deadlock detected")

    def reset_graph(self):
        self.rag = ResourceAllocationGraph()
        self.node_positions = {}
        self.selected_nodes = []
        self.update_graph()
        self.status.config(text="Graph reset")

    def clear_selection(self):
        self.selected_nodes = []
        self.status.config(text="Selection cleared")
        self.update_graph()

    def on_close(self):
        if messagebox.askokcancel("Quit", "Do you want to quit?"):
            self.destroy()
            sys.exit()

if __name__ == "__main__":
    app = RAGSimulator()
    app.mainloop()