from typing import Dict, List, Any, Optional
import re
import random
import networkx as nx
from .graph import Graph, Node, Edge

def validate_syntax(text: str) -> List[Dict[str, Any]]:
    """
    Validate the syntax of a language description
    
    Args:
        text: The language description
        
    Returns:
        List of syntax errors
    """
    errors = []
    
    # Skip validation for empty text
    if not text.strip():
        return errors
    
    lines = text.split('\n')
    
    # Check for basic structure
    if 'create_graph' in text and '{' not in text:
        errors.append({
            "line": text.index('create_graph') // len(lines[0]) + 1,
            "column": text.index('create_graph') % len(lines[0]),
            "message": "Missing opening brace '{' after create_graph"
        })
    
    if 'create_graph' in text and '}' not in text:
        errors.append({
            "line": text.index('create_graph') // len(lines[0]) + 1,
            "column": text.index('create_graph') % len(lines[0]),
            "message": "Missing closing brace '}' for create_graph"
        })
    
    # Check for process and resource definitions
    if 'processes' in text and '=' not in text:
        errors.append({
            "line": text.index('processes') // len(lines[0]) + 1,
            "column": text.index('processes') % len(lines[0]),
            "message": "Missing assignment '=' for processes"
        })
    
    if 'resources' in text and '=' not in text:
        errors.append({
            "line": text.index('resources') // len(lines[0]) + 1,
            "column": text.index('resources') % len(lines[0]),
            "message": "Missing assignment '=' for resources"
        })
    
    # Check for allocation and request sections
    if 'allocations' in text and '{' not in text[text.index('allocations'):]:
        errors.append({
            "line": text.index('allocations') // len(lines[0]) + 1,
            "column": text.index('allocations') % len(lines[0]),
            "message": "Missing opening brace '{' after allocations"
        })
    
    if 'requests' in text and '{' not in text[text.index('requests'):]:
        errors.append({
            "line": text.index('requests') // len(lines[0]) + 1,
            "column": text.index('requests') % len(lines[0]),
            "message": "Missing opening brace '{' after requests"
        })
    
    # Check for semicolons in allocations and requests
    allocation_section = re.search(r'allocations\s*{([^}]*)}', text)
    if allocation_section and '->' in allocation_section.group(1) and ';' not in allocation_section.group(1):
        errors.append({
            "line": text.index('allocations') // len(lines[0]) + 1,
            "column": text.index('allocations') % len(lines[0]),
            "message": "Missing semicolon ';' after allocation statement"
        })
    
    request_section = re.search(r'requests\s*{([^}]*)}', text)
    if request_section and '->' in request_section.group(1) and ';' not in request_section.group(1):
        errors.append({
            "line": text.index('requests') // len(lines[0]) + 1,
            "column": text.index('requests') % len(lines[0]),
            "message": "Missing semicolon ';' after request statement"
        })
    
    return errors

def parse_language_to_graph(text: str) -> Dict[str, Any]:
    """
    Parse a language description into a resource allocation graph
    
    Args:
        text: The language description
        
    Returns:
        Dictionary representation of the graph
    """
    # Check if this is formal syntax or natural language
    if 'create_graph' in text:
        return parse_formal_syntax(text)
    else:
        return parse_natural_language(text)

