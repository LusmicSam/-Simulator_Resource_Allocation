"use client"

import { useState, useCallback } from "react"

export function useUndoRedo<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState)
  const [history, setHistory] = useState<T[]>([initialState])
  const [index, setIndex] = useState(0)

  const updateState = useCallback(
    (newState: T) => {
      setState(newState)
      // Remove any states after the current index
      const newHistory = history.slice(0, index + 1)
      // Add the new state to the history
      setHistory([...newHistory, newState])
      // Move to the latest state in history
      setIndex(newHistory.length)
    },
    [history, index],
  )

  const undo = useCallback(() => {
    if (index > 0) {
      const newIndex = index - 1
      setIndex(newIndex)
      setState(history[newIndex])
    }
  }, [history, index])

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      const newIndex = index + 1
      setIndex(newIndex)
      setState(history[newIndex])
    }
  }, [history, index])

  const canUndo = index > 0
  const canRedo = index < history.length - 1

  return {
    state,
    setState: updateState,
    index,
    history,
    canUndo,
    canRedo,
    undo,
    redo,
  }
}

