import { useState, useCallback, useRef } from 'react'

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

interface UseUndoRedoOptions {
  maxHistory?: number
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
) {
  const { maxHistory = 50 } = options

  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  })

  // Track if we're currently in an undo/redo operation to avoid recording it
  const isUndoRedoAction = useRef(false)

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  // Set new state and record in history
  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setHistory((prev) => {
        const resolvedState =
          typeof newState === 'function'
            ? (newState as (prev: T) => T)(prev.present)
            : newState

        // Don't record if this is an undo/redo action
        if (isUndoRedoAction.current) {
          isUndoRedoAction.current = false
          return { ...prev, present: resolvedState }
        }

        // Don't record if state hasn't changed (shallow comparison for arrays)
        if (JSON.stringify(resolvedState) === JSON.stringify(prev.present)) {
          return prev
        }

        // Add current state to past, clear future
        const newPast = [...prev.past, prev.present]

        // Limit history size
        if (newPast.length > maxHistory) {
          newPast.shift()
        }

        return {
          past: newPast,
          present: resolvedState,
          future: [],
        }
      })
    },
    [maxHistory]
  )

  // Undo to previous state
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev

      const newPast = [...prev.past]
      const previousState = newPast.pop()!

      isUndoRedoAction.current = true

      return {
        past: newPast,
        present: previousState,
        future: [prev.present, ...prev.future],
      }
    })
  }, [])

  // Redo to next state
  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev

      const newFuture = [...prev.future]
      const nextState = newFuture.shift()!

      isUndoRedoAction.current = true

      return {
        past: [...prev.past, prev.present],
        present: nextState,
        future: newFuture,
      }
    })
  }, [])

  // Reset history with new initial state
  const reset = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    })
  }, [])

  // Clear history but keep current state
  const clearHistory = useCallback(() => {
    setHistory((prev) => ({
      past: [],
      present: prev.present,
      future: [],
    }))
  }, [])

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    clearHistory,
    historyLength: history.past.length,
    futureLength: history.future.length,
  }
}
