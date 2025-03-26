"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { PlusCircle, Trash2, Save, Download, Play, Pause, RotateCcw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
  const [showDeadlockAlert, setShowDeadlockAlert] = useState(false)
  const [deadlockCycle, setDeadlockCycle] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [draggedNode, setDraggedNode] = useState<Node | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationSpeed, setSimulationSpeed] = useState(1000) // ms
  const [simulationStep, setSimulationStep] = useState(0)
  const [simulationHistory, setSimulationHistory] = useState<Graph[]>([])
  const [showGrid, setShowGrid] = useState(true)

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
    setProcessCount(2)
    setResourceCount(2)
    setSimulationHistory([initialGraph])

    // Check for deadlocks in the initial graph
    const { hasDeadlock, cycle } = detectDeadlock(initialGraph)
    setShowDeadlockAlert(hasDeadlock)
    setDeadlockCycle(cycle)
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
      const isInDeadlockCycle = deadlockCycle.includes(node.id)

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
  }, [graph, selectedNode, selectedEdge, mode, edgeStart, edgeType, deadlockCycle, showGrid])

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
      setGraph((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newProcess],
      }))
      setProcessCount((prev) => prev + 1)
      setMode("select") // Switch back to select mode
    } else if (mode === "addResource") {
      const newResource: Node = {
        id: `R${resourceCount}`,
        type: "resource",
        x,
        y,
        instances: 1,
      }
      setGraph((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newResource],
      }))
      setResourceCount((prev) => prev + 1)
      setMode("select") // Switch back to select mode
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

              setGraph(newGraph)

              // Check for deadlocks
              const { hasDeadlock, cycle } = detectDeadlock(newGraph)
              setShowDeadlockAlert(hasDeadlock)
              setDeadlockCycle(cycle)

              // Add to simulation history
              setSimulationHistory((prev) => [...prev, newGraph])
              setSimulationStep((prev) => prev + 1)
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

      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) => (node.id === draggedNode.id ? { ...node, x: newX, y: newY } : node)),
      }))

      if (selectedNode && selectedNode.id === draggedNode.id) {
        setSelectedNode({ ...selectedNode, x: newX, y: newY })
      }
    }
  }

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      setDraggedNode(null)
    }
  }

  const handleCanvasMouseLeave = () => {
    if (isDragging) {
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

      setGraph(newGraph)
      setSelectedNode(null)

      // Check for deadlocks
      const { hasDeadlock, cycle } = detectDeadlock(newGraph)
      setShowDeadlockAlert(hasDeadlock)
      setDeadlockCycle(cycle)

      // Add to simulation history
      setSimulationHistory((prev) => [...prev, newGraph])
      setSimulationStep((prev) => prev + 1)
    } else if (selectedEdge) {
      const newGraph = {
        ...graph,
        edges: graph.edges.filter((edge) => edge.id !== selectedEdge.id),
      }

      setGraph(newGraph)
      setSelectedEdge(null)

      // Check for deadlocks
      const { hasDeadlock, cycle } = detectDeadlock(newGraph)
      setShowDeadlockAlert(hasDeadlock)
      setDeadlockCycle(cycle)

      // Add to simulation history
      setSimulationHistory((prev) => [...prev, newGraph])
      setSimulationStep((prev) => prev + 1)
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

      setGraph(newGraph)
      setSelectedNode({ ...selectedNode, instances: (selectedNode.instances || 1) + 1 })

      // Check for deadlocks
      const { hasDeadlock, cycle } = detectDeadlock(newGraph)
      setShowDeadlockAlert(hasDeadlock)
      setDeadlockCycle(cycle)
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

      setGraph(newGraph)
      setSelectedNode({ ...selectedNode, instances: (selectedNode.instances || 1) - 1 })

      // Check for deadlocks
      const { hasDeadlock, cycle } = detectDeadlock(newGraph)
      setShowDeadlockAlert(hasDeadlock)
      setDeadlockCycle(cycle)
    }
  }

  const handleReset = () => {
    // Reset to initial state
    const initialGraph: Graph = {
      nodes: [],
      edges: [],
    }

    setGraph(initialGraph)
    setSelectedNode(null)
    setSelectedEdge(null)
    setProcessCount(0)
    setResourceCount(0)
    setShowDeadlockAlert(false)
    setDeadlockCycle([])
    setSimulationHistory([initialGraph])
    setSimulationStep(0)
    setIsSimulating(false)
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
  }

  const handleLoadGraph = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const loadedGraph = JSON.parse(event.target?.result as string) as Graph
        setGraph(loadedGraph)

        // Update process and resource counts
        const maxProcessId = Math.max(
          ...loadedGraph.nodes
            .filter((node) => node.type === "process")
            .map((node) => Number.parseInt(node.id.substring(1))),
        )

        const maxResourceId = Math.max(
          ...loadedGraph.nodes
            .filter((node) => node.type === "resource")
            .map((node) => Number.parseInt(node.id.substring(1))),
        )

        setProcessCount(maxProcessId + 1)
        setResourceCount(maxResourceId + 1)

        // Check for deadlocks
        const { hasDeadlock, cycle } = detectDeadlock(loadedGraph)
        setShowDeadlockAlert(hasDeadlock)
        setDeadlockCycle(cycle)

        // Reset simulation
        setSimulationHistory([loadedGraph])
        setSimulationStep(0)
      } catch (error) {
        console.error("Error loading graph:", error)
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
      setSimulationStep((prev) => prev - 1)
      setGraph(simulationHistory[simulationStep - 1])

      // Check for deadlocks
      const { hasDeadlock, cycle } = detectDeadlock(simulationHistory[simulationStep - 1])
      setShowDeadlockAlert(hasDeadlock)
      setDeadlockCycle(cycle)
    }
  }

  const handleNextStep = () => {
    if (simulationStep < simulationHistory.length - 1) {
      setSimulationStep((prev) => prev + 1)
      setGraph(simulationHistory[simulationStep + 1])

      // Check for deadlocks
      const { hasDeadlock, cycle } = detectDeadlock(simulationHistory[simulationStep + 1])
      setShowDeadlockAlert(hasDeadlock)
      setDeadlockCycle(cycle)
    }
  }

  // Auto-advance simulation
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isSimulating) {
      interval = setInterval(() => {
        if (simulationStep < simulationHistory.length - 1) {
          setSimulationStep((prev) => prev + 1)
          setGraph(simulationHistory[simulationStep + 1])

          // Check for deadlocks
          const { hasDeadlock, cycle } = detectDeadlock(simulationHistory[simulationStep + 1])
          setShowDeadlockAlert(hasDeadlock)
          setDeadlockCycle(cycle)
        } else {
          setIsSimulating(false)
        }
      }, simulationSpeed)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isSimulating, simulationStep, simulationHistory, simulationSpeed])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Resource Allocation Graph</CardTitle>
          </CardHeader>
          <CardContent>
            {showDeadlockAlert && (
              <Alert className="mb-4 bg-red-50 border-red-200">
                <AlertDescription className="flex items-center text-red-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Deadlock detected! Cycle: {deadlockCycle.join(" → ")}
                </AlertDescription>
              </Alert>
            )}
            <div className="relative border rounded-md overflow-hidden">
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
    </div>
  )
}

