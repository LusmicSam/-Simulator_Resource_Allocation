import json
from pathlib import Path

# Create examples directory if it doesn't exist
Path("data").mkdir(exist_ok=True)
Path("data/examples").mkdir(exist_ok=True)

# Example 1: Simple Deadlock
simple_deadlock = {
    "title": "Simple Deadlock",
    "description": "A classic deadlock scenario with two processes and two resources.",
    "graph": {
        "nodes": [
            {"id": "P0", "type": "process", "x": 100, "y": 100},
            {"id": "P1", "type": "process", "x": 100, "y": 300},
            {"id": "R0", "type": "resource", "x": 300, "y": 100, "instances": 1},
            {"id": "R1", "type": "resource", "x": 300, "y": 300, "instances": 1}
        ],
        "edges": [
            {"id": "e0", "source": "P0", "target": "R1", "type": "request"},
            {"id": "e1", "source": "R0", "target": "P0", "type": "allocation"},
            {"id": "e2", "source": "P1", "target": "R0", "type": "request"},
            {"id": "e3", "source": "R1", "target": "P1", "type": "allocation"}
        ]
    }
}

# Example 2: Resource Hierarchy
resource_hierarchy = {
    "title": "Resource Hierarchy",
    "description": "A system with resources organized in a hierarchy to prevent deadlocks.",
    "graph": {
        "nodes": [
            {"id": "P0", "type": "process", "x": 100, "y": 100},
            {"id": "P1", "type": "process", "x": 100, "y": 300},
            {"id": "R0", "type": "resource", "x": 300, "y": 100, "instances": 1},
            {"id": "R1", "type": "resource", "x": 300, "y": 200, "instances": 1},
            {"id": "R2", "type": "resource", "x": 300, "y": 300, "instances": 1}
        ],
        "edges": [
            {"id": "e0", "source": "P0", "target": "R1", "type": "request"},
            {"id": "e1", "source": "R0", "target": "P0", "type": "allocation"},
            {"id": "e2", "source": "P1", "target": "R2", "type": "request"},
            {"id": "e3", "source": "R1", "target": "P1", "type": "allocation"}
        ]
    }
}

# Example 3: Multiple Resource Instances
multi_instance = {
    "title": "Multiple Resource Instances",
    "description": "A system with multiple instances of resources, demonstrating how this can prevent deadlocks.",
    "graph": {
        "nodes": [
            {"id": "P0", "type": "process", "x": 100, "y": 100},
            {"id": "P1", "type": "process", "x": 100, "y": 300},
            {"id": "R0", "type": "resource", "x": 300, "y": 100, "instances": 2},
            {"id": "R1", "type": "resource", "x": 300, "y": 300, "instances": 2}
        ],
        "edges": [
            {"id": "e0", "source": "P0", "target": "R1", "type": "request"},
            {"id": "e1", "source": "R0", "target": "P0", "type": "allocation"},
            {"id": "e2", "source": "P1", "target": "R0", "type": "request"},
            {"id": "e3", "source": "R1", "target": "P1", "type": "allocation"},
            {"id": "e4", "source": "R0", "target": "P1", "type": "allocation"}
        ]
    }
}

# Example 4: Complex Deadlock
complex_deadlock = {
    "title": "Complex Deadlock",
    "description": "A more complex deadlock scenario with multiple processes and resources.",
    "graph": {
        "nodes": [
            {"id": "P0", "type": "process", "x": 100, "y": 100},
            {"id": "P1", "type": "process", "x": 100, "y": 200},
            {"id": "P2", "type": "process", "x": 100, "y": 300},
            {"id": "P3", "type": "process", "x": 100, "y": 400},
            {"id": "R0", "type": "resource", "x": 300, "y": 100, "instances": 1},
            {"id": "R1", "type": "resource", "x": 300, "y": 200, "instances": 1},
            {"id": "R2", "type": "resource", "x": 300, "y": 300, "instances": 1},
            {"id": "R3", "type": "resource", "x": 300, "y": 400, "instances": 1}
        ],
        "edges": [
            {"id": "e0", "source": "P0", "target": "R1", "type": "request"},
            {"id": "e1", "source": "R0", "target": "P0", "type": "allocation"},
            {"id": "e2", "source": "P1", "target": "R2", "type": "request"},
            {"id": "e3", "source": "R1", "target": "P1", "type": "allocation"},
            {"id": "e4", "source": "P2", "target": "R3", "type": "request"},
            {"id": "e5", "source": "R2", "target": "P2", "type": "allocation"},
            {"id": "e6", "source": "P3", "target": "R0", "type": "request"},
            {"id": "e7", "source": "R3", "target": "P3", "type": "allocation"}
        ]
    }
}

# Example 5: Deadlock Prevention
deadlock_prevention = {
    "title": "Deadlock Prevention",
    "description": "A system designed to prevent deadlocks by ensuring resources are requested in a specific order.",
    "graph": {
        "nodes": [
            {"id": "P0", "type": "process", "x": 100, "y": 100},
            {"id": "P1", "type": "process", "x": 100, "y": 300},
            {"id": "R0", "type": "resource", "x": 300, "y": 100, "instances": 1},
            {"id": "R1", "type": "resource", "x": 300, "y": 200, "instances": 1},
            {"id": "R2", "type": "resource", "x":   "resource", "x": 300, "y": 200, "instances": 1},
            {"id": "R2", "type": "resource", "x": 300, "y": 300, "instances": 1}
        ],
        "edges": [
            {"id": "e0", "source": "R0", "target": "P0", "type": "allocation"},
            {"id": "e1", "source": "P0", "target": "R1", "type": "request"},
            {"id": "e2", "source": "R1", "target": "P1", "type": "allocation"},
            {"id": "e3", "source": "P1", "target": "R2", "type": "request"}
        ]
    }
}

# Save examples to files
with open("data/examples/simple_deadlock.json", "w") as f:
    json.dump(simple_deadlock, f, indent=2)

with open("data/examples/resource_hierarchy.json", "w") as f:
    json.dump(resource_hierarchy, f, indent=2)

with open("data/examples/multi_instance.json", "w") as f:
    json.dump(multi_instance, f, indent=2)

with open("data/examples/complex_deadlock.json", "w") as f:
    json.dump(complex_deadlock, f, indent=2)

with open("data/examples/deadlock_prevention.json", "w") as f:
    json.dump(deadlock_prevention, f, indent=2)

print("Example graphs created successfully!")

