"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BankersAlgorithmDemo } from "@/components/learn/bankers-algorithm-demo"
import { toast } from "@/components/ui/use-toast"
import { apiBaseUrl } from "@/lib/api-config"

interface ExampleGraph {
  id: string
  title: string
  description: string
  imageUrl: string
  graphData: any
}

export function LearnSection() {
  const [activeTab, setActiveTab] = useState("concepts")

  const exampleGraphs: ExampleGraph[] = [
    {
      id: "simple-deadlock",
      title: "Simple Deadlock",
      description: "A classic deadlock scenario with two processes and two resources.",
      imageUrl: "/placeholder.svg?height=200&width=300",
      graphData: {
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
    },
    {
      id: "resource-hierarchy",
      title: "Resource Hierarchy",
      description: "A system with resources organized in a hierarchy to prevent deadlocks.",
      imageUrl: "/placeholder.svg?height=200&width=300",
      graphData: {
        nodes: [
          { id: "P0", type: "process", x: 100, y: 100 },
          { id: "P1", type: "process", x: 100, y: 300 },
          { id: "R0", type: "resource", x: 300, y: 100, instances: 1 },
          { id: "R1", type: "resource", x: 300, y: 200, instances: 1 },
          { id: "R2", type: "resource", x: 300, y: 300, instances: 1 },
        ],
        edges: [
          { id: "e0", source: "P0", target: "R1", type: "request" },
          { id: "e1", source: "R0", target: "P0", type: "allocation" },
          { id: "e2", source: "P1", target: "R2", type: "request" },
          { id: "e3", source: "R1", target: "P1", type: "allocation" },
        ],
      },
    },
    {
      id: "multi-instance",
      title: "Multiple Resource Instances",
      description: "A system with multiple instances of resources, demonstrating how this can prevent deadlocks.",
      imageUrl: "/placeholder.svg?height=200&width=300",
      graphData: {
        nodes: [
          { id: "P0", type: "process", x: 100, y: 100 },
          { id: "P1", type: "process", x: 100, y: 300 },
          { id: "R0", type: "resource", x: 300, y: 100, instances: 2 },
          { id: "R1", type: "resource", x: 300, y: 300, instances: 2 },
        ],
        edges: [
          { id: "e0", source: "P0", target: "R1", type: "request" },
          { id: "e1", source: "R0", target: "P0", type: "allocation" },
          { id: "e2", source: "P1", target: "R0", type: "request" },
          { id: "e3", source: "R1", target: "P1", type: "allocation" },
          { id: "e4", source: "R0", target: "P1", type: "allocation" },
        ],
      },
    },
  ]

  const handleLoadExample = async (graphData: any) => {
    try {
      const response = await fetch(`${apiBaseUrl}/save-temp-graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(graphData),
      })

      if (!response.ok) {
        throw new Error("Failed to save example graph")
      }

      toast({
        title: "Example Loaded",
        description: "The example graph has been loaded. Go to the Simulator tab to view it.",
      })
    } catch (error) {
      console.error("Error loading example:", error)
      toast({
        title: "Error",
        description: "Failed to load the example graph. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="concepts">Key Concepts</TabsTrigger>
          <TabsTrigger value="examples">Interactive Examples</TabsTrigger>
          <TabsTrigger value="bankers">Banker's Algorithm</TabsTrigger>
        </TabsList>

        <TabsContent value="concepts" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>What is a Resource Allocation Graph?</CardTitle>
                <CardDescription>Understanding the fundamental concept</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  A Resource Allocation Graph (RAG) is a directed graph used to describe the allocation of resources to
                  processes and the process requests for resources. It provides a visual way to detect deadlocks in a
                  system.
                </p>
                <p className="mb-4">
                  <strong>Components:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Processes:</strong> Represented as circles
                  </li>
                  <li>
                    <strong>Resources:</strong> Represented as squares
                  </li>
                  <li>
                    <strong>Allocation Edge:</strong> An arrow from a resource to a process, indicating the resource is
                    allocated to that process
                  </li>
                  <li>
                    <strong>Request Edge:</strong> An arrow from a process to a resource, indicating the process is
                    requesting that resource
                  </li>
                </ul>

                <div className="mt-6">
                  <img
                    src="/placeholder.svg?height=200&width=300"
                    alt="Resource Allocation Graph Components"
                    className="rounded-md border"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Diagram showing the components of a Resource Allocation Graph
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deadlock Detection</CardTitle>
                <CardDescription>How to identify deadlocks using RAGs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  A deadlock occurs when a set of processes are blocked because each process is holding a resource and
                  waiting to acquire a resource held by another process.
                </p>
                <p className="mb-4">
                  <strong>Deadlock Detection in RAGs:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>If the RAG contains no cycles, then no deadlock exists</li>
                  <li>
                    If the RAG contains a cycle AND only one instance of each resource type exists, then a deadlock
                    exists
                  </li>
                  <li>
                    If the RAG contains a cycle AND multiple instances of some resource types exist, then a deadlock may
                    or may not exist
                  </li>
                </ul>

                <div className="mt-6">
                  <img
                    src="/placeholder.svg?height=200&width=300"
                    alt="Deadlock Cycle Example"
                    className="rounded-md border"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Example of a cycle in a Resource Allocation Graph indicating a deadlock
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deadlock Prevention</CardTitle>
                <CardDescription>Strategies to prevent deadlocks</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Deadlock prevention involves designing a system in such a way that at least one of the necessary
                  conditions for deadlock is impossible to fulfill.
                </p>
                <p className="mb-4">
                  <strong>Prevention Strategies:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Mutual Exclusion:</strong> Not possible to prevent as resources are inherently non-sharable
                  </li>
                  <li>
                    <strong>Hold and Wait:</strong> Require processes to request all resources at once or release
                    current resources before requesting new ones
                  </li>
                  <li>
                    <strong>No Preemption:</strong> Allow resources to be forcibly taken from processes
                  </li>
                  <li>
                    <strong>Circular Wait:</strong> Impose a total ordering on resource types and require processes to
                    request resources in increasing order
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deadlock Avoidance</CardTitle>
                <CardDescription>Dynamic strategies to avoid deadlocks</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Deadlock avoidance requires that the operating system be given additional information in advance about
                  which resources a process will request and use during its lifetime.
                </p>
                <p className="mb-4">
                  <strong>Avoidance Algorithms:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Resource Allocation Graph Algorithm:</strong> Used when there is only one instance of each
                    resource type
                  </li>
                  <li>
                    <strong>Banker's Algorithm:</strong> Used when there are multiple instances of each resource type
                  </li>
                </ul>
                <p className="mt-4">
                  The Banker's Algorithm maintains a system in a safe state by carefully deciding whether each resource
                  request should be granted immediately or delayed.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="examples" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Interactive Examples</CardTitle>
                <CardDescription>
                  Explore these example scenarios to understand different resource allocation patterns and their
                  implications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Click on any example to load it into the simulator for hands-on exploration.</p>

                <div className="grid gap-6 md:grid-cols-3">
                  {exampleGraphs.map((example) => (
                    <Card key={example.id} className="overflow-hidden">
                      <div className="aspect-video relative">
                        <img
                          src={example.imageUrl || "/placeholder.svg"}
                          alt={example.title}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-base">{example.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <p className="text-sm text-muted-foreground mb-4">{example.description}</p>
                        <Button variant="outline" size="sm" onClick={() => handleLoadExample(example.graphData)}>
                          Load in Simulator
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common Deadlock Patterns</CardTitle>
                <CardDescription>Learn to recognize these patterns in resource allocation graphs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Circular Wait</h3>
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                      <div>
                        <img
                          src="/placeholder.svg?height=200&width=300"
                          alt="Circular Wait Pattern"
                          className="rounded-md border"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          The most common deadlock pattern is the circular wait, where each process in a set is waiting
                          for a resource held by the next process in the set. This creates a cycle in the resource
                          allocation graph.
                        </p>
                        <ul className="list-disc pl-6 mt-2 text-sm text-muted-foreground">
                          <li>Process P1 holds Resource R1 and requests Resource R2</li>
                          <li>Process P2 holds Resource R2 and requests Resource R1</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-2">Resource Competition</h3>
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                      <div>
                        <img
                          src="/placeholder.svg?height=200&width=300"
                          alt="Resource Competition Pattern"
                          className="rounded-md border"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Multiple processes competing for limited resources can lead to deadlock if resource allocation
                          is not managed properly. This is especially common when resources have only one instance.
                        </p>
                        <ul className="list-disc pl-6 mt-2 text-sm text-muted-foreground">
                          <li>Multiple processes request the same scarce resources</li>
                          <li>No process can proceed because all needed resources are not available</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-2">Incremental Resource Acquisition</h3>
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                      <div>
                        <img
                          src="/placeholder.svg?height=200&width=300"
                          alt="Incremental Resource Acquisition Pattern"
                          className="rounded-md border"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          When processes acquire resources incrementally (one at a time) rather than all at once, they
                          can create complex deadlock scenarios that are difficult to detect and resolve.
                        </p>
                        <ul className="list-disc pl-6 mt-2 text-sm text-muted-foreground">
                          <li>Processes hold some resources while requesting others</li>
                          <li>The order of resource requests creates dependencies between processes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bankers" className="mt-6">
          <BankersAlgorithmDemo />
        </TabsContent>
      </Tabs>
    </div>
  )
}

