"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, XCircle } from "lucide-react"

interface Question {
  id: number
  text: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export function QuizSection() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [quizCompleted, setQuizCompleted] = useState(false)

  const questions: Question[] = [
    {
      id: 1,
      text: "What is a deadlock in an operating system?",
      options: [
        "A situation where a process is using too much CPU time",
        "A situation where two or more processes are waiting indefinitely for resources held by each other",
        "A situation where a process is waiting for I/O operations to complete",
        "A situation where the system runs out of memory",
      ],
      correctAnswer: 1,
      explanation:
        "A deadlock occurs when two or more processes are waiting indefinitely for resources that are held by each other, creating a circular wait condition.",
    },
    {
      id: 2,
      text: "Which of the following is NOT one of the four necessary conditions for a deadlock to occur?",
      options: ["Mutual Exclusion", "Hold and Wait", "Resource Preemption", "Circular Wait"],
      correctAnswer: 2,
      explanation:
        "The four necessary conditions for deadlock are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Resource Preemption is actually the opposite of No Preemption, which is a condition that prevents deadlocks.",
    },
    {
      id: 3,
      text: "In a Resource Allocation Graph, what does a cycle indicate?",
      options: [
        "A deadlock definitely exists",
        "A deadlock may exist if there is only one instance of each resource type",
        "A deadlock may exist if there are multiple instances of each resource type",
        "A deadlock definitely does not exist",
      ],
      correctAnswer: 1,
      explanation:
        "In a Resource Allocation Graph, a cycle indicates that a deadlock definitely exists if there is only one instance of each resource type. If there are multiple instances, a cycle indicates that a deadlock may exist, but further analysis (like the Banker's Algorithm) is needed to confirm.",
    },
    {
      id: 4,
      text: "What is the primary purpose of the Banker's Algorithm?",
      options: ["Deadlock detection", "Deadlock recovery", "Deadlock avoidance", "Deadlock prevention"],
      correctAnswer: 2,
      explanation:
        "The Banker's Algorithm is primarily used for deadlock avoidance. It works by ensuring that the system never enters an unsafe state where deadlock might occur.",
    },
    {
      id: 5,
      text: "Which of the following is a limitation of the Banker's Algorithm?",
      options: [
        "It can only handle single instance resources",
        "It requires advance knowledge of maximum resource needs",
        "It cannot detect existing deadlocks",
        "It has exponential time complexity",
      ],
      correctAnswer: 1,
      explanation:
        "A key limitation of the Banker's Algorithm is that it requires advance knowledge of the maximum number of resources each process might need, which is not always available in real systems.",
    },
    {
      id: 6,
      text: "What happens when a system is in a 'safe state'?",
      options: [
        "All processes have completed execution",
        "No deadlocks are currently present",
        "There exists a sequence in which all processes can complete",
        "All resources are currently available",
      ],
      correctAnswer: 2,
      explanation:
        "A system is in a safe state if there exists a sequence in which all processes can complete without causing deadlock, even if resources are currently allocated.",
    },
    {
      id: 7,
      text: "Which deadlock handling strategy has the highest runtime overhead?",
      options: ["Deadlock prevention", "Deadlock avoidance", "Deadlock detection and recovery", "Deadlock ignorance"],
      correctAnswer: 1,
      explanation:
        "Deadlock avoidance strategies like the Banker's Algorithm typically have the highest runtime overhead because they require constant monitoring and complex calculations to ensure the system stays in a safe state.",
    },
    {
      id: 8,
      text: "In a Resource Allocation Graph, what does an edge from a process to a resource represent?",
      options: [
        "The process is currently using the resource",
        "The process has released the resource",
        "The process is requesting the resource",
        "The resource is available to the process",
      ],
      correctAnswer: 2,
      explanation:
        "In a Resource Allocation Graph, an edge from a process to a resource represents a request - the process is requesting allocation of that resource.",
    },
    {
      id: 9,
      text: "What is resource preemption in the context of deadlock recovery?",
      options: [
        "Preventing resources from being allocated to processes",
        "Temporarily taking resources away from processes to resolve deadlocks",
        "Permanently denying resources to certain processes",
        "Allocating additional resources to resolve deadlocks",
      ],
      correctAnswer: 1,
      explanation:
        "Resource preemption involves temporarily taking resources away from processes to break deadlocks. The preempted process may need to be rolled back to a safe state and restarted later.",
    },
    {
      id: 10,
      text: "Which of the following is NOT a common strategy for handling deadlocks?",
      options: [
        "Deadlock prevention",
        "Deadlock avoidance",
        "Deadlock acceleration",
        "Deadlock detection and recovery",
      ],
      correctAnswer: 2,
      explanation:
        "Deadlock acceleration is not a real strategy. The common approaches are prevention (ensuring a necessary condition cannot occur), avoidance (making safe allocation decisions), detection and recovery (finding and breaking deadlocks), and ignorance (pretending deadlocks don't happen).",
    },
  ]

