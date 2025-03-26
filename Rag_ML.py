from collections import defaultdict
import random
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib

class ResourceAllocationGraph:  # Copy the RAG class here temporarily for training
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
        if process not in self.processes or resource not in self.resources:
            return
        self.requests[(process, resource)] += count

    def add_allocation(self, process, resource, count=1):
        if process not in self.processes or resource not in self.resources:
            return
        available = self.resources[resource]['available']
        if count <= available:
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

    def is_safe(self):
        deadlock, deadlocked_processes = self.detect_deadlock()
        if not deadlock:
            return True, 0.0
        total_processes = len(self.processes)
        if total_processes == 0:
            return True, 0.0
        deadlock_percentage = (len(deadlocked_processes) / total_processes) * 100
        return False, deadlock_percentage

def generate_rag_data(n_samples=1000, max_processes=10, max_resources=5, max_instances=10):
    data = []
    for _ in range(n_samples):
        rag = ResourceAllocationGraph()
        n_processes = random.randint(1, max_processes)
        n_resources = random.randint(1, max_resources)
        for i in range(n_processes):
            rag.add_process(f"P{i}")
        for j in range(n_resources):
            instances = random.randint(1, max_instances)
            rag.add_resource(f"R{j}", instances)
        for p in rag.processes:
            for r in rag.resources:
                if random.random() < 0.5:
                    max_alloc = rag.resources[r]['available']
                    if max_alloc > 0:
                        alloc = random.randint(1, max_alloc)
                        rag.add_allocation(p, r, alloc)
        for p in rag.processes:
            for r in rag.resources:
                if random.random() < 0.5:
                    request = random.randint(1, 3)
                    rag.add_request(p, r, request)
        is_safe, deadlock_percentage = rag.is_safe()
        features = extract_features(rag)
        data.append((features, deadlock_percentage))
    return data

def extract_features(rag):
    n_processes = len(rag.processes)
    n_resources = len(rag.resources)
    total_instances = sum(info['total'] for info in rag.resources.values())
    total_allocated = sum(sum(rag.allocations.get((p, r), 0) for r in rag.resources) for p in rag.processes)
    total_requested = sum(sum(rag.requests.get((p, r), 0) for r in rag.resources) for p in rag.processes)
    avg_allocation = total_allocated / n_processes if n_processes > 0 else 0
    avg_request = total_requested / n_processes if n_processes > 0 else 0
    max_allocation = max((sum(rag.allocations.get((p, r), 0) for r in rag.resources) for p in rag.processes), default=0)
    max_request = max((sum(rag.requests.get((p, r), 0) for r in rag.resources) for p in rag.processes), default=0)
    n_allocation_edges = sum(1 for cnt in rag.allocations.values() if cnt > 0)
    n_request_edges = sum(1 for cnt in rag.requests.values() if cnt > 0)
    resource_utilization = np.mean([sum(rag.allocations.get((p, r), 0) for p in rag.processes) / info['total']
                                    for r, info in rag.resources.items()]) if rag.resources else 0
    return [
        n_processes, n_resources, total_instances, total_allocated, total_requested,
        avg_allocation, avg_request, max_allocation, max_request,
        n_allocation_edges, n_request_edges, resource_utilization
    ]

# Generate dataset
data = generate_rag_data()
X = [features for features, _ in data]
y = [deadlock_percentage for _, deadlock_percentage in data]

# Split into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train Random Forest Regressor
model = RandomForestRegressor(n_estimators=100, random_state=42)

model.fit(X_train, y_train)


# Evaluate
from sklearn.metrics import mean_squared_error
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
print(f"Mean Squared Error: {mse}")

# Save the trained model
joblib.dump(model, 'rag_deadlock_model.joblib')