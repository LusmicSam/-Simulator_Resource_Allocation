"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { apiBaseUrl } from "@/lib/api-config"
import { toast } from "@/components/ui/use-toast"
import { Editor } from "@monaco-editor/react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

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

interface ParserError {
  line: number
  column: number
  message: string
}

export function LanguageToGraph() {
  const [input, setInput] = useState("")
  const [graph, setGraph] = useState<Graph | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parserErrors, setParserErrors] = useState<ParserError[]>([])
  const [activeTab, setActiveTab] = useState<"editor" | "examples" | "syntax">("editor")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [editorLanguage, setEditorLanguage] = useState<"plaintext" | "javascript">("plaintext")
  const [syntaxHighlighting, setSyntaxHighlighting] = useState(true)

  const handleInputChange = (value: string | undefined) => {
    const newValue = value || ""
    setInput(newValue)
    validateSyntax(newValue)
  }

  const validateSyntax = async (text: string) => {
    if (!text.trim()) {
      setParserErrors([])
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/validate-syntax`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error("Failed to validate syntax")
      }

      const data = await response.json()
      setParserErrors(data.errors || [])
    } catch (error) {
      console.error("Error validating syntax:", error)
      // Don't set UI errors here - just log to console
    }
  }

  const handleGenerateGraph = async () => {
    if (!input.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description or use the syntax to define a graph.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/language-to-graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: input }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate graph from language")
      }

      const data = await response.json()
      setGraph(data.graph)

      toast({
        title: "Graph Generated",
        description: "The graph has been successfully generated from your description.",
      })
    } catch (error) {
      console.error("Error generating graph:", error)
      setError("Failed to generate graph. Please check your syntax and try again.")

      toast({
        title: "Error",
        description: "Failed to generate graph. Please check your syntax and try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveGraph = () => {
    if (!graph) return

    const graphData = JSON.stringify(graph)
    const blob = new Blob([graphData], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "generated-graph.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Graph Saved",
      description: "The graph has been saved to a JSON file. You can load it in the simulator tab.",
    })
  }

  const exampleDescriptions = [
    {
      title: "Simple Deadlock",
      description: `// Simple deadlock example with two processes and two resources
create_graph {
  processes = [P0, P1];
  resources = [R0(1), R1(1)]; // 1 instance each
  
  allocations {
    R0 -> P0;
    R1 -> P1;
  }
  
  requests {
    P0 -> R1;
    P1 -> R0;
  }
}`,
    },
    {
      title: "Complex System",
      description: `// Complex system with multiple resource instances
create_graph {
  processes = [P0, P1, P2, P3];
  resources = [R0(2), R1(1), R2(3)]; // Multiple instances
  
  allocations {
    R0 -> P0;
    R1 -> P1;
    R2 -> P2;
    R2 -> P3;
  }
  
  requests {
    P0 -> R1;
    P1 -> R2;
    P2 -> R0;
  }
}`,
    },
    {
      title: "Natural Language",
      description: `// Natural language description
A system has three processes (A, B, C) and two resources (printer, scanner).
Process A is using the printer and waiting for the scanner.
Process B has the scanner and is waiting for the printer.
Process C is not using any resources yet.`,
    },
  ]

  const handleUseExample = (example: string) => {
    setInput(example)
    setActiveTab("editor")
    validateSyntax(example)
  }

  useEffect(() => {
    if (graph) {
      drawGraph()
    }
  }, [graph])

  const drawGraph = () => {
    const canvas = canvasRef.current
    if (!canvas || !graph) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 0.5

    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
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

        ctx.lineWidth = 2
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

      if (node.type === "process") {
        ctx.arc(node.x, node.y, 25, 0, 2 * Math.PI)
        ctx.fillStyle = "rgba(59, 130, 246, 0.1)" // Light blue
        ctx.strokeStyle = "#3b82f6" // Blue border
      } else {
        // Draw a square for resources
        ctx.rect(node.x - 20, node.y - 20, 40, 40)
        ctx.fillStyle = "rgba(16, 185, 129, 0.1)" // Light green
        ctx.strokeStyle = "#10b981" // Green border
      }

      ctx.lineWidth = 2
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
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Language to Graph Converter</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
              <TabsTrigger value="syntax">Syntax Guide</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="mt-4">
              <div className="space-y-4">
                <div className="flex justify-end mb-2">
                  <Button variant="outline" size="sm" onClick={() => setSyntaxHighlighting(!syntaxHighlighting)}>
                    {syntaxHighlighting ? "Disable" : "Enable"} Syntax Highlighting
                  </Button>
                </div>

                <div className="border rounded-md h-[300px] overflow-hidden">
                  {syntaxHighlighting ? (
                    <Editor
                      height="300px"
                      language="javascript"
                      theme="vs-dark"
                      value={input}
                      onChange={handleInputChange}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                      }}
                    />
                  ) : (
                    <Textarea
                      placeholder="Describe your resource allocation graph here..."
                      className="h-full resize-none p-3 font-mono"
                      value={input}
                      onChange={(e) => handleInputChange(e.target.value)}
                    />
                  )}
                </div>

                {parserErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <div className="font-bold mb-1">Syntax errors:</div>
                      <ul className="list-disc pl-5">
                        {parserErrors.map((err, index) => (
                          <li key={index} className="text-sm">
                            Line {err.line}, Column {err.column}: {err.message}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center">
                  <Button onClick={handleGenerateGraph} disabled={isLoading}>
                    {isLoading ? "Generating..." : "Generate Graph"}
                  </Button>

                  {isLoading && (
                    <div className="ml-4 flex-1">
                      <Progress value={45} className="h-2" />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="examples" className="mt-4">
              <div className="space-y-4">
                {exampleDescriptions.map((example, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="p-4 pb-0">
                      <CardTitle className="text-sm font-medium">{example.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="text-sm font-mono overflow-x-auto">
                        <SyntaxHighlighter
                          language="javascript"
                          style={dracula}
                          customStyle={{ margin: 0, fontSize: "0.8rem" }}
                        >
                          {example.description}
                        </SyntaxHighlighter>
                      </div>
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2"
                        onClick={() => handleUseExample(example.description)}
                      >
                        Use this example
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="syntax" className="mt-4">
              <div className="space-y-4">
                <div className="prose max-w-none">
                  <h3 className="text-lg font-medium">RAG Language Syntax Guide</h3>
                  <p>
                    This application supports a specialized language for defining resource allocation graphs. The
                    language is designed to be both human-readable and precise.
                  </p>

                  <h4 className="font-medium mt-4">Basic Structure</h4>
                  <SyntaxHighlighter language="javascript" style={dracula} customStyle={{ fontSize: "0.85rem" }}>
                    {`create_graph {
  processes = [P0, P1, ...];
  resources = [R0(instances), R1(instances), ...];
  
  allocations {
    Resource -> Process;
    ...
  }
  
  requests {
    Process -> Resource;
    ...
  }
}`}
                  </SyntaxHighlighter>

                  <h4 className="font-medium mt-4">Processes and Resources</h4>
                  <ul className="list-disc pl-5">
                    <li>
                      Processes are defined as <code>P0</code>, <code>P1</code>, or any process identifier
                    </li>
                    <li>
                      Resources are defined as <code>R0(n)</code> where <code>n</code> is the number of instances
                    </li>
                    <li>
                      If the number of instances is omitted, it defaults to 1: <code>R0</code> = <code>R0(1)</code>
                    </li>
                  </ul>

                  <h4 className="font-medium mt-4">Allocations and Requests</h4>
                  <ul className="list-disc pl-5">
                    <li>
                      Allocations are defined as <code>Resource -&gt; Process</code>
                    </li>
                    <li>
                      Requests are defined as <code>Process -&gt; Resource</code>
                    </li>
                    <li>
                      Each statement must end with a semicolon <code>;</code>
                    </li>
                  </ul>

                  <h4 className="font-medium mt-4">Comments</h4>
                  <p>
                    You can add comments to your code using <code>//</code> for single-line comments.
                  </p>
                  <SyntaxHighlighter language="javascript" style={dracula} customStyle={{ fontSize: "0.85rem" }}>
                    {`// This is a comment
create_graph {
  processes = [P0, P1]; // Define processes
  resources = [R0(2)];  // Resource with 2 instances
}`}
                  </SyntaxHighlighter>

                  <h4 className="font-medium mt-4">Natural Language Support</h4>
                  <p>
                    The system also supports natural language descriptions. Start with plain text and the system will
                    try to extract the process and resource relationships.
                  </p>
                  <SyntaxHighlighter language="javascript" style={dracula} customStyle={{ fontSize: "0.85rem" }}>
                    {`A system has two processes (P1, P2) and two resources (printer, disk).
P1 is using the printer and waiting for the disk.
P2 is using the disk and waiting for the printer.`}
                  </SyntaxHighlighter>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {graph && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Graph</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <canvas ref={canvasRef} width={800} height={400} className="w-full h-[400px] bg-white" />
              </div>
              <div className="mt-4">
                <Button onClick={handleSaveGraph}>Save Graph</Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Save this graph as a JSON file that you can load in the simulator tab.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