def parse_formal_syntax(text: str) -> Dict[str, Any]:
    """
    Parse formal syntax into a resource allocation graph
    
    Args:
        text: The formal syntax description
        
    Returns:
        Dictionary representation of the graph
    """
    # Remove comments
    text = re.sub(r'//.*$', '', text, flags=re.MULTILINE)
    
    # Extract processes
    processes_match = re.search(r'processes\s*=\s*\[(.*?)\]', text)
    processes = []
    if processes_match:
        process_list = processes_match.group(1).split(',')
        processes = [p.strip() for p in process_list]
    
    # Extract resources
    resources_match = re.search(r'resources\s*=\s*\[(.*?)\]', text)
    resources = []
    resource_instances = {}
    if resources_match:
        resource_list = resources_match.group(1).split(',')
        for r in resource_list:
            r = r.strip()
            # Check for instances
            instance_match = re.search(r'(\w+)\s*$$\s*(\d+)\s*$$', r)
            if instance_match:
                resource_id = instance_match.group(1)
                instances = int(instance_match.group(2))
                resources.append(resource_id)
                resource_instances[resource_id] = instances
            else:
                resources.append(r)
                resource_instances[r] = 1
    
    # Extract allocations
    allocations = []
    allocation_section = re.search(r'allocations\s*{(.*?)}', text, re.DOTALL)
    if allocation_section:
        allocation_statements = re.findall(r'(.*?)\s*->\s*(.*?)\s*;', allocation_section.group(1))
        allocations = [(source.strip(), target.strip()) for source, target in allocation_statements]
    
    # Extract requests
    requests = []
    request_section = re.search(r'requests\s*{(.*?)}', text, re.DOTALL)
    if request_section:
        request_statements = re.findall(r'(.*?)\s*->\s*(.*?)\s*;', request_section.group(1))
        requests = [(source.strip(), target.strip()) for source, target in request_statements]
    
    # Create graph
    nodes = []
    edges = []
    
    # Layout calculations
    process_y_spacing = 100
    resource_y_spacing = 100
    process_x = 100
    resource_x = 300
    
    # Add process nodes
    for i, process_id in enumerate(processes):
        nodes.append({
            "id": process_id,
            "type": "process",
            "x": process_x,
            "y": 100 + i * process_y_spacing
        })
    
    # Add resource nodes
    for i, resource_id in enumerate(resources):
        nodes.append({
            "id": resource_id,
            "type": "resource",
            "x": resource_x,
            "y": 100 + i * resource_y_spacing,
            "instances": resource_instances.get(resource_id, 1)
        })
    
    # Add allocation edges
    for i, (source, target) in enumerate(allocations):
        edges.append({
            "id": f"e{i}",
            "source": source,
            "target": target,
            "type": "allocation"
        })
    
    # Add request edges
    for i, (source, target) in enumerate(requests):
        edges.append({
            "id": f"e{len(allocations) + i}",
            "source": source,
            "target": target,
            "type": "request"
        })
    
    return {
        "nodes": nodes,
        "edges": edges
    }

