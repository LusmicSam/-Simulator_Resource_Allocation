"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search } from "lucide-react"

interface GlossaryTerm {
  term: string
  definition: string
  category: "basic" | "advanced" | "algorithm"
}

export function GlossarySection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const glossaryTerms: GlossaryTerm[] = [
    {
      term: "Deadlock",
      definition:
        "A situation where a set of processes are blocked because each process is holding a resource and waiting to acquire a resource held by another process.",
      category: "basic",
    },
    {
      term: "Resource",
      definition:
        "Any hardware or software entity that can be used by a process. Examples include CPU, memory, files, and semaphores.",
      category: "basic",
    },
    {
      term: "Process",
      definition: "An instance of a program in execution. It requires various resources to accomplish its task.",
      category: "basic",
    },
    {
      term: "Resource Allocation Graph (RAG)",
      definition:
        "A directed graph used to describe the allocation of resources to processes and the process requests for resources.",
      category: "basic",
    },
    {
      term: "Mutual Exclusion",
      definition:
        "A property where resources cannot be shared simultaneously. At least one resource must be held in a non-sharable mode.",
      category: "basic",
    },
    {
      term: "Hold and Wait",
      definition:
        "A condition where a process is holding at least one resource and is waiting to acquire additional resources that are currently held by other processes.",
      category: "basic",
    },
    {
      term: "No Preemption",
      definition:
        "Resources cannot be forcibly taken away from a process. They must be explicitly released by the process holding them.",
      category: "basic",
    },
    {
      term: "Circular Wait",
      definition: "A condition where a set of processes are waiting for resources in a circular chain.",
      category: "basic",
    },
    {
      term: "Starvation",
      definition: "A situation where a process is indefinitely denied necessary resources.",
      category: "basic",
    },
    {
      term: "Banker's Algorithm",
      definition:
        "A deadlock avoidance algorithm that tests for safety by simulating the allocation of maximum possible resources to all processes.",
      category: "algorithm",
    },
    {
      term: "Safe State",
      definition:
        "A system state where there exists a sequence of process executions that allows all processes to complete, even if they request their maximum resources.",
      category: "advanced",
    },
    {
      term: "Unsafe State",
      definition:
        "A system state that could lead to a deadlock. There is no guarantee that all processes can complete.",
      category: "advanced",
    },
    {
      term: "Resource-Request Algorithm",
      definition:
        "An algorithm used in conjunction with the Banker's Algorithm to determine if a resource request can be safely granted.",
      category: "algorithm",
    },
    {
      term: "Deadlock Prevention",
      definition: "A set of methods to ensure that at least one of the necessary conditions for deadlock cannot hold.",
      category: "advanced",
    },
    {
      term: "Deadlock Avoidance",
      definition: "A set of methods to ensure that a system will never enter an unsafe state.",
      category: "advanced",
    },
    {
      term: "Deadlock Detection",
      definition:
        "The process of determining that a deadlock exists and identifying the processes and resources involved in the deadlock.",
      category: "advanced",
    },
    {
      term: "Deadlock Recovery",
      definition: "The process of breaking a deadlock and allowing the involved processes to continue execution.",
      category: "advanced",
    },
    {
      term: "Resource Allocation State",
      definition:
        "A state that consists of the number of available resources, the number of allocated resources, and the maximum demands of the processes.",
      category: "advanced",
    },
    {
      term: "Allocation Matrix",
      definition: "A matrix that represents the number of resources of each type currently allocated to each process.",
      category: "algorithm",
    },
    {
      term: "Request Matrix",
      definition: "A matrix that represents the current request of each process for each resource type.",
      category: "algorithm",
    },
    {
      term: "Available Vector",
      definition: "A vector that represents the number of available resources of each type.",
      category: "algorithm",
    },
    {
      term: "Need Matrix",
      definition: "A matrix that represents the remaining resource need of each process.",
      category: "algorithm",
    },
    {
      term: "Resource Type",
      definition: "A category of system resources, such as CPU cycles, memory space, I/O devices, or files.",
      category: "basic",
    },
    {
      term: "Resource Instance",
      definition: "A specific unit of a resource type. Some resource types may have multiple identical instances.",
      category: "basic",
    },
    {
      term: "Cycle in RAG",
      definition: "A circular path in a Resource Allocation Graph, which may indicate a deadlock.",
      category: "basic",
    },
    {
      term: "Claim Edge",
      definition:
        "A special edge in a Resource Allocation Graph that indicates a process may request a resource in the future.",
      category: "advanced",
    },
    {
      term: "Resource Utilization",
      definition: "The percentage of time a resource is busy servicing requests versus being idle.",
      category: "advanced",
    },
    {
      term: "Thrashing",
      definition:
        "A high state of resource contention where processes spend more time competing for resources than doing useful work.",
      category: "advanced",
    },
    {
      term: "Livelock",
      definition:
        "A situation where processes continuously change their states in response to changes in other processes without making progress.",
      category: "advanced",
    },
    {
      term: "Resource Ordering",
      definition:
        "A technique to prevent deadlocks by requiring that all processes request resources in a specific order.",
      category: "advanced",
    },
  ]

  // Filter terms based on search query and active tab
  const filteredTerms = glossaryTerms.filter((term) => {
    const matchesSearch =
      term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.definition.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === "all") return matchesSearch
    return matchesSearch && term.category === activeTab
  })

  // Sort terms alphabetically
  const sortedTerms = [...filteredTerms].sort((a, b) => a.term.localeCompare(b.term))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Glossary of Terms</CardTitle>
          <CardDescription>Definitions of key concepts related to resource allocation and deadlocks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search terms..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Terms</TabsTrigger>
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="algorithm">Algorithms</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <ScrollArea className="h-[500px] pr-4">
                  {sortedTerms.length > 0 ? (
                    <div className="space-y-4">
                      {sortedTerms.map((term, index) => (
                        <div key={index} className="border-b pb-4 last:border-b-0">
                          <h3 className="font-medium text-lg">{term.term}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{term.definition}</p>
                          <div className="mt-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                term.category === "basic"
                                  ? "bg-blue-100 text-blue-800"
                                  : term.category === "advanced"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-green-100 text-green-800"
                              }`}
                            >
                              {term.category.charAt(0).toUpperCase() + term.category.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No terms found matching your search.</div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

