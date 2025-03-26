"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { apiBaseUrl } from "@/lib/api-config"

export function HelpSection() {
  const [activeTab, setActiveTab] = useState("faq")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !email || !message) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${apiBaseUrl}/submit-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, message }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit feedback")
      }

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      })

      // Reset form
      setName("")
      setEmail("")
      setMessage("")
    } catch (error) {
      console.error("Error submitting feedback:", error)
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Help & Support</CardTitle>
          <CardDescription>
            Find answers to common questions and get help with the Resource Allocation Graph Simulator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="tutorial">Tutorial</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="faq" className="mt-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I create a Resource Allocation Graph?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">To create a Resource Allocation Graph:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Go to the Simulator tab</li>
                      <li>Use the "Add Process" button to add processes</li>
                      <li>Use the "Add Resource" button to add resources</li>
                      <li>Use the "Add Edge" button to create connections between processes and resources</li>
                      <li>For request edges, select a process first, then a resource</li>
                      <li>For allocation edges, select a resource first, then a process</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>How does deadlock detection work?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      Deadlock detection in the simulator works by analyzing the Resource Allocation Graph for cycles.
                      When a cycle is detected in a system with single-instance resources, it indicates a deadlock.
                    </p>
                    <p>
                      For multi-instance resources, the simulator uses the Banker's Algorithm to determine if the system
                      is in a safe state. If no safe sequence can be found, the system is in a deadlock state.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>What is the difference between request and allocation edges?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      <strong>Request Edge:</strong> An edge from a process to a resource, indicating that the process
                      is requesting that resource. In the simulator, these are shown as blue arrows.
                    </p>
                    <p>
                      <strong>Allocation Edge:</strong> An edge from a resource to a process, indicating that the
                      resource is currently allocated to that process. In the simulator, these are shown as green
                      arrows.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>How do I use the Language-to-Graph converter?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      The Language-to-Graph converter allows you to create graphs using a specialized syntax or natural
                      language:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Go to the "Language to Graph" tab</li>
                      <li>Enter your description using either the formal syntax or natural language</li>
                      <li>Click "Generate Graph" to create the graph</li>
                      <li>You can then save the graph and load it in the Simulator tab</li>
                    </ol>
                    <p className="mt-2">Check the "Syntax Guide" tab for detailed information on the formal syntax.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger>How do I save and load graphs?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">To save a graph:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Create your graph in the Simulator tab</li>
                      <li>Click the "Save" button</li>
                      <li>The graph will be saved as a JSON file to your computer</li>
                    </ol>
                    <p className="mt-2 mb-2">To load a graph:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Click the "Load" button in the Simulator tab</li>
                      <li>Select the JSON file you previously saved</li>
                      <li>The graph will be loaded into the simulator</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger>What is the Banker's Algorithm?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      The Banker's Algorithm is a deadlock avoidance algorithm that tests for safety by simulating the
                      allocation of maximum possible resources to all processes.
                    </p>
                    <p className="mb-2">It works by:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>
                        Maintaining data structures for available resources, maximum resource needs, current allocation,
                        and remaining needs
                      </li>
                      <li>When a process requests resources, pretending to allocate them</li>
                      <li>
                        Checking if the resulting state is safe by trying to find a sequence where all processes can
                        complete
                      </li>
                      <li>If a safe sequence exists, granting the request; otherwise, denying it</li>
                    </ol>
                    <p className="mt-2">
                      You can explore the Banker's Algorithm in detail in the "Learn" tab under the "Banker's Algorithm"
                      section.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7">
                  <AccordionTrigger>How does the machine learning prediction work?</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      The machine learning prediction feature analyzes the structure of your resource allocation graph
                      and predicts the likelihood of a deadlock. It considers factors like the number of processes,
                      resources, request and allocation edges, resource utilization, and the presence of cycles.
                    </p>
                    <p className="mt-2">
                      This prediction is based on patterns learned from thousands of resource allocation scenarios and
                      provides an early warning system before an actual deadlock occurs.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="tutorial" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Getting Started</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This tutorial will guide you through the basic features of the Resource Allocation Graph Simulator.
                  </p>

                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Step 1: Understanding the Interface</h4>
                      <p className="text-sm text-muted-foreground">The simulator is divided into several tabs:</p>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2 space-y-1">
                        <li>
                          <strong>Simulator:</strong> Create and manipulate resource allocation graphs
                        </li>
                        <li>
                          <strong>Deadlock Detection:</strong> Learn about deadlock detection algorithms
                        </li>
                        <li>
                          <strong>Language to Graph:</strong> Convert text descriptions to graphs
                        </li>
                        <li>
                          <strong>Learn:</strong> Educational content about resource allocation and deadlocks
                        </li>
                        <li>
                          <strong>Quiz:</strong> Test your knowledge
                        </li>
                        <li>
                          <strong>Glossary:</strong> Definitions of key terms
                        </li>
                        <li>
                          <strong>Help:</strong> This help section
                        </li>
                      </ul>
                    </div>

                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Step 2: Creating Your First Graph</h4>
                      <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
                        <li>Go to the Simulator tab</li>
                        <li>Click "Add Process" and click on the canvas to place a process</li>
                        <li>Click "Add Resource" and click on the canvas to place a resource</li>
                        <li>
                          To create a request edge, click "Add Edge", select "Request Edge" from the dropdown, click on
                          a process, then click on a resource
                        </li>
                        <li>
                          To create an allocation edge, click "Add Edge", select "Allocation Edge" from the dropdown,
                          click on a resource, then click on a process
                        </li>
                      </ol>
                    </div>

                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Step 3: Detecting Deadlocks</h4>
                      <p className="text-sm text-muted-foreground">
                        Once you've created a graph, the simulator will automatically check for deadlocks. If a deadlock
                        is detected, you'll see an alert at the top of the canvas with details about the deadlock cycle.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        You can also see the deadlock probability prediction, which uses machine learning to estimate
                        the likelihood of a deadlock based on the graph structure.
                      </p>
                    </div>

                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Step 4: Using Step-by-Step Mode</h4>
                      <p className="text-sm text-muted-foreground">
                        The step-by-step mode allows you to see how the graph evolves over time:
                      </p>
                      <ol className="list-decimal pl-5 text-sm text-muted-foreground mt-2 space-y-1">
                        <li>Enable "Step-by-Step Mode" using the toggle at the bottom of the simulator</li>
                        <li>
                          Use the "Previous Step" and "Next Step" buttons to navigate through the history of changes
                        </li>
                        <li>The timeline at the bottom shows all steps with descriptions</li>
                      </ol>
                    </div>

                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Step 5: Exploring Advanced Features</h4>
                      <p className="text-sm text-muted-foreground">
                        Once you're comfortable with the basics, explore these advanced features:
                      </p>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2 space-y-1">
                        <li>
                          <strong>Multi-instance resources:</strong> Select a resource and increase its instances using
                          the properties panel
                        </li>
                        <li>
                          <strong>Language to Graph:</strong> Try converting text descriptions to graphs
                        </li>
                        <li>
                          <strong>Banker's Algorithm:</strong> Explore the Banker's Algorithm demo in the Learn section
                        </li>
                        <li>
                          <strong>Save and load:</strong> Save your graphs for future reference
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Video Tutorials</h3>
                  <p className="text-sm text-muted-foreground">For visual learners, check out these video tutorials:</p>

                  <div className="grid gap-4 md:grid-cols-2 mt-4">
                    <div className="border rounded-md overflow-hidden">
                      <div className="aspect-video bg-gray-100 flex items-center justify-center">
                        <p className="text-muted-foreground">Video: Basic Graph Creation</p>
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-sm">Getting Started with RAG Simulator</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Learn the basics of creating and manipulating resource allocation graphs.
                        </p>
                      </div>
                    </div>

                    <div className="border rounded-md overflow-hidden">
                      <div className="aspect-video bg-gray-100 flex items-center justify-center">
                        <p className="text-muted-foreground">Video: Deadlock Detection</p>
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-sm">Understanding Deadlock Detection</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Learn how to detect and analyze deadlocks in resource allocation graphs.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Contact Support</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    If you need help or have suggestions for improving the simulator, please fill out the form below.
                  </p>

                  <form onSubmit={handleSubmitFeedback} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          Name
                        </label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                          Email
                        </label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Your email"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">
                        Message
                      </label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe your issue or suggestion"
                        rows={5}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                  </form>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Additional Resources</h3>
                  <div className="space-y-3">
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-1">Documentation</h4>
                      <p className="text-sm text-muted-foreground">
                        Access the full documentation for the Resource Allocation Graph Simulator.
                      </p>
                      <Button variant="link" className="p-0 h-auto mt-2">
                        View Documentation
                      </Button>
                    </div>

                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-1">GitHub Repository</h4>
                      <p className="text-sm text-muted-foreground">
                        The simulator is open-source. View the code, report issues, or contribute.
                      </p>
                      <Button variant="link" className="p-0 h-auto mt-2">
                        Visit GitHub Repository
                      </Button>
                    </div>

                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-1">Community Forum</h4>
                      <p className="text-sm text-muted-foreground">
                        Join the community forum to discuss the simulator, share examples, and get help.
                      </p>
                      <Button variant="link" className="p-0 h-auto mt-2">
                        Join Forum
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

