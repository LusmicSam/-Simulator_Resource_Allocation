"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { apiBaseUrl } from "@/lib/api-config"

export function ApiStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading")
  const [message, setMessage] = useState("Checking connection to Python backend...")
  const [version, setVersion] = useState("")

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/health`)
        if (response.ok) {
          const data = await response.json()
          setStatus("connected")
          setVersion(data.version)
          setMessage(`Connected to Python backend (v${data.version})`)
        } else {
          setStatus("error")
          setMessage("Failed to connect to Python backend. API responded with an error.")
        }
      } catch (error) {
        setStatus("error")
        setMessage("Failed to connect to Python backend. Make sure the server is running.")
      }
    }

    checkApiStatus()

    // Set up polling to check connection status every 30 seconds
    const interval = setInterval(checkApiStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  if (status === "loading") {
    return (
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-600">Connecting</AlertTitle>
        <AlertDescription className="text-yellow-600">{message}</AlertDescription>
      </Alert>
    )
  }

  if (status === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="bg-green-50 border-green-200">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-600">Connected</AlertTitle>
      <AlertDescription className="text-green-600">{message}</AlertDescription>
    </Alert>
  )
}

