"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { detectDeadlock } from "@/lib/deadlock-detection"

// Types for our graph
type NodeType = "process" | "resource"

interface Node {
  id: string
  type: NodeType
  x: number
  y: number
  instances?: number
}

interface Edge {
  id: string
  source: string
  target: string
  type: "request" | "allocation"
}

interface Graph {
  nodes: Node[]
  edges: Edge[]
}

export function DeadlockDetection() {
  const [algorithm, setAlgorithm] = useState<"rag" | "banker">("rag")
  const [executionSteps, setExecutionSteps] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  // Example graphs for demonstration
  const exampleGraphs: { [key: string]: Graph } = {
    noDeadlock: {
      nodes: [
        { id: "P0", type: "process", x: 100, y: 100 },
        { id: "P1", type: "process", x: 100, y: 200 },
        { id: "R0", type: "resource", x: 300, y: 100, instances: 1 },
        { id: "R1", type: "resource", x: 300, y: 200, instances: 1 },
      ],
      edges: [
        { id: "e0", source: "P0", target: "R0", type: "request" },
        { id: "e1", source: "R1", target: "P1", type: "allocation" },
      ],
    },
    simpleDeadlock: {
      nodes: [
        { id: "P0", type: "process", x: 100, y: 100 },
        { id: "P1", type: "process", x: 100, y: 300 },
        { id: "R0", type: "resource", x: 300, y: 100, instances: 1 },
        { id: "R1", type: "resource", x: 300, y: 300, instances: 1 },
      ],
      edges: [
        { id: "e0", source: "P0", target: "R1", type: "request" },
        { id: "e1", source: "R0", target: "P0", type: "allocation" },
        { id: "e2", source: "P1", target: "R0", type: "request" },
        { id: "e3", source: "R1", target: "P1", type: "allocation" },
      ],
    },
    complexDeadlock: {
      nodes: [
        { id: "P0", type: "process", x: 100, y: 100 },
        { id: "P1", type: "process", x: 100, y: 200 },
        { id: "P2", type: "process", x: 100, y: 300 },
        { id: "P3", type: "process", x: 100, y: 400 },
        { id: "R0", type: "resource", x: 300, y: 100, instances: 1 },
        { id: "R1", type: "resource", x: 300, y: 200, instances: 1 },
        { id: "R2", type: "resource", x: 300, y: 300, instances: 1 },
        { id: "R3", type: "resource", x: 300, y: 400, instances: 1 },
      ],
      edges: [
        { id: "e0", source: "P0", target: "R1", type: "request" },
        { id: "e1", source: "R0", target: "P0", type: "allocation" },
        { id: "e2", source: "P1", target: "R2", type: "request" },
        { id: "e3", source: "R1", target: "P1", type: "allocation" },
        { id: "e4", source: "P2", target: "R3", type: "request" },
        { id: "e5", source: "R2", target: "P2", type: "allocation" },
        { id: "e6", source: "P3", target: "R0", type: "request" },
        { id: "e7", source: "R3", target: "P3", type: "allocation" },
      ],
    },
    multipleInstances: {
      nodes: [
        { id: "P0", type: "process", x: 100, y: 100 },
        { id: "P1", type: "process", x: 100, y: 200 },
        { id: "P2", type: "process", x: 100, y: 300 },
        { id: "R0", type: "resource", x: 300, y: 100, instances: 2 },
        { id: "R1", type: "resource", x: 300, y: 200, instances: 2 },
        { id: "R2", type: "resource", x: 300, y: 300, instances: 1 },
      ],
      edges: [
        { id: "e0", source: "P0", target: "R0", type: "request" },
        { id: "e1", source: "R1", target: "P0", type: "allocation" },
        { id: "e2", source: "P1", target: "R1", type: "request" },
        { id: "e3", source: "R0", target: "P1", type: "allocation" },
        { id: "e4", source: "P2", target: "R2", type: "request" },
        { id: "e5", source: "R2", target: "P2", type: "allocation" },
        { id: "e6", source: "P2", target: "R0", type: "request" },
      ],
    },
  }

  const runRAGDetection = (graph: Graph) => {
    const steps: string[] = []

    steps.push("Starting Resource Allocation Graph deadlock detection algorithm...")
    steps.push("Step 1: Identify all processes and resources in the system.")

    const processes = graph.nodes.filter((node) => node.type === "process")
    const resources = graph.nodes.filter((node) => node.type === "resource")

    steps.push(`Found ${processes.length} processes: ${processes.map((p) => p.id).join(", ")}`)
    steps.push(`Found ${resources.length} resources: ${resources.map((r) => r.id).join(", ")}`)

    steps.push("Step 2: Build the resource allocation graph.")

    const requestEdges = graph.edges.filter((edge) => edge.type === "request")
    const allocationEdges = graph.edges.filter((edge) => edge.type === "allocation")

    steps.push(
      `Found ${requestEdges.length} request edges: ${requestEdges.map((e) => `${e.source} → ${e.target}`).join(", ")}`,
    )
    steps.push(
      `Found ${allocationEdges.length} allocation edges: ${allocationEdges.map((e) => `${e.source} → ${e.target}`).join(", ")}`,
    )

    steps.push("Step 3: Check for cycles in the graph.")

    const { hasDeadlock, cycle } = detectDeadlock(graph)

    if (hasDeadlock) {
      steps.push(`Cycle detected: ${cycle.join(" → ")}`)
      steps.push("Step 4: Determine if deadlock exists.")

      // Check if all resources in the cycle have only one instance
      const resourcesInCycle = cycle.filter((id) => id.startsWith("R"))
      const singleInstanceResources = resourcesInCycle.filter((id) => {
        const resource = graph.nodes.find((node) => node.id === id)
        return resource && (resource.instances === undefined || resource.instances === 1)
      })

      if (singleInstanceResources.length === resourcesInCycle.length) {
        steps.push("All resources in the cycle have only one instance.")
        steps.push("RESULT: Deadlock detected! The system is in a deadlock state.")
      } else {
        steps.push("Some resources in the cycle have multiple instances.")
        steps.push("Further analysis with Banker's Algorithm is needed to determine if deadlock exists.")
        steps.push("RESULT: Potential deadlock detected. Use Banker's Algorithm for confirmation.")
      }
    } else {
      steps.push("No cycles detected in the graph.")
      steps.push("RESULT: No deadlock exists in the system.")
    }

    setExecutionSteps(steps)
    setCurrentStep(0)
  }

  const runBankersAlgorithm = (graph: Graph) => {
    const steps: string[] = []

    steps.push("Starting Banker's Algorithm for deadlock detection...")
    steps.push("Step 1: Identify all processes and resources in the system.")

    const processes = graph.nodes.filter((node) => node.type === "process")
    const resources = graph.nodes.filter((node) => node.type === "resource")

    steps.push(`Found ${processes.length} processes: ${processes.map((p) => p.id).join(", ")}`)
    steps.push(`Found ${resources.length} resources: ${resources.map((r) => r.id).join(", ")}`)

    steps.push("Step 2: Calculate the Available, Allocation, and Need matrices.")

    // Calculate Available resources
    const available: { [key: string]: number } = {}
    resources.forEach((resource) => {
      const allocated = graph.edges.filter((edge) => edge.type === "allocation" && edge.source === resource.id).length

      available[resource.id] = (resource.instances || 1) - allocated
    })

    steps.push("Available resources:")
    steps.push(
      Object.entries(available)
        .map(([id, count]) => `${id}: ${count}`)
        .join(", "),
    )

    // Calculate Allocation matrix
    steps.push("Allocation matrix (what each process currently has):")
    processes.forEach((process) => {
      const allocated = resources.map((resource) => {
        const hasAllocation = graph.edges.some(
          (edge) => edge.type === "allocation" && edge.source === resource.id && edge.target === process.id,
        )
        return hasAllocation ? 1 : 0
      })

      steps.push(`${process.id}: ${allocated.join(", ")}`)
    })

    // Calculate Need matrix
    steps.push("Need matrix (what each process may still request):")
    processes.forEach((process) => {
      const needs = resources.map((resource) => {
        const hasRequest = graph.edges.some(
          (edge) => edge.type === "request" && edge.source === process.id && edge.target === resource.id,
        )
        return hasRequest ? 1 : 0
      })

      steps.push(`${process.id}: ${needs.join(", ")}`)
    })

    steps.push("Step 3: Find a safe sequence (if one exists).")

    // Simulate Banker's Algorithm
    const work = { ...available }
    const finish: { [key: string]: boolean } = {}
    processes.forEach((process) => {
      finish[process.id] = false
    })

    const safeSequence: string[] = []
    let progress = true

    while (progress) {
      progress = false

      for (const process of processes) {
        if (finish[process.id]) continue

        // Check if this process can be completed
        let canComplete = true
        for (const resource of resources) {
          const hasRequest = graph.edges.some(
            (edge) => edge.type === "request" && edge.source === process.id && edge.target === resource.id,
          )

          if (hasRequest && work[resource.id] < 1) {
            canComplete = false
            break
          }
        }

        if (canComplete) {
          steps.push(`Process ${process.id} can complete. Adding to safe sequence.`)

          // Mark as finished and release resources
          finish[process.id] = true
          safeSequence.push(process.id)

          // Release allocated resources
          for (const resource of resources) {
            const hasAllocation = graph.edges.some(
              (edge) => edge.type === "allocation" && edge.source === resource.id && edge.target === process.id,
            )

            if (hasAllocation) {
              work[resource.id]++
              steps.push(`Resource ${resource.id} released. Available: ${work[resource.id]}`)
            }
          }

          progress = true
        }
      }
    }

    // Check if all processes are finished
    const allFinished = Object.values(finish).every((f) => f)

    if (allFinished) {
      steps.push(`Safe sequence found: ${safeSequence.join(" → ")}`)
      steps.push("RESULT: The system is in a safe state. No deadlock exists.")
    } else {
      const deadlockedProcesses = processes.filter((process) => !finish[process.id]).map((process) => process.id)

      steps.push(`No safe sequence exists. Deadlocked processes: ${deadlockedProcesses.join(", ")}`)
      steps.push("RESULT: The system is in an unsafe state. Deadlock detected!")
    }

    setExecutionSteps(steps)
    setCurrentStep(0)
  }

  const runAlgorithm = (graphKey: string) => {
    setIsRunning(true)
    const graph = exampleGraphs[graphKey]

    if (algorithm === "rag") {
      runRAGDetection(graph)
    } else {
      runBankersAlgorithm(graph)
    }
  }

  const handleNextStep = () => {
    if (currentStep < executionSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setIsRunning(false)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deadlock Detection Algorithms</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={algorithm} onValueChange={(value) => setAlgorithm(value as "rag" | "banker")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rag">Resource Allocation Graph</TabsTrigger>
              <TabsTrigger value="banker">Banker's Algorithm</TabsTrigger>
            </TabsList>
            <TabsContent value="rag" className="mt-4">
              <p className="mb-4">
                The Resource Allocation Graph (RAG) algorithm detects deadlocks by finding cycles in the graph. If a
                cycle exists and all resources have only one instance, a deadlock is present.
              </p>
              <Alert className="mb-4">
                <AlertDescription>
                  <strong>Key Insight:</strong> A cycle in the RAG is a necessary but not always sufficient condition
                  for deadlock.
                </AlertDescription>
              </Alert>
            </TabsContent>
            <TabsContent value="banker" className="mt-4">
              <p className="mb-4">
                Banker's Algorithm determines if a system is in a safe state by simulating resource allocation and
                checking if all processes can complete. If no safe sequence exists, the system is deadlocked.
              </p>
              <Alert className="mb-4">
                <AlertDescription>
                  <strong>Key Insight:</strong> Banker's Algorithm is more comprehensive but requires knowledge of
                  maximum resource needs.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-medium">Example Scenarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={() => runAlgorithm("noDeadlock")}>No Deadlock Example</Button>
              <Button onClick={() => runAlgorithm("simpleDeadlock")}>Simple Deadlock Example</Button>
              <Button onClick={() => runAlgorithm("complexDeadlock")}>Complex Deadlock Example</Button>
              <Button onClick={() => runAlgorithm("multipleInstances")}>Multiple Resource Instances</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {executionSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Algorithm Execution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md p-4 bg-black text-white font-mono text-sm h-[300px] overflow-y-auto">
              {executionSteps.slice(0, currentStep + 1).map((step, index) => (
                <div key={index} className="mb-2">
                  {step}
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={handlePrevStep} disabled={currentStep === 0}>
                Previous Step
              </Button>

              <div className="text-center">
                Step {currentStep + 1} of {executionSteps.length}
              </div>

              <Button
                variant={currentStep < executionSteps.length - 1 ? "default" : "outline"}
                onClick={handleNextStep}
                disabled={currentStep >= executionSteps.length - 1 && !isRunning}
              >
                {currentStep < executionSteps.length - 1 ? "Next Step" : "Finish"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

