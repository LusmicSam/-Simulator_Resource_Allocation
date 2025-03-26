from typing import Dict, List, Any

def check_safety(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check if a system state is safe using the Banker's Algorithm
    
    Args:
        state: System state with available resources, allocation matrix, and need matrix
        
    Returns:
        Dictionary with safety information
    """
    # Extract state information
    processes = state.get('processes', 0)
    resources = state.get('resources', 0)
    available = state.get('available', [])
    allocation = state.get('allocation', [])
    need = state.get('need', [])
    
    # Initialize work and finish arrays
    work = available.copy()
    finish = [False] * processes
    safe_sequence = []
    
    # Generate explanation steps
    explanation = [
        "Starting safety algorithm to determine if the state is safe.",
        f"Initial available resources: {work}",
        "Checking for processes that can complete with available resources..."
    ]
    
    # Find a safe sequence
    while True:
        found = False
        
        for i in range(processes):
            if not finish[i]:
                # Check if process i can complete
                can_complete = True
                for j in range(resources):
                    if need[i][j] > work[j]:
                        can_complete = False
                        break
                
                if can_complete:
                    # Process i can complete
                    explanation.append(f"Process {i} can complete with available resources {work}.")
                    explanation.append(f"Need: {need[i]}, Available: {work}")
                    
                    # Update work vector
                    for j in range(resources):
                        work[j] += allocation[i][j]
                    
                    explanation.append(f"Process {i} releases its resources. New available: {work}")
                    
                    # Mark process as finished
                    finish[i] = True
                    safe_sequence.append(i)
                    found = True
                    break
        
        if not found:
            break
    
    # Check if all processes can finish
    if all(finish):
        explanation.append(f"All processes can complete. Safe sequence: {' → '.join(f'P{p}' for p in safe_sequence)}")
        return {
            "isSafe": True,
            "safeSequence": safe_sequence,
            "explanation": explanation
        }
    else:
        # Identify deadlocked processes
        deadlocked = [i for i in range(processes) if not finish[i]]
        explanation.append(f"Processes {deadlocked} cannot complete. The system is in an unsafe state.")
        return {
            "isSafe": False,
            "safeSequence": None,
            "explanation": explanation
        }

def run_bankers_algorithm(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run the Banker's Algorithm on a system state
    
    Args:
        state: System state with available resources, allocation matrix, and need matrix
        
    Returns:
        Dictionary with algorithm results
    """
    # Validate input
    processes = state.get('processes', 0)
    resources = state.get('resources', 0)
    available = state.get('available', [])
    max_matrix = state.get('max', [])
    allocation = state.get('allocation', [])
    
    # Calculate need matrix if not provided
    need = state.get('need')
    if need is None:
        need = []
        for i in range(processes):
            process_need = []
            for j in range(resources):
                process_need.append(max_matrix[i][j] - allocation[i][j])
            need.append(process_need)
    
    # Update state with calculated need
    state['need'] = need
    
    # Run safety algorithm
    result = check_safety(state)
    
    return result

