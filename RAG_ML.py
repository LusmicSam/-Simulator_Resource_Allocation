import numpy as np
import random
import joblib
from collections import defaultdict
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_squared_error, r2_score

# ===============================
# 1. Resource Allocation Graph Class
# ===============================
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

    def extract_features(self):
        rag = self
        n_processes = len(rag.processes)
        n_resources = len(rag.resources)
        total_instances = sum(info['total'] for info in rag.resources.values())
        total_allocated = sum(rag.allocations.values())
        total_requested = sum(rag.requests.values())
        n_allocation_edges = sum(1 for cnt in rag.allocations.values() if cnt > 0)
        n_request_edges = sum(1 for cnt in rag.requests.values() if cnt > 0)

        # Per-process allocation and request statistics
        allocation_per_process = {p: sum(rag.allocations.get((p, r), 0) for r in rag.resources) for p in rag.processes}
        request_per_process = {p: sum(rag.requests.get((p, r), 0) for r in rag.resources) for p in rag.processes}
        avg_allocation = np.mean(list(allocation_per_process.values())) if n_processes > 0 else 0
        avg_request = np.mean(list(request_per_process.values())) if n_processes > 0 else 0
        max_allocation = max(allocation_per_process.values(), default=0)
        max_request = max(request_per_process.values(), default=0)

        # Resource utilization
        utilization = [sum(rag.allocations.get((p, r), 0) for p in rag.processes) / info['total']
                       for r, info in rag.resources.items()]
        resource_utilization = np.mean(utilization) if utilization else 0

        # Waiting edges (P1 -> P2 if P1 requests R and P2 holds R)
        waiting_edges = set()
        for r in rag.resources:
            holders = [p for p in rag.processes if rag.allocations.get((p, r), 0) > 0]
            requesters = [p for p in rag.processes if rag.requests.get((p, r), 0) > 0]
            for p1 in requesters:
                for p2 in holders:
                    if p1 != p2:
                        waiting_edges.add((p1, p2))
        number_of_waiting_edges = len(waiting_edges)

        # Processes with waiting relationships
        outgoing_processes = set(p1 for (p1, p2) in waiting_edges)
        incoming_processes = set(p2 for (p1, p2) in waiting_edges)
        number_of_processes_with_outgoing_waiting_edges = len(outgoing_processes)
        number_of_processes_with_incoming_waiting_edges = len(incoming_processes)
        number_of_processes_with_both = len(outgoing_processes & incoming_processes)

        # Holding and waiting processes
        holding_processes = set(p for p in rag.processes if any(rag.allocations.get((p, r), 0) > 0 for r in rag.resources))
        number_of_holding_processes = len(holding_processes)
        number_of_waiting_processes = len(outgoing_processes)
        both_waiting_and_holding = outgoing_processes & holding_processes
        number_of_both_waiting_and_holding = len(both_waiting_and_holding)

        # Resource contention features
        fully_allocated_resources = sum(1 for r in rag.resources if rag.resources[r]['available'] == 0)
        contested_resources = 0
        total_contention = 0
        max_contention = 0
        for r in rag.resources:
            sum_requests = sum(rag.requests.get((p, r), 0) for p in rag.processes)
            available = rag.resources[r]['available']
            if sum_requests > available:
                contested_resources += 1
                contention = sum_requests - available
                total_contention += contention
                max_contention = max(max_contention, contention)
        average_contention = total_contention / contested_resources if contested_resources > 0 else 0
        maximum_contention = max_contention

        # Compile all 23 features into a list
        features = [
            n_processes, n_resources, total_instances, total_allocated, total_requested,
            avg_allocation, avg_request, max_allocation, max_request,
            n_allocation_edges, n_request_edges, resource_utilization,
            number_of_waiting_edges, number_of_processes_with_outgoing_waiting_edges,
            number_of_processes_with_incoming_waiting_edges, number_of_processes_with_both,
            number_of_waiting_processes, number_of_holding_processes, number_of_both_waiting_and_holding,
            fully_allocated_resources, contested_resources, average_contention, maximum_contention
        ]
        return features

# ===============================
# 2. Data Generation
# ===============================
def generate_dataset(n_samples=1000):
    X, y = [], []
    for _ in range(n_samples):
        rag = ResourceAllocationGraph()
        # Create a random number of processes and resources
        n_proc = random.randint(2, 10)
        n_res = random.randint(1, 5)
        for i in range(n_proc):
            rag.add_process(f"P{i}")
        for j in range(n_res):
            instances = random.randint(1, 10)
            rag.add_resource(f"R{j}", instances)
        # Randomly assign allocations and requests
        for p in list(rag.processes):
            for r in list(rag.resources.keys()):
                if random.random() < 0.5:
                    max_alloc = rag.resources[r]['available']
                    if max_alloc > 0:
                        alloc = random.randint(1, max_alloc)
                        rag.add_allocation(p, r, alloc)
                if random.random() < 0.5:
                    req = random.randint(1, 3)
                    rag.add_request(p, r, req)
        # Label: 1 if deadlock exists, 0 otherwise
        safe, _ = rag.is_safe()
        label = 0 if safe else 1
        features = rag.extract_features()
        X.append(features)
        y.append(label)
    return X, y

# ===============================
# 3. Model: DeadlockPredictor
# ===============================
class DeadlockPredictor:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)

    def train(self, X, y):
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        self.model.fit(X_train, y_train)
        y_pred = self.model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        accuracy = accuracy_score(y_test, y_pred) * 100
        print(f"Mean Squared Error: {mse}")
        print(f"R\u00b2 Score: {r2}")
        print(f"Accuracy: {accuracy:.2f}%")

    def predict(self, X):
        return self.model.predict(X)

    def save_model(self, filename="rag_deadlock_model.joblib"):
        joblib.dump(self.model, filename)

    def load_model(self, filename="rag_deadlock_model.joblib"):
        self.model = joblib.load(filename)

# ===============================
# 4. Main Execution
# ===============================
if __name__ == "__main__":
    X, y = generate_dataset(n_samples=1000)
    predictor = DeadlockPredictor()
    predictor.train(X, y)
    predictor.save_model()
