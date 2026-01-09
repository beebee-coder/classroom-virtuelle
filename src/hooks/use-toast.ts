// src/hooks/use-toast.ts - Version améliorée
"use client"

import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

// Constants
const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

// Types
type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast> & { id: string }
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

// Utilitaires
let count = 0

function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return `toast-${count}`
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string): void => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

const clearToRemoveQueue = (toastId: string): void => {
  const timeout = toastTimeouts.get(toastId)
  if (timeout) {
    clearTimeout(timeout)
    toastTimeouts.delete(toastId)
  }
}

// Reducer
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      if (!action.toast.id) {
        console.warn("UPDATE_TOAST action requires toast id")
        return state
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // Side effects
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        // Clear all timeouts when removing all toasts
        toastTimeouts.forEach((timeout, id) => {
          clearTimeout(timeout)
          toastTimeouts.delete(id)
        })
        return {
          ...state,
          toasts: [],
        }
      }
      
      // Clear individual timeout
      clearToRemoveQueue(action.toastId)
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
      
    default:
      return state
  }
}

// State management
const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action): void {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

// Toast function with better TypeScript
type ToastOptions = Omit<ToasterToast, "id">

interface ToastReturn {
  id: string
  dismiss: () => void
  update: (props: ToasterToast) => void
}

function toast({ ...props }: ToastOptions): ToastReturn {
  const id = genId()

  const update = (props: Partial<ToasterToast>): void => {
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id } as ToasterToast,
    })
  }
  
  const dismiss = (): void => {
    dispatch({ type: "DISMISS_TOAST", toastId: id })
  }

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id,
    dismiss,
    update,
  }
}

// Convenience methods for common toast types
toast.success = (props: ToastOptions): ToastReturn => 
  toast({ ...props, variant: "default" })

toast.error = (props: ToastOptions): ToastReturn => 
  toast({ ...props, variant: "destructive" })

toast.warning = (props: ToastOptions): ToastReturn => 
  toast({ ...props, variant: "default" })

// Hook
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
export type { ToastOptions, ToastReturn, ToasterToast }