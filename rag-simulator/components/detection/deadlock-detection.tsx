"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

export function DeadlockDetection() {
  const [activeTab, setActiveTab] = useState("rag")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deadlock Detection Algorithms</CardTitle>
          <CardDescription>
            Learn about different algorithms used to detect deadlocks in operating systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rag">Resource Allocation Graph</TabsTrigger>
              <TabsTrigger value="bankers">Banker's Algorithm</TabsTrigger>
            </TabsList>

            <TabsContent value="rag" className="mt-6">
              <div className="space-y-4">
                <div className="prose max-w-none">
                  <h3 className="text-lg font-medium">Resource Allocation Graph Algorithm</h3>
                  <p>
                    The Resource Allocation Graph (RAG) algorithm is used to detect deadlocks in systems with a single
                    instance of each resource type. It works by analyzing the directed graph that represents resource
                    allocations and requests.
                  </p>

                  <h4 className="font-medium mt-4">How It Works</h4>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li>Represent processes as circles and resources as squares in a directed graph.</li>
                    <li>Draw an edge from a resource to a process if the resource is allocated to that process.</li>
                    <li>Draw an edge from a process to a resource if the process is requesting that resource.</li>
                    <li>Check for cycles in the graph. If a cycle exists, a deadlock is present.</li>
                  </ol>

                  <Alert className="mt-4">
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>Important Note</AlertTitle>
                    <AlertDescription>
                      This algorithm only works for systems with a single instance of each resource type. For multiple
                      instances, the Banker's Algorithm must be used.
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cycle Detection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        A cycle in a resource allocation graph indicates a circular wait condition, which is a necessary
                        condition for deadlock.
                      </p>
                      <img
                        src="/placeholder.svg?height=200&width=300"
                        alt="Cycle in Resource Allocation Graph"
                        className="rounded-md border"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Example: Process P1 holds R1 and requests R2, while P2 holds R2 and requests R1, forming a
                        cycle.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Algorithm Complexity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        The time complexity for detecting cycles in a resource allocation graph is O(V+E), where V is
                        the number of vertices (processes and resources) and E is the number of edges.
                      </p>
                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-2">Advantages</h5>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                          <li>Simple to implement and understand</li>
                          <li>Provides visual representation of deadlocks</li>
                          <li>Efficient for small systems</li>
                        </ul>
                      </div>
                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-2">Limitations</h5>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                          <li>Only works for single instance resources</li>
                          <li>Cannot handle dynamic resource allocation efficiently</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6">
                  <Button variant="outline" onClick={() => (window.location.href = "#/simulator")}>
                    Try it in the Simulator
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bankers" className="mt-6">
              <div className="space-y-4">
                <div className="prose max-w-none">
                  <h3 className="text-lg font-medium">Banker's Algorithm</h3>
                  <p>
                    The Banker's Algorithm is a deadlock avoidance algorithm that tests for safety by simulating the
                    allocation of maximum possible resources to all processes. It works with multiple instances of each
                    resource type.
                  </p>

                  <h4 className="font-medium mt-4">How It Works</h4>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li>
                      Maintain data structures for available resources, maximum resource needs, current allocation, and
                      remaining needs.
                    </li>
                    <li>When a process requests resources, pretend to allocate them.</li>
                    <li>
                      Check if the resulting state is safe by trying to find a sequence where all processes can
                      complete.
                    </li>
                    <li>If a safe sequence exists, grant the request; otherwise, deny it.</li>
                  </ol>

                  <Alert className="mt-4">
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>Important Note</AlertTitle>
                    <AlertDescription>
                      The Banker's Algorithm requires advance knowledge of the maximum resources each process might
                      need, which is not always available in real systems.
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Safety Algorithm</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        The safety algorithm determines if a system is in a safe state by finding a sequence of
                        processes that can complete without causing deadlock.
                      </p>
                      <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
                        <li>Initialize Work = Available and Finish[i] = false for all processes</li>
                        <li>Find a process that can complete with current Work resources</li>
                        <li>Add its resources back to Work when it completes</li>
                        <li>Repeat until all processes complete or no progress can be made</li>
                      </ol>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Resource Request Algorithm</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        This algorithm checks if a specific resource request can be safely granted.
                      </p>
                      <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
                        <li>Check if request exceeds maximum need or available resources</li>
                        <li>Temporarily allocate resources and update data structures</li>
                        <li>Run safety algorithm to check if resulting state is safe</li>
                        <li>If safe, grant request; otherwise, revert changes and deny</li>
                      </ol>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6">
                  <Button onClick={() => (window.location.href = "#/learn?tab=bankers")}>
                    Try Banker's Algorithm Demo
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

