from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Literal
import networkx as nx

class Node(BaseModel):
    id: str
    type: Literal["process", "resource"]
    x: float
    y: float
    instances: Optional[int] = 1

class Edge(BaseModel):
    id: str
    source: str
    target: str
    type: Literal["request", "allocation"]

class Graph(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    
    def to_networkx(self) -> nx.DiGraph:
        """Convert the graph to a NetworkX DiGraph for analysis"""
        G = nx.DiGraph()
        
        # Add nodes
        for node in self.nodes:
            G.add_node(node.id, 
                       type=node.type, 
                       instances=node.instances if node.type == "resource" else None)
        
        # Add edges
        for edge in self.edges:
            G.add_edge(edge.source, edge.target, 
                       id=edge.id, 
                       type=edge.type)
        
        return G

