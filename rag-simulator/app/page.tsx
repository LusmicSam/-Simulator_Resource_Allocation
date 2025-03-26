import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiStatus } from "@/components/api-status"
import { ResourceAllocationGraph } from "@/components/simulator/resource-allocation-graph"
import { DeadlockDetection } from "@/components/detection/deadlock-detection"
import { LanguageToGraph } from "@/components/language/language-to-graph"
import { LearnSection } from "@/components/learn/learn-section"
import { QuizSection } from "@/components/learn/quiz-section"
import { GlossarySection } from "@/components/learn/glossary-section"
import { HelpSection } from "@/components/help/help-section"

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-2 text-center">Resource Allocation Graph Simulator</h1>
      <p className="text-lg text-muted-foreground mb-8 text-center">
        An interactive tool to visualize and analyze deadlock scenarios in operating systems
      </p>

      <div className="mb-6">
        <ApiStatus />
      </div>

      <Tabs defaultValue="simulator" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
          <TabsTrigger value="detection">Deadlock Detection</TabsTrigger>
          <TabsTrigger value="language">Language to Graph</TabsTrigger>
          <TabsTrigger value="learn">Learn</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="glossary">Glossary</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        <TabsContent value="simulator" className="mt-6">
          <ResourceAllocationGraph />
        </TabsContent>

        <TabsContent value="detection" className="mt-6">
          <DeadlockDetection />
        </TabsContent>

        <TabsContent value="language" className="mt-6">
          <LanguageToGraph />
        </TabsContent>

        <TabsContent value="learn" className="mt-6">
          <LearnSection />
        </TabsContent>

        <TabsContent value="quiz" className="mt-6">
          <QuizSection />
        </TabsContent>

        <TabsContent value="glossary" className="mt-6">
          <GlossarySection />
        </TabsContent>

        <TabsContent value="help" className="mt-6">
          <HelpSection />
        </TabsContent>
      </Tabs>
    </main>
  )
}

