import { createContext, useContext } from 'react'

export interface HeadShellContextValue {
  toggleSidebar: () => void
}

export const HeadShellContext =
  createContext<HeadShellContextValue | null>(null)

export function useHeadShell() {
  return useContext(HeadShellContext)
}