  const handleOptionSelect = (optionIndex: number) => {
    if (!isAnswered) {
      setSelectedOption(optionIndex)
    }
  }

  const handleCheckAnswer = () => {
    if (selectedOption === null) return

    setIsAnswered(true)

    if (selectedOption === questions[currentQuestionIndex].correctAnswer) {
      setScore(score + 1)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedOption(null)
      setIsAnswered(false)
    } else {
      setQuizCompleted(true)
    }
  }

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedOption(null)
    setIsAnswered(false)
    setScore(0)
    setQuizCompleted(false)
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resource Allocation and Deadlock Quiz</CardTitle>
          <CardDescription>Test your knowledge of resource allocation graphs and deadlock concepts</CardDescription>
        </CardHeader>
        <CardContent>
          {!quizCompleted ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-sm font-medium">
                  Score: {score}/{currentQuestionIndex + (isAnswered ? 1 : 0)}
                </span>
              </div>

              <Progress value={progress} className="h-2" />

              <div className="py-4">
                <h3 className="text-lg font-medium mb-4">{currentQuestion.text}</h3>

                <RadioGroup value={selectedOption?.toString()} className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-2 p-3 rounded-md border ${
                        isAnswered && index === currentQuestion.correctAnswer
                          ? "border-green-500 bg-green-50"
                          : isAnswered && index === selectedOption && index !== currentQuestion.correctAnswer
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleOptionSelect(index)}
                    >
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} disabled={isAnswered} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                      {isAnswered && index === currentQuestion.correctAnswer && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {isAnswered && index === selectedOption && index !== currentQuestion.correctAnswer && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  ))}
                </RadioGroup>

                {isAnswered && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="font-medium mb-1">Explanation:</h4>
                    <p className="text-sm text-blue-800">{currentQuestion.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <h3 className="text-2xl font-bold mb-4">Quiz Completed!</h3>
              <p className="text-lg mb-6">
                Your final score:{" "}
                <span className="font-bold">
                  {score}/{questions.length}
                </span>{" "}
                ({Math.round((score / questions.length) * 100)}%)
              </p>

              <div className="w-full max-w-xs mx-auto mb-6">
                <div className="relative pt-1">
                  <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                    <div
                      style={{ width: `${(score / questions.length) * 100}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        (score / questions.length) >= 0.7
                          ? "bg-green-500"
                          : score / questions.length >= 0.4
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {score / questions.length >= 0.7 ? (
                  <p className="text-green-600 font-medium">
                    Great job! You have a solid understanding of resource allocation and deadlock concepts.
                  </p>
                ) : score / questions.length >= 0.4 ? (
                  <p className="text-yellow-600 font-medium">
                    Good effort! You might want to review some of the concepts in the learning section.
                  </p>
                ) : (
                  <p className="text-red-600 font-medium">
                    You should spend more time studying the resource allocation and deadlock concepts.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {!quizCompleted ? (
            <>
              {!isAnswered ? (
                <Button onClick={handleCheckAnswer} disabled={selectedOption === null}>
                  Check Answer
                </Button>
              ) : (
                <Button onClick={handleNextQuestion}>
                  {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
                </Button>
              )}
            </>
          ) : (
            <Button onClick={handleRestartQuiz}>Restart Quiz</Button>
          )}
        </CardFooter>
      </Card>

      {quizCompleted && (
        <Card>
          <CardHeader>
            <CardTitle>Quiz Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start">
                    <div
                      className={`mt-1 mr-2 flex-shrink-0 ${
                        index < currentQuestionIndex && index === question.correctAnswer
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {index < currentQuestionIndex && index === question.correctAnswer ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {index + 1}. {question.text}
                      </h4>
                      <p className="text-sm mt-1">
                        <span className="font-medium">Correct answer:</span> {question.options[question.correctAnswer]}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