def parse_natural_language(text: str) -> Dict[str, Any]:
    """
    Parse natural language into a resource allocation graph
    
    Args:
        text: The natural language description
        
    Returns:
        Dictionary representation of the graph
    """
    # Extract processes
    process_match = re.search(r'(\d+|several|many|multiple)\s+processes', text, re.IGNORECASE)
    process_list_match = re.search(r'processes\s*(?:$$|\[)([^)\]]+)(?:$$|\])', text, re.IGNORECASE)
    
    processes = []
    if process_list_match:
        # Extract processes from list
        process_items = process_list_match.group(1).split(',')
        for item in process_items:
            item = item.strip()
            # Check if it's a valid process identifier
            if re.match(r'^[A-Za-z]\d*$', item):
                processes.append(item)
            else:
                # Create a process ID
                processes.append(f"P{len(processes)}")
    elif process_match:
        # Create processes based on count
        count_text = process_match.group(1).lower()
        if count_text.isdigit():
            count = int(count_text)
        elif count_text in ['several', 'many', 'multiple']:
            count = random.randint(2, 5)
        else:
            count = 2
        
        processes = [f"P{i}" for i in range(count)]
    else:
        # Default to 2 processes
        processes = ["P0", "P1"]
    
    # Extract resources
    resource_match = re.search(r'(\d+|several|many|multiple)\s+resources', text, re.IGNORECASE)
    resource_list_match = re.search(r'resources\s*(?:$$|\[)([^)\]]+)(?:$$|\])', text, re.IGNORECASE)
    
    resources = []
    resource_instances = {}
    
    if resource_list_match:
        # Extract resources from list
        resource_items = resource_list_match.group(1).split(',')
        for item in resource_items:
            item = item.strip()
            # Check for instances
            instance_match = re.search(r'(\w+)\s*$$\s*(\d+)\s*$$', item)
            if instance_match:
                resource_id = instance_match.group(1)
                instances = int(instance_match.group(2))
                resources.append(resource_id)
                resource_instances[resource_id] = instances
            else:
                # Check if it's a valid resource identifier
                if re.match(r'^[A-Za-z]\d*$', item):
                    resources.append(item)
                else:
                    # Create a resource ID
                    resource_id = f"R{len(resources)}"
                    resources.append(resource_id)
                resource_instances[resources[-1]] = 1
    elif resource_match:
        # Create resources based on count
        count_text = resource_match.group(1).lower()
        if count_text.isdigit():
            count = int(count_text)
        elif count_text in ['several', 'many', 'multiple']:
            count = random.randint(2, 5)
        else:
            count = 2
        
        resources = [f"R{i}" for i in range(count)]
        for r in resources:
            resource_instances[r] = 1
    else:
        # Default to 2 resources
        resources = ["R0", "R1"]
        resource_instances = {"R0": 1, "R1": 1}
    
    # Extract allocations and requests
    allocations = []
    requests = []
    
    # Look for allocation patterns
    allocation_patterns = [
        r'(\w+)\s+is\s+using\s+(?:the\s+)?(\w+)',
        r'(\w+)\s+has\s+(?:the\s+)?(\w+)',
        r'(\w+)\s+is\s+allocated\s+to\s+(\w+)',
        r'(\w+)\s+holds\s+(?:the\s+)?(\w+)'
    ]
    
    for pattern in allocation_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            resource_name = match.group(2)
            process_name = match.group(1)
            
            # Check if these are valid process and resource names
            resource_id = None
            process_id = None
            
            # Try to find the resource
            for r in resources:
                if r.lower() == resource_name.lower() or resource_name.lower() in r.lower():
                    resource_id = r
                    break
            
            # Try to find the process
            for p in processes:
                if p.lower() == process_name.lower() or process_name.lower() in p.lower():
                    process_id = p
                    break
            
            # If we found both, add the allocation
            if resource_id and process_id:
                allocations.append((resource_id, process_id))
    
    # Look for request patterns
    request_patterns = [
        r'(\w+)\s+is\s+waiting\s+for\s+(?:the\s+)?(\w+)',
        r'(\w+)\s+requests\s+(?:the\s+)?(\w+)',
        r'(\w+)\s+needs\s+(?:the\s+)?(\w+)',
        r'(\w+)\s+wants\s+(?:the\s+)?(\w+)'
    ]
    
    for pattern in request_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            process_name = match.group(1)
            resource_name = match.group(2)
            
            # Check if these are valid process and resource names
            resource_id = None
            process_id = None
            
            # Try to find the resource
            for r in resources:
                if r.lower() == resource_name.lower() or resource_name.lower() in r.lower():
                    resource_id = r
                    break
            
            # Try to find the process
            for p in processes:
                if p.lower() == process_name.lower() or process_name.lower() in p.lower():
                    process_id = p
                    break
            
            # If we found both, add the request
            if resource_id and process_id:
                requests.append((process_id, resource_id))
    
    # Create graph
    nodes = []
    edges = []
    
    # Layout calculations
    process_y_spacing = 100
    resource_y_spacing = 100
    process_x = 100
    resource_x = 300
    
    # Add process nodes
    for i, process_id in enumerate(processes):
        nodes.append({
            "id": process_id,
            "type": "process",
            "x": process_x,
            "y": 100 + i * process_y_spacing
        })
    
    # Add resource nodes
    for i, resource_id in enumerate(resources):
        nodes.append({
            "id": resource_id,
            "type": "resource",
            "x": resource_x,
            "y": 100 + i * resource_y_spacing,
            "instances": resource_instances.get(resource_id, 1)
        })
    
    # Add allocation edges
    for i, (source, target) in enumerate(allocations):
        edges.append({
            "id": f"e{i}",
            "source": source,
            "target": target,
            "type": "allocation"
        })
    
    # Add request edges
    for i, (source, target) in enumerate(requests):
        edges.append({
            "id": f"e{len(allocations) + i}",
            "source": source,
            "target": target,
            "type": "request"
        })
    
    return {
        "nodes": nodes,
        "edges": edges
    }

