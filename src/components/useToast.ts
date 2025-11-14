import { useContext } from "react"
import { ToastContext } from "./ToastContext"

export const useToast = (): { showToast: (message: string, type: 'success' | 'error') => void } => {
  return useContext(ToastContext)
}
