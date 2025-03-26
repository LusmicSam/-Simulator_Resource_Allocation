"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle } from "lucide-react"
import { apiBaseUrl } from "@/lib/api-config"
import { toast } from "@/components/ui/use-toast"

interface BankersState {
  processes: number
  resources: number
  available: number[]
  max: number[][]
  allocation: number[][]
  need: number[][]
}

interface BankersResult {
  isSafe: boolean
  safeSequence: number[] | null
  explanation: string[]
}

export function BankersAlgorithmDemo() {
  const [state, setState] = useState<BankersState>({
    processes: 5,
    resources: 3,
    available: [3, 3, 2],
    max: [
      [7, 5, 3],
      [3, 2, 2],
      [9, 0, 2],
      [2, 2, 2],
      [4, 3, 3]
    ],
    allocation: [
      [0, 1, 0],
      [2, 0, 0],
      [3, 0, 2],
      [2, 1, 1],
      [0, 0, 2]
    ],
    need: [
      [7, 4, 3],
      [1, 2, 2],
      [6, 0, 0],
      [0, 1, 1],
      [4, 3, 1]
    ]
  });

  const [result, setResult] = useState<BankersResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [requestProcess, setRequestProcess] = useState(0);
  const [requestResources, setRequestResources] = useState<number[]>([0, 0, 0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [visualMatrices, setVisualMatrices] = useState<{
    available: number[];
    work: number[];
    allocation: number[][];
    need: number[][];
    finish: boolean[];
    sequence: number[];
  } | null>(null);

  const handleProcessChange = (value: string) => {
    const processes = Number.parseInt(value);
    if (isNaN(processes) || processes < 1) return;

    // Resize matrices
    const newMax = Array(processes).fill(0).map((_, i) =>
      i < state.max.length ? state.max[i] : Array(state.resources).fill(0)
    );

    const newAllocation = Array(processes).fill(0).map((_, i) =>
      i < state.allocation.length ? state.allocation[i] : Array(state.resources).fill(0)
    );

    const newNeed = Array(processes).fill(0).map((_, i) => {
      if (i < state.need.length) return state.need[i];
      return Array(state.resources).fill(0);
    });

    setState({
      ...state,
      processes,
      max: newMax,
      allocation: newAllocation,
      need: newNeed
    });
  };

  const handleResourceChange = (value: string) => {
    const resources = Number.parseInt(value);
    if (isNaN(resources) || resources < 1) return;

    // Resize matrices and vectors
    const newAvailable = Array(resources).fill(0).map((_, i) =>
      i < state.available.length ? state.available[i] : 0
    );

    const newMax = state.max.map(row =>
      Array(resources).fill(0).map((_, i) => i < row.length ? row[i] : 0)
    );

    const newAllocation = state.allocation.map(row =>
      Array(resources).fill(0).map((_, i) => i < row.length ? row[i] : 0)
    );

    const newNeed = state.need.map(row =>
      Array(resources).fill(0).map((_, i) => i < row.length ? row[i] : 0)
    );

    setRequestResources(Array(resources).fill(0));

    setState({
      ...state,
      resources,
      available: newAvailable,
      max: newMax,
      allocation: newAllocation,
      need: newNeed
    });
  };

  const handleAvailableChange = (index: number, value: string) => {
    const newValue = Number.parseInt(value);
    if (isNaN(newValue) || newValue < 0) return;

    const newAvailable = [...state.available];
    newAvailable[index] = newValue;

    setState({
      ...state,
      available: newAvailable
    });
  };

  const handleMaxChange = (processIndex: number, resourceIndex: number, value: string) => {
    const newValue = Number.parseInt(value);
    if (isNaN(newValue) || newValue < 0) return;

    const newMax = [...state.max];
    newMax[processIndex] = [...newMax[processIndex]];
    newMax[processIndex][resourceIndex] = newValue;

    // Update need
    const newNeed = [...state.need];
    newNeed[processIndex] = [...newNeed[processIndex]];
    newNeed[processIndex][resourceIndex] = newValue - state.allocation[processIndex][resourceIndex];

    setState({
      ...state,
      max: newMax,
      need: newNeed
    });
  };

  const handleAllocationChange = (processIndex: number, resourceIndex: number, value: string) => {
    const newValue = Number.parseInt(value);
    if (isNaN(newValue) || newValue < 0 || newValue > state.max[processIndex][resourceIndex]) return;

    const newAllocation = [...state.allocation];
    newAllocation[processIndex] = [...newAllocation[processIndex]];
    newAllocation[processIndex][resourceIndex] = newValue;

    // Update need
    const newNeed = [...state.need];
    newNeed[processIndex] = [...newNeed[processIndex]];
    newNeed[processIndex][resourceIndex] = state.max[processIndex][resourceIndex] - newValue;

    setState({
      ...state,
      allocation: newAllocation,
      need: newNeed
    });
  };

  const handleRequestResourceChange = (index: number, value: string) => {
    const newValue = Number.parseInt(value);
    if (isNaN(newValue) || newValue < 0) return;

    const newRequestResources = [...requestResources];
    newRequestResources[index] = newValue;

    setRequestResources(newRequestResources);
  };

  const runBankersAlgorithm = async () => {
    setIsLoading(true);
    setResult(null);
    setVisualMatrices(null);

    try {
      const response = await fetch(`${apiBaseUrl}/bankers-algorithm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        throw new Error('Failed to run Banker\'s Algorithm');
      }

      const data = await response.json();
      setResult(data);

      // Initialize visualization state
      setVisualMatrices({
        available: [...state.available],
        work: [...state.available],
        allocation: JSON.parse(JSON.stringify(state.allocation)),
        need: JSON.parse(JSON.stringify(state.need)),
        finish: Array(state.processes).fill(false),
        sequence: []
      });

      setCurrentStep(0);
    } catch (error) {
      console.error('Error running Banker\'s Algorithm:', error);
      toast({
        title: "Error",
        description: "Failed to run Banker's Algorithm. Check the Python backend connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkResourceRequest = async () => {
    setIsLoading(true);
    setResult(null);
    setVisualMatrices(null);

    try {
      const response = await fetch(`${apiBaseUrl}/check-resource-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state,
          process: requestProcess,
          request: requestResources
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check resource request');
      }

      const data = await response.json();
      setResult(data);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error checking resource request:', error);
      toast({
        title: "Error",
        description: "Failed to check resource request. Check the Python backend connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = () => {
    if (result && currentStep < result.explanation.length - 1) {
      setCurrentStep(currentStep + 1);
      updateVisualization(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      updateVisualization(currentStep - 1);
    }
  };

  const updateVisualization = (step: number) => {
    if (!result || !result.explanation || !visualMatrices) return;

    // This is a simplified approach - in a real implementation, 
    // you would parse the explanation steps and update the visualization state accordingly

    // For this demo, we'll simulate the algorithm progress
    if (result.isSafe && result.safeSequence && result.safeSequence.length > 0) {
      const processCompleted = Math.min(
        Math.floor(step / 3),
        result.safeSequence.length
      );

      // Update the finish array
      const newFinish = Array(state.processes).fill(false);
      for (let i = 0; i < processCompleted; i++) {
        const processId = result.safeSequence[i];
        newFinish[processId] = true;
      }

      // Update the work vector based on completed processes
      const newWork = [...state.available];
      for (let i = 0; i < processCompleted; i++) {
        const processId = result.safeSequence[i];
        for (let j = 0; j < state.resources; j++) {
          newWork[j] += state.allocation[processId][j];
        }
      }

      // Update the sequence
      const newSequence = result.safeSequence.slice(0, processCompleted);

      setVisualMatrices({
        ...visualMatrices,
        work: newWork,
        finish: newFinish,
        sequence: newSequence
      });
    }
  };

  const startAnimation = () => {
    if (!result) return;

    setIsAnimating(true);
    setCurrentStep(0);
    updateVisualization(0);

    // Animate through all steps
    let step = 0;
    const interval = setInterval(() => {
      if (step >= result.explanation.length - 1) {
        clearInterval(interval);
        setIsAnimating(false);
        return;
      }

      step++;
      setCurrentStep(step);
      updateVisualization(step);
    }, 800);

    // Cleanup on component unmount
    return () => clearInterval(interval);
  };

  const loadExample = (example: "safe" | "unsafe") => {
    if (example === "safe") {
      setState({
        processes: 5,
        resources: 3,
        available: [3, 3, 2],
        max: [
          [7, 5, 3],
          [3, 2, 2],
          [9, 0, 2],
          [2, 2, 2],
          [4, 3, 3]
        ],
        allocation: [
          [0, 1, 0],
          [2, 0, 0],
          [3, 0, 2],
          [2, 1, 1],
          [0, 0, 2]
        ],
        need: [
          [7, 4, 3],
          [1, 2, 2],
          [6, 0, 0],
          [0, 1, 1],
          [4, 3, 1]
        ]
      });
    } else {
      setState({
        processes: 5,
        resources: 3,
        available: [1, 1, 2],
        max: [
          [7, 5, 3],
          [3, 2, 2],
          [9, 0, 2],
          [2, 2, 2],
          [4, 3, 3]
        ],
        allocation: [
          [2, 2, 1],
          [2, 0, 0],
          [3, 0, 2],
          [2, 1, 1],
          [0, 0, 2]
        ],
        need: [
          [5, 3, 2],
          [1, 2, 2],
          [6, 0, 0],
          [0, 1, 1],
          [4, 3, 1]
        ]
      });
    }

    setResult(null);
    setVisualMatrices(null);
    setCurrentStep(0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Banker's Algorithm Demonstration</CardTitle>
          <CardDescription>
            Explore how the Banker's Algorithm works for deadlock avoidance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none mb-6">
            <p>
              The Banker's Algorithm is a resource allocation and deadlock avoidance algorithm that tests for safety by simulating the allocation of maximum possible resources to all processes.
            </p>
            <p>
              It maintains the system in a safe state by ensuring that there are enough resources to satisfy all processes. A system is in a safe state if there exists a sequence of processes such that each process can be allocated its maximum resources and still complete.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Button variant="outline" onClick={() => loadExample("safe")}>
              Load Safe Example
            </Button>
            <Button variant="outline" onClick={() => loadExample("unsafe")}>
              Load Unsafe Example
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium mb-4">System Configuration</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="processes">Number of Processes</Label>
                  <Input
                    id="processes"
                    type="number"
                    min="1"
                    value={state.processes}
                    onChange={(e) => handleProcessChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="resources">Number of Resources</Label>
                  <Input
                    id="resources"
                    type="number"
                    min="1"
                    value={state.resources}
                    onChange={(e) => handleResourceChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <Label>Available Resources</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {state.available.map((value, index) => (
                    <div key={`available-${index}`}>
                      <Label htmlFor={`available-${index}`} className="text-xs">Resource {index}</Label>
                      <Input
                        id={`available-${index}`}
                        type="number"
                        min="0"
                        value={value}
                        onChange={(e) => handleAvailableChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <Label>Resource Request Simulation</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="request-process" className="text-xs">Process ID</Label>
                    <Input
                      id="request-process"
                      type="number"
                      min="0"
                      max={state.processes - 1}
                      value={requestProcess}
                      onChange={(e) => setRequestProcess(Number.parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Button
                      className="mt-6"
                      onClick={checkResourceRequest}
                      disabled={isLoading}
                    >
                      Check Request
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {requestResources.map((value, index) => (
                    <div key={`request-${index}`}>
                      <Label htmlFor={`request-${index}`} className="text-xs">Resource {index}</Label>
                      <Input
                        id={`request-${index}`}
                        type="number"
                        min="0"
                        value={value}
                        onChange={(e) => handleRequestResourceChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={runBankersAlgorithm}
                disabled={isLoading}
                className="w-full"
              >
                Run Banker's Algorithm
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Resource Allocation Tables</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Maximum Resource Needs</h4>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Process</TableHead>
                          {Array.from({ length: state.resources }).map((_, i) => (
                            <TableHead key={`max-header-${i}`}>R{i}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {state.max.map((row, processIndex) => (
                          <TableRow key={`max-row-${processIndex}`}>
                            <TableCell>P{processIndex}</TableCell>
                            {row.map((value, resourceIndex) => (
                              <TableCell key={`max-${processIndex}-${resourceIndex}`}>
                                <Input
                                  type="number"
                                  min="0"
                                  value={value}
                                  onChange={(e) => handleMaxChange(processIndex, resourceIndex, e.target.value)}
                                  className="w-16 h-8 text-center p-1"
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Current Allocation</h4>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Process</TableHead>
                          {Array.from({ length: state.resources }).map((_, i) => (
                            <TableHead key={`allocation-header-${i}`}>R{i}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {state.allocation.map((row, processIndex) => (
                          <TableRow key={`allocation-row-${processIndex}`}>
                            <TableCell>P{processIndex}</TableCell>
                            {row.map((value, resourceIndex) => (
                              <TableCell key={`allocation-${processIndex}-${resourceIndex}`}>
                                <Input
                                  type="number"
                                  min="0"
                                  max={state.max[processIndex][resourceIndex]}
                                  value={value}
                                  onChange={(e) => handleAllocationChange(processIndex, resourceIndex, e.target.value)}
                                  className="w-16 h-8 text-center p-1"
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Remaining Need (Max - Allocation)</h4>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Process</TableHead>
                          {Array.from({ length: state.resources }).map((_, i) => (
                            <TableHead key={`need-header-${i}`}>R{i}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {state.need.map((row, processIndex) => (
                          <TableRow key={`need-row-${processIndex}`}>
                            <TableCell>P{processIndex}</TableCell>
                            {row.map((value, resourceIndex) => (
                              <TableCell key={`need-${processIndex}-${resourceIndex}`}>
                                {value}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              Algorithm Result
              {result.isSafe ? (
                <CheckCircle2 className="ml-2 h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="ml-2 h-5 w-5 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={result.isSafe ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
              <AlertTitle className={result.isSafe ? "text-green-600" : "text-red-600"}>
                {result.isSafe ? "Safe State" : "Unsafe State"}
              </AlertTitle>
              <AlertDescription className={result.isSafe ? "text-green-600" : "text-red-600"}>
                {result.isSafe
                  ? `The system is in a safe state. Safe sequence: ${result.safeSequence?.map(p => `P${p}`).join(' → ')}`
                  : "The system is in an unsafe state. No safe sequence exists."}
              </AlertDescription>
            </Alert>

            {/* Visualization of algorithm execution */}
            {visualMatrices && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Algorithm Visualization</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border rounded-md p-4">
                    <h4 className="font-medium text-sm mb-2">Work Vector</h4>
                    <div className="flex space-x-2">
                      {visualMatrices.work.map((value, index) => (
                        <div
                          key={`work-${index}`}
                          className="w-8 h-8 flex items-center justify-center border rounded-md bg-blue-50"
                        >
                          {value}
                        </div>
                      ))}
                    </div>

                    <h4 className="font-medium text-sm mt-4 mb-2">Finish Vector</h4>
                    <div className="flex space-x-2">
                      {visualMatrices.finish.map((value, index) => (
                        <div
                          key={`finish-${index}`}
                          className={`w-8 h-8 flex items-center justify-center border rounded-md ${value ? 'bg-green-100 text-green-600' : 'bg-gray-100'
                            }`}
                        >
                          {value ? '✓' : '×'}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border rounded-md p-4">
                    <h4 className="font-medium text-sm mb-2">Safe Sequence</h4>
                    <div className="flex space-x-2 items-center flex-wrap">
                      {visualMatrices.sequence.length === 0 ? (
                        <span className="text-sm text-gray-500">No processes completed yet</span>
                      ) : (
                        visualMatrices.sequence.map((processId, index) => (
                          <div key={`seq-${index}`} className="flex items-center">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-600">
                              P{processId}
                            </div>
                            {index < visualMatrices.sequence.length - 1 && (
                              <span className="mx-1">→</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

        </Card>
      )}
    </div>
  );
}

