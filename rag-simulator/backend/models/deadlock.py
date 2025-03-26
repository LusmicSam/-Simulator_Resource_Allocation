from typing import Dict, List, Any, Tuple
import networkx as nx
from .graph import Graph

def detect_deadlock(graph: Graph) -> Dict[str, Any]:
    """
    Detect deadlocks in a Resource Allocation Graph
    
    Args:
        graph: The Resource Allocation Graph
        
    Returns:
        Dictionary with deadlock information
    """
    G = graph.to_networkx()
    
    # Find cycles in the graph
    try:
        cycles = list(nx.simple_cycles(G))
    except nx.NetworkXNoCycle:
        cycles = []
    
    if not cycles:
        return {
            "hasDeadlock": False,
            "cycle": [],
            "explanation": "No cycles detected in the graph. The system is not in a deadlock state."
        }
    
    # Check if cycles involve resources and processes
    deadlock_cycles = []
    for cycle in cycles:
        # Check if the cycle alternates between processes and resources
        is_valid_cycle = True
        for i in range(len(cycle)):
            node = cycle[i]
            next_node = cycle[(i + 1) % len(cycle)]
            
            # Get node types
            node_type = G.nodes[node].get('type')
            next_node_type = G.nodes[next_node].get('type')
            
            # Check edge type
            edge_type = G.edges[node, next_node].get('type')
            
            # Valid transitions:
            # process --request--> resource
            # resource --allocation--> process
            if (node_type == 'process' and next_node_type == 'resource' and edge_type == 'request') or \
               (node_type == 'resource' and next_node_type == 'process' and edge_type == 'allocation'):
                continue
            else:
                is_valid_cycle = False
                break
        
        if is_valid_cycle:
            deadlock_cycles.append(cycle)
    
    if not deadlock_cycles:
        return {
            "hasDeadlock": False,
            "cycle": [],
            "explanation": "Cycles detected, but they do not represent valid deadlock scenarios."
        }
    
    # Check if all resources in the cycle have only one instance
    for cycle in deadlock_cycles:
        resources_in_cycle = [node for node in cycle if G.nodes[node].get('type') == 'resource']
        
        # Check if all resources have only one instance
        single_instance_resources = all(
            G.nodes[resource].get('instances', 1) == 1 
            for resource in resources_in_cycle
        )
        
        if single_instance_resources:
            return {
                "hasDeadlock": True,
                "cycle": cycle,
                "explanation": "Deadlock detected. A cycle exists in the resource allocation graph, and all resources in the cycle have only one instance."
            }
    
    # If we have cycles but resources have multiple instances, we need Banker's Algorithm
    return {
        "hasDeadlock": True,  # Conservative approach - mark as potential deadlock
        "cycle": deadlock_cycles[0],  # Return the first cycle
        "explanation": "Potential deadlock detected. A cycle exists in the resource allocation graph, but some resources have multiple instances. Further analysis with Banker's Algorithm is recommended."
    }

def check_resource_request(state: Dict[str, Any], process_id: int, request: List[int]) -> Dict[str, Any]:
    """
    Check if a resource request would lead to a deadlock
    
    Args:
        state: Current system state
        process_id: ID of the requesting process
        request: Resource request vector
        
    Returns:
        Dictionary with request validation information
    """
    # Extract state information
    available = state.get('available', [])
    allocation = state.get('allocation', [])
    need = state.get('need', [])
    
    # Check if request exceeds need
    if any(request[i] > need[process_id][i] for i in range(len(request))):
        return {
            "isSafe": False,
            "safeSequence": None,
            "explanation": [
                f"Request exceeds maximum claim for process {process_id}.",
                "The request cannot be granted."
            ]
        }
    
    # Check if request exceeds available resources
    if any(request[i] > available[i] for i in range(len(request))):
        return {
            "isSafe": False,
            "safeSequence": None,
            "explanation": [
                f"Request exceeds available resources.",
                "The process must wait until resources are available."
            ]
        }
    
    # Simulate resource allocation
    temp_available = available.copy()
    temp_allocation = [row.copy() for row in allocation]
    temp_need = [row.copy() for row in need]
    
    # Allocate resources temporarily
    for i in range(len(request)):
        temp_available[i] -= request[i]
        temp_allocation[process_id][i] += request[i]
        temp_need[process_id][i] -= request[i]
    
    # Check if resulting state is safe
    temp_state = {
        'available': temp_available,
        'allocation': temp_allocation,
        'need': temp_need,
        'processes': len(allocation),
        'resources': len(available)
    }
    
    result = check_safety(temp_state)
    
    if result['isSafe']:
        return {
            "isSafe": True,
            "safeSequence": result['safeSequence'],
            "explanation": [
                f"Request from process {process_id} can be granted.",
                "The resulting state is safe.",
                f"Safe sequence: {' → '.join(f'P{p}' for p in result['safeSequence'])}"
            ]
        }
    else:
        return {
            "isSafe": False,
            "safeSequence": None,
            "explanation": [
                f"Request from process {process_id} cannot be granted.",
                "The resulting state would be unsafe and could lead to deadlock."
            ]
        }

