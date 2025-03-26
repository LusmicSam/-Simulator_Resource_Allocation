"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { PlusCircle, Trash2, Save, Download, Play, Pause, RotateCcw, AlertCircle, Undo, Redo } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { apiBaseUrl } from "@/lib/api-config"
import { toast } from "@/components/ui/use-toast"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUndoRedo } from "@/hooks/use-undo-redo"

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

interface DeadlockInfo {
  hasDeadlock: boolean
  cycle: string[]
  explanation: string
}

interface MLPrediction {
  deadlockProbability: number
  features: {
    processCount: number
    resourceCount: number
    requestEdgeCount: number
    allocationEdgeCount: number
    resourceUtilization: number
    cycleCount: number
  }
  explanation: string
}

export function ResourceAllocationGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [] })
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [mode, setMode] = useState<"select" | "addProcess" | "addResource" | "addEdge">("select")
  const [edgeType, setEdgeType] = useState<"request" | "allocation">("request")
  const [edgeStart, setEdgeStart] = useState<Node | null>(null)
  const [processCount, setProcessCount] = useState(0)
  const [resourceCount, setResourceCount] = useState(0)
  const [deadlockInfo, setDeadlockInfo] = useState<DeadlockInfo | null>(null)
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedNode, setDraggedNode] = useState<Node | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationSpeed, setSimulationSpeed] = useState(1000) // ms
  const [simulationStep, setSimulationStep] = useState(0)
  const [simulationHistory, setSimulationHistory] = useState<Graph[]>([])
  const [showGrid, setShowGrid] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeadlockDialog, setShowDeadlockDialog] = useState(false)
  const [showMlDialog, setShowMlDialog] = useState(false)
  const [stepByStepMode, setStepByStepMode] = useState(false)
  const [steps, setSteps] = useState<{ description: string; graph: Graph }[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // Use the undo/redo custom hook
  const {
    state: undoRedoState,
    setState: setUndoRedoState,
    index: undoRedoIndex,
    history: undoRedoHistory,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useUndoRedo<Graph>({ nodes: [], edges: [] })

  // Sync graph with undo/redo state
  useEffect(() => {
    setGraph(undoRedoState)
  }, [undoRedoState])

  // Initialize with a simple example
  useEffect(() => {
    const initialGraph: Graph = {
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
    }

    setGraph(initialGraph)
    setUndoRedoState(initialGraph)
    setProcessCount(2)
    setResourceCount(2)
    setSimulationHistory([initialGraph])

    // Check for deadlocks in the initial graph
    detectDeadlock(initialGraph)
    predictDeadlock(initialGraph)

    // Initialize step-by-step mode with this graph
    setSteps([
      {
        description: "Initial graph setup with two processes and two resources",
        graph: initialGraph,
      },
    ])
  }, [])

  // Draw the graph on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = "#e5e7eb"
      ctx.lineWidth = 0.5

      // Draw vertical lines
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      // Draw horizontal lines
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
    }

    // Draw edges
    graph.edges.forEach((edge) => {
      const sourceNode = graph.nodes.find((n) => n.id === edge.source)
      const targetNode = graph.nodes.find((n) => n.id === edge.target)

      if (sourceNode && targetNode) {
        ctx.beginPath()
        ctx.moveTo(sourceNode.x, sourceNode.y)
        ctx.lineTo(targetNode.x, targetNode.y)

        // Style based on edge type
        if (edge.type === "request") {
          ctx.strokeStyle = "#3b82f6" // Blue for request
        } else {
          ctx.strokeStyle = "#10b981" // Green for allocation
        }

        // Highlight selected edge
        if (selectedEdge && selectedEdge.id === edge.id) {
          ctx.lineWidth = 3
        } else {
          ctx.lineWidth = 2
        }

        ctx.stroke()

        // Draw arrowhead
        const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x)
        const arrowSize = 10

        ctx.beginPath()
        ctx.moveTo(
          targetNode.x - arrowSize * Math.cos(angle - Math.PI / 6),
          targetNode.y - arrowSize * Math.sin(angle - Math.PI / 6),
        )
        ctx.lineTo(targetNode.x, targetNode.y)
        ctx.lineTo(
          targetNode.x - arrowSize * Math.cos(angle + Math.PI / 6),
          targetNode.y - arrowSize * Math.sin(angle + Math.PI / 6),
        )
        ctx.fillStyle = edge.type === "request" ? "#3b82f6" : "#10b981"
        ctx.fill()
      }
    })

    // Draw nodes
    graph.nodes.forEach((node) => {
      ctx.beginPath()

      // Check if this node is part of a deadlock cycle
      const isInDeadlockCycle = deadlockInfo?.hasDeadlock && deadlockInfo.cycle.includes(node.id)

      if (node.type === "process") {
        ctx.arc(node.x, node.y, 25, 0, 2 * Math.PI)
        if (isInDeadlockCycle) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.2)" // Light red for deadlock
          ctx.strokeStyle = "#ef4444" // Red border
        } else {
          ctx.fillStyle = "rgba(59, 130, 246, 0.1)" // Light blue
          ctx.strokeStyle = "#3b82f6" // Blue border
        }
      } else {
        // Draw a square for resources
        ctx.rect(node.x - 20, node.y - 20, 40, 40)
        if (isInDeadlockCycle) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.2)" // Light red for deadlock
          ctx.strokeStyle = "#ef4444" // Red border
        } else {
          ctx.fillStyle = "rgba(16, 185, 129, 0.1)" // Light green
          ctx.strokeStyle = "#10b981" // Green border
        }
      }

      // Highlight selected node
      if (selectedNode && selectedNode.id === node.id) {
        ctx.lineWidth = 3
      } else {
        ctx.lineWidth = 2
      }

      ctx.fill()
      ctx.stroke()

      // Draw node label
      ctx.fillStyle = "#000"
      ctx.font = "14px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(node.id, node.x, node.y)

      // Draw instances for resources
      if (node.type === "resource" && node.instances && node.instances > 1) {
        ctx.font = "12px Arial"
        ctx.fillText(`(${node.instances})`, node.x, node.y + 20)
      }
    })

    // Draw edge being created
    if (mode === "addEdge" && edgeStart) {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = Math.max(0, Math.min(canvas.width, edgeStart.x))
      const mouseY = Math.max(0, Math.min(canvas.height, edgeStart.y))

      ctx.beginPath()
      ctx.moveTo(edgeStart.x, edgeStart.y)
      ctx.lineTo(mouseX, mouseY)
      ctx.strokeStyle = edgeType === "request" ? "#3b82f6" : "#10b981"
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [graph, selectedNode, selectedEdge, mode, edgeStart, edgeType, deadlockInfo, showGrid])

  // Update the graph with a new state and add to undo/redo history
  const updateGraph = (newGraph: Graph, addToHistory = true) => {
    setGraph(newGraph)
    if (addToHistory) {
      setUndoRedoState(newGraph)
    }
  }

  // Add a step to the step-by-step mode
  const addStep = (description: string, newGraph: Graph) => {
    const newSteps = [...steps, { description, graph: newGraph }]
    setSteps(newSteps)
    setCurrentStepIndex(newSteps.length - 1)
  }

  // Handle canvas mouse events
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Handle different modes
    if (mode === "addProcess") {
      const newProcess: Node = {
        id: `P${processCount}`,
        type: "process",
        x,
        y,
      }
      const newGraph = {
        ...graph,
        nodes: [...graph.nodes, newProcess],
      }

      updateGraph(newGraph)
      setProcessCount((prev) => prev + 1)
      setMode("select") // Switch back to select mode

      // Update simulation history
      setSimulationHistory((prev) => [...prev, newGraph])
      setSimulationStep(simulationHistory.length)

      // Add step for step-by-step mode
      addStep(`Added process P${processCount}`, newGraph)

      // Check for deadlocks
      detectDeadlock(newGraph)
      predictDeadlock(newGraph)
    } else if (mode === "addResource") {
      const newResource: Node = {
        id: `R${resourceCount}`,
        type: "resource",
        x,
        y,
        instances: 1,
      }
      const newGraph = {
        ...graph,
        nodes: [...graph.nodes, newResource],
      }

      updateGraph(newGraph)
      setResourceCount((prev) => prev + 1)
      setMode("select") // Switch back to select mode

      // Update simulation history
      setSimulationHistory((prev) => [...prev, newGraph])
      setSimulationStep(simulationHistory.length)

      // Add step for step-by-step mode
      addStep(`Added resource R${resourceCount} with 1 instance`, newGraph)

      // Check for deadlocks
      detectDeadlock(newGraph)
      predictDeadlock(newGraph)
    } else if (mode === "select") {
      // Check if we clicked on a node
      const clickedNode = graph.nodes.find((node) => {
        if (node.type === "process") {
          return Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2) <= 25
        } else {
          return x >= node.x - 20 && x <= node.x + 20 && y >= node.y - 20 && y <= node.y + 20
        }
      })

      if (clickedNode) {
        setSelectedNode(clickedNode)
        setSelectedEdge(null)
        setIsDragging(true)
        setDraggedNode(clickedNode)
        setDragOffset({ x: x - clickedNode.x, y: y - clickedNode.y })
      } else {
        // Check if we clicked on an edge
        const clickedEdge = graph.edges.find((edge) => {
          const sourceNode = graph.nodes.find((n) => n.id === edge.source)
          const targetNode = graph.nodes.find((n) => n.id === edge.target)

          if (!sourceNode || !targetNode) return false

          // Calculate distance from point to line
          const A = x - sourceNode.x
          const B = y - sourceNode.y
          const C = targetNode.x - sourceNode.x
          const D = targetNode.y - sourceNode.y

          const dot = A * C + B * D
          const lenSq = C * C + D * D
          let param = -1

          if (lenSq !== 0) param = dot / lenSq

          let xx, yy

          if (param < 0) {
            xx = sourceNode.x
            yy = sourceNode.y
          } else if (param > 1) {
            xx = targetNode.x
            yy = targetNode.y
          } else {
            xx = sourceNode.x + param * C
            yy = sourceNode.y + param * D
          }

          const dx = x - xx
          const dy = y - yy
          const distance = Math.sqrt(dx * dx + dy * dy)

          return distance < 10 // Threshold for edge selection
        })

        if (clickedEdge) {
          setSelectedEdge(clickedEdge)
          setSelectedNode(null)
        } else {
          setSelectedNode(null)
          setSelectedEdge(null)
        }
      }
    } else if (mode === "addEdge") {
      // Check if we clicked on a node to start the edge
      const clickedNode = graph.nodes.find((node) => {
        if (node.type === "process") {
          return Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2) <= 25
        } else {
          return x >= node.x - 20 && x <= node.x + 20 && y >= node.y - 20 && y <= node.y + 20
        }
      })

      if (clickedNode) {
        if (!edgeStart) {
          // First node clicked - check if it's valid for the edge type
          if (
            (edgeType === "request" && clickedNode.type === "process") ||
            (edgeType === "allocation" && clickedNode.type === "resource")
          ) {
            setEdgeStart(clickedNode)
          }
        } else {
          // Second node clicked - complete the edge if valid
          if (
            (edgeType === "request" && clickedNode.type === "resource") ||
            (edgeType === "allocation" && clickedNode.type === "process")
          ) {
            const newEdge: Edge = {
              id: `e${graph.edges.length}`,
              source: edgeStart.id,
              target: clickedNode.id,
              type: edgeType,
            }

            // Check if this edge already exists
            const edgeExists = graph.edges.some(
              (e) => e.source === newEdge.source && e.target === newEdge.target && e.type === newEdge.type,
            )

            if (!edgeExists) {
              const newGraph = {
                ...graph,
                edges: [...graph.edges, newEdge],
              }

              updateGraph(newGraph)

              // Update simulation history
              setSimulationHistory((prev) => [...prev, newGraph])
              setSimulationStep(simulationHistory.length)

              // Add step for step-by-step mode
              addStep(`Added ${edgeType} edge from ${edgeStart.id} to ${clickedNode.id}`, newGraph)

              // Check for deadlocks
              detectDeadlock(newGraph)
              predictDeadlock(newGraph)
            }
          }

          setEdgeStart(null)
          setMode("select") // Switch back to select mode
        }
      }
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (isDragging && draggedNode) {
      const newX = x - dragOffset.x
      const newY = y - dragOffset.y

      const newGraph = {
        ...graph,
        nodes: graph.nodes.map((node) => (node.id === draggedNode.id ? { ...node, x: newX, y: newY } : node)),
      }

      // For dragging, we don't want to add to the undo/redo history until mouse up
      setGraph(newGraph)

      if (selectedNode && selectedNode.id === draggedNode.id) {
        setSelectedNode({ ...selectedNode, x: newX, y: newY })
      }
    }
  }

  const handleCanvasMouseUp = () => {
    if (isDragging && draggedNode) {
      // Now add the final position to the undo/redo history
      setUndoRedoState(graph)

      // Add step for step-by-step mode
      addStep(`Moved ${draggedNode.id} to a new position`, graph)

      setIsDragging(false)
      setDraggedNode(null)
    }
  }

  const handleCanvasMouseLeave = () => {
    if (isDragging) {
      // Add to undo/redo history
      setUndoRedoState(graph)

      setIsDragging(false)
      setDraggedNode(null)
    }
  }

  const handleDeleteSelected = () => {
    if (selectedNode) {
      // Delete node and all connected edges
      const newEdges = graph.edges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)

      const newGraph = {
        nodes: graph.nodes.filter((node) => node.id !== selectedNode.id),
        edges: newEdges,
      }

      updateGraph(newGraph)
      setSelectedNode(null)

      // Update simulation history
      setSimulationHistory((prev) => [...prev, newGraph])
      setSimulationStep(simulationHistory.length)

      // Add step for step-by-step mode
      addStep(`Deleted node ${selectedNode.id} and all connected edges`, newGraph)

      // Check for deadlocks
      detectDeadlock(newGraph)
      predictDeadlock(newGraph)
    } else if (selectedEdge) {
      const newGraph = {
        ...graph,
        edges: graph.edges.filter((edge) => edge.id !== selectedEdge.id),
      }

      updateGraph(newGraph)
      setSelectedEdge(null)

      // Update simulation history
      setSimulationHistory((prev) => [...prev, newGraph])
      setSimulationStep(simulationHistory.length)

      // Add step for step-by-step mode
      addStep(`Deleted edge ${selectedEdge.id}`, newGraph)

      // Check for deadlocks
      detectDeadlock(newGraph)
      predictDeadlock(newGraph)
    }
  }

  const handleIncreaseInstances = () => {
    if (selectedNode && selectedNode.type === "resource") {
      const newGraph = {
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.id === selectedNode.id ? { ...node, instances: (node.instances || 1) + 1 } : node,
        ),
      }

      updateGraph(newGraph)
      setSelectedNode({ ...selectedNode, instances: (selectedNode.instances || 1) + 1 })

      // Update simulation history
      setSimulationHistory((prev) => [...prev, newGraph])
      setSimulationStep(simulationHistory.length)

      // Add step for step-by-step mode
      addStep(`Increased instances of ${selectedNode.id} to ${(selectedNode.instances || 1) + 1}`, newGraph)

      // Check for deadlocks
      detectDeadlock(newGraph)
      predictDeadlock(newGraph)
    }
  }

  const handleDecreaseInstances = () => {
    if (selectedNode && selectedNode.type === "resource" && (selectedNode.instances || 1) > 1) {
      const newGraph = {
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.id === selectedNode.id ? { ...node, instances: (node.instances || 1) - 1 } : node,
        ),
      }

      updateGraph(newGraph)
      setSelectedNode({ ...selectedNode, instances: (selectedNode.instances || 1) - 1 })

      // Update simulation history
      setSimulationHistory((prev) => [...prev, newGraph])
      setSimulationStep(simulationHistory.length)

      // Add step for step-by-step mode
      addStep(`Decreased instances of ${selectedNode.id} to ${(selectedNode.instances || 1) - 1}`, newGraph)

      // Check for deadlocks
      detectDeadlock(newGraph)
      predictDeadlock(newGraph)
    }
  }

  const handleReset = () => {
    // Reset to initial state
    const initialGraph: Graph = {
      nodes: [],
      edges: [],
    }

    updateGraph(initialGraph)
    setSelectedNode(null)
    setSelectedEdge(null)
    setProcessCount(0)
    setResourceCount(0)
    setDeadlockInfo(null)
    setMlPrediction(null)
    setSimulationHistory([initialGraph])
    setSimulationStep(0)
    setIsSimulating(false)

    // Reset step-by-step mode
    setSteps([{ description: "Reset graph", graph: initialGraph }])
    setCurrentStepIndex(0)

    toast({
      title: "Graph Reset",
      description: "The resource allocation graph has been reset.",
    })
  }

  const handleSaveGraph = () => {
    const graphData = JSON.stringify(graph)
    const blob = new Blob([graphData], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "resource-allocation-graph.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Graph Saved",
      description: "The resource allocation graph has been saved to a JSON file.",
    })
  }

  const handleLoadGraph = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const loadedGraph = JSON.parse(event.target?.result as string) as Graph

        // Update process and resource counts
        const maxProcessId = Math.max(
          ...loadedGraph.nodes
            .filter((node) => node.type === "process")
            .map((node) => Number.parseInt(node.id.substring(1))),
          -1,
        )

        const maxResourceId = Math.max(
          ...loadedGraph.nodes
            .filter((node) => node.type === "resource")
            .map((node) => Number.parseInt(node.id.substring(1))),
          -1,
        )

        setProcessCount(maxProcessId + 1)
        setResourceCount(maxResourceId + 1)

        // Update the graph
        updateGraph(loadedGraph)

        // Reset simulation
        setSimulationHistory([loadedGraph])
        setSimulationStep(0)

        // Reset step-by-step mode
        setSteps([{ description: "Loaded graph from file", graph: loadedGraph }])
        setCurrentStepIndex(0)

        // Check for deadlocks
        detectDeadlock(loadedGraph)
        predictDeadlock(loadedGraph)

        toast({
          title: "Graph Loaded",
          description: "The resource allocation graph has been loaded successfully.",
        })
      } catch (error) {
        console.error("Error loading graph:", error)
        toast({
          title: "Error Loading Graph",
          description: "Failed to load the graph. Make sure the file is valid.",
          variant: "destructive",
        })
      }
    }

    reader.readAsText(file)
  }

  // Simulation controls
  const handleStartSimulation = () => {
    setIsSimulating(true)
  }

  const handleStopSimulation = () => {
    setIsSimulating(false)
  }

  const handlePrevStep = () => {
    if (simulationStep > 0) {
      const prevStep = simulationStep - 1
      setSimulationStep(prevStep)
      setGraph(simulationHistory[prevStep])

      // Check for deadlocks
      detectDeadlock(simulationHistory[prevStep])
      predictDeadlock(simulationHistory[prevStep])
    }
  }

  const handleNextStep = () => {
    if (simulationStep < simulationHistory.length - 1) {
      const nextStep = simulationStep + 1
      setSimulationStep(nextStep)
      setGraph(simulationHistory[nextStep])

      // Check for deadlocks
      detectDeadlock(simulationHistory[nextStep])
      predictDeadlock(simulationHistory[nextStep])
    }
  }

  // Step-by-step controls
  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
      setGraph(steps[currentStepIndex - 1].graph)

      // Check for deadlocks
      detectDeadlock(steps[currentStepIndex - 1].graph)
      predictDeadlock(steps[currentStepIndex - 1].graph)
    }
  }

  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
      setGraph(steps[currentStepIndex + 1].graph)

      // Check for deadlocks
      detectDeadlock(steps[currentStepIndex + 1].graph)
      predictDeadlock(steps[currentStepIndex + 1].graph)
    }
  }

  // Auto-advance simulation
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isSimulating) {
      interval = setInterval(() => {
        if (simulationStep < simulationHistory.length - 1) {
          const nextStep = simulationStep + 1
          setSimulationStep(nextStep)
          setGraph(simulationHistory[nextStep])

          // Check for deadlocks
          detectDeadlock(simulationHistory[nextStep])
          predictDeadlock(simulationHistory[nextStep])
        } else {
          setIsSimulating(false)
        }
      }, simulationSpeed)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isSimulating, simulationStep, simulationHistory, simulationSpeed])

  // Call Python backend for deadlock detection
  const detectDeadlock = async (graphData: Graph) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${apiBaseUrl}/detect-deadlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(graphData),
      })

      if (!response.ok) {
        throw new Error("Failed to detect deadlock")
      }

      const data = await response.json()
      setDeadlockInfo(data)

      if (data.hasDeadlock) {
        setShowDeadlockDialog(true)
      }
    } catch (error) {
      console.error("Error detecting deadlock:", error)
      toast({
        title: "Error",
        description: "Failed to detect deadlock. Check the Python backend connection.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Call Python backend for ML prediction
  const predictDeadlock = async (graphData: Graph) => {
    try {
      const response = await fetch(`${apiBaseUrl}/predict-deadlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(graphData),
      })

      if (!response.ok) {
        throw new Error("Failed to predict deadlock")
      }

      const data = await response.json()
      setMlPrediction(data)
    } catch (error) {
      console.error("Error predicting deadlock:", error)
      // Don't show toast for prediction errors to avoid too many notifications
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Resource Allocation Graph</span>
              {mlPrediction && (
                <Button
                  variant="outline"
                  onClick={() => setShowMlDialog(true)}
                  className={`text-sm ${mlPrediction.deadlockProbability > 0.7 ? "text-red-500" : mlPrediction.deadlockProbability > 0.3 ? "text-yellow-500" : "text-green-500"}`}
                >
                  Deadlock Probability: {Math.round(mlPrediction.deadlockProbability * 100)}%
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deadlockInfo?.hasDeadlock && (
              <Alert className="mb-4 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-600">Deadlock Detected</AlertTitle>
                <AlertDescription className="text-red-600">
                  Cycle: {deadlockInfo.cycle.join(" → ")}
                  <Button
                    variant="link"
                    className="text-red-600 p-0 h-auto ml-2"
                    onClick={() => setShowDeadlockDialog(true)}
                  >
                    View Details
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="relative border rounded-md overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="mb-2">Processing...</div>
                    <Progress value={45} className="w-[200px]" />
                  </div>
                </div>
              )}
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="w-full h-[500px] bg-white"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseLeave}
              />
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant={mode === "select" ? "default" : "outline"} onClick={() => setMode("select")}>
                Select
              </Button>
              <Button variant={mode === "addProcess" ? "default" : "outline"} onClick={() => setMode("addProcess")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Process
              </Button>
              <Button variant={mode === "addResource" ? "default" : "outline"} onClick={() => setMode("addResource")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Resource
              </Button>
              <Button
                variant={mode === "addEdge" ? "default" : "outline"}
                onClick={() => {
                  setMode("addEdge")
                  setEdgeStart(null)
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Edge
              </Button>

              {mode === "addEdge" && (
                <Select value={edgeType} onValueChange={(value) => setEdgeType(value as "request" | "allocation")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Edge Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="request">Request Edge</SelectItem>
                    <SelectItem value="allocation">Allocation Edge</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {selectedNode && (
                <Button variant="destructive" onClick={handleDeleteSelected}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Node
                </Button>
              )}

              {selectedEdge && (
                <Button variant="destructive" onClick={handleDeleteSelected}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Edge
                </Button>
              )}

              <Button variant="outline" onClick={undo} disabled={!canUndo}>
                <Undo className="mr-2 h-4 w-4" /> Undo
              </Button>

              <Button variant="outline" onClick={redo} disabled={!canRedo}>
                <Redo className="mr-2 h-4 w-4" /> Redo
              </Button>

              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>

              <Button variant="outline" onClick={handleSaveGraph}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>

              <div className="relative">
                <Button variant="outline" onClick={() => document.getElementById("load-graph")?.click()}>
                  <Download className="mr-2 h-4 w-4" /> Load
                </Button>
                <Input id="load-graph" type="file" accept=".json" className="hidden" onChange={handleLoadGraph} />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center mr-4">
                <Label htmlFor="step-by-step" className="mr-2">
                  Step-by-Step Mode:
                </Label>
                <Switch id="step-by-step" checked={stepByStepMode} onCheckedChange={setStepByStepMode} />
              </div>

              {stepByStepMode ? (
                <>
                  <Button variant="outline" onClick={goToPrevStep} disabled={currentStepIndex <= 0}>
                    Previous Step
                  </Button>

                  <Button variant="outline" onClick={goToNextStep} disabled={currentStepIndex >= steps.length - 1}>
                    Next Step
                  </Button>

                  <span className="text-sm ml-2">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handlePrevStep} disabled={simulationStep <= 0}>
                    Previous
                  </Button>

                  {isSimulating ? (
                    <Button variant="outline" onClick={handleStopSimulation}>
                      <Pause className="mr-2 h-4 w-4" /> Pause
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleStartSimulation} disabled={simulationHistory.length <= 1}>
                      <Play className="mr-2 h-4 w-4" /> Play
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleNextStep}
                    disabled={simulationStep >= simulationHistory.length - 1}
                  >
                    Next
                  </Button>
                </>
              )}

              <div className="flex items-center ml-4">
                <Label htmlFor="simulation-speed" className="mr-2">
                  Speed:
                </Label>
                <Select
                  value={simulationSpeed.toString()}
                  onValueChange={(value) => setSimulationSpeed(Number.parseInt(value))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Speed" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2000">Slow</SelectItem>
                    <SelectItem value="1000">Normal</SelectItem>
                    <SelectItem value="500">Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center ml-4">
                <Label htmlFor="show-grid" className="mr-2">
                  Show Grid:
                </Label>
                <Switch id="show-grid" checked={showGrid} onCheckedChange={setShowGrid} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step-by-Step Mode Timeline */}
        {stepByStepMode && (
          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Step-by-Step Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-3">
                  <div className="flex space-x-2 items-center">
                    <Slider
                      value={[currentStepIndex]}
                      max={steps.length - 1}
                      step={1}
                      onValueChange={(value) => {
                        const stepIndex = value[0]
                        setCurrentStepIndex(stepIndex)
                        setGraph(steps[stepIndex].graph)
                        detectDeadlock(steps[stepIndex].graph)
                        predictDeadlock(steps[stepIndex].graph)
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm w-16 text-right">
                      {currentStepIndex + 1}/{steps.length}
                    </span>
                  </div>

                  <ScrollArea className="h-20 border rounded-md p-2">
                    {steps.map((step, index) => (
                      <div
                        key={index}
                        className={`mb-1 p-1 text-sm rounded cursor-pointer hover:bg-gray-100 ${
                          index === currentStepIndex ? "bg-blue-100" : ""
                        }`}
                        onClick={() => {
                          setCurrentStepIndex(index)
                          setGraph(steps[index].graph)
                          detectDeadlock(steps[index].graph)
                          predictDeadlock(steps[index].graph)
                        }}
                      >
                        Step {index + 1}: {step.description}
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="node-id">Node ID</Label>
                  <Input id="node-id" value={selectedNode.id} readOnly />
                </div>
                <div>
                  <Label htmlFor="node-type">Type</Label>
                  <Input id="node-type" value={selectedNode.type} readOnly />
                </div>
                {selectedNode.type === "resource" && (
                  <div>
                    <Label htmlFor="resource-instances">Instances</Label>
                    <div className="flex items-center mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDecreaseInstances}
                        disabled={(selectedNode.instances || 1) <= 1}
                      >
                        -
                      </Button>
                      <Input
                        id="resource-instances"
                        value={selectedNode.instances || 1}
                        readOnly
                        className="mx-2 text-center"
                      />
                      <Button variant="outline" size="sm" onClick={handleIncreaseInstances}>
                        +
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="node-position">Position</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Input id="node-position-x" value={`X: ${Math.round(selectedNode.x)}`} readOnly />
                    <Input id="node-position-y" value={`Y: ${Math.round(selectedNode.y)}`} readOnly />
                  </div>
                </div>
              </div>
            ) : selectedEdge ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edge-id">Edge ID</Label>
                  <Input id="edge-id" value={selectedEdge.id} readOnly />
                </div>
                <div>
                  <Label htmlFor="edge-type">Type</Label>
                  <Input id="edge-type" value={selectedEdge.type} readOnly />
                </div>
                <div>
                  <Label htmlFor="edge-source">Source</Label>
                  <Input id="edge-source" value={selectedEdge.source} readOnly />
                </div>
                <div>
                  <Label htmlFor="edge-target">Target</Label>
                  <Input id="edge-target" value={selectedEdge.target} readOnly />
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <p>Select a node or edge to view its properties.</p>
                <p className="mt-4">Statistics:</p>
                <ul className="mt-2 space-y-1">
                  <li>Processes: {graph.nodes.filter((n) => n.type === "process").length}</li>
                  <li>Resources: {graph.nodes.filter((n) => n.type === "resource").length}</li>
                  <li>Request Edges: {graph.edges.filter((e) => e.type === "request").length}</li>
                  <li>Allocation Edges: {graph.edges.filter((e) => e.type === "allocation").length}</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deadlock Details Dialog */}
      <Dialog open={showDeadlockDialog} onOpenChange={setShowDeadlockDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Deadlock Detected</DialogTitle>
            <DialogDescription>The system is in a deadlock state. Here are the details:</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Deadlock Cycle:</h4>
              <div className="p-3 bg-red-50 rounded-md text-red-800 font-mono">{deadlockInfo?.cycle.join(" → ")}</div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Explanation:</h4>
              <p className="text-sm text-gray-700">
                {deadlockInfo?.explanation ||
                  "A deadlock occurs when a set of processes are blocked because each process is holding a resource and waiting to acquire a resource held by another process."}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Possible Solutions:</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Terminate one of the processes in the cycle</li>
                <li>Preempt resources from one of the processes</li>
                <li>Add more instances of the resources involved</li>
                <li>Redesign the resource allocation strategy</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ML Prediction Dialog */}
      <Dialog open={showMlDialog} onOpenChange={setShowMlDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Deadlock Prediction Analysis</DialogTitle>
            <DialogDescription>Machine learning model prediction based on graph features</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Deadlock Probability:</h4>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span
                      className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                        mlPrediction?.deadlockProbability || 0 > 0.7
                          ? "bg-red-200 text-red-800"
                          : mlPrediction?.deadlockProbability || 0 > 0.3
                            ? "bg-yellow-200 text-yellow-800"
                            : "bg-green-200 text-green-800"
                      }`}
                    >
                      {Math.round((mlPrediction?.deadlockProbability || 0) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                  <div
                    style={{ width: `${Math.round((mlPrediction?.deadlockProbability || 0) * 100)}%` }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                      mlPrediction?.deadlockProbability || 0 > 0.7
                        ? "bg-red-500"
                        : mlPrediction?.deadlockProbability || 0 > 0.3
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                  ></div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Graph Features:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <span className="font-medium">Processes:</span> {mlPrediction?.features.processCount || 0}
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <span className="font-medium">Resources:</span> {mlPrediction?.features.resourceCount || 0}
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <span className="font-medium">Request Edges:</span> {mlPrediction?.features.requestEdgeCount || 0}
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <span className="font-medium">Allocation Edges:</span>{" "}
                  {mlPrediction?.features.allocationEdgeCount || 0}
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <span className="font-medium">Resource Utilization:</span>{" "}
                  {Math.round((mlPrediction?.features.resourceUtilization || 0) * 100)}%
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <span className="font-medium">Cycle Count:</span> {mlPrediction?.features.cycleCount || 0}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Analysis:</h4>
              <p className="text-sm text-gray-700">
                {mlPrediction?.explanation ||
                  "The machine learning model analyzes the graph structure and resource allocation patterns to predict the likelihood of deadlock."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

