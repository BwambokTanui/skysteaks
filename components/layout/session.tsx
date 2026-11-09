"use client"

import { createContext, useContext, useMemo } from "react"

type SessionContextValue = {
  configured: boolean
  email: string | null
  username: string | null
  signedIn: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({
  configured,
  email,
  username,
  children,
}: {
  configured: boolean
  email: string | null
  username: string | null
  children: React.ReactNode
}) {
  const value = useMemo(
    () => ({
      configured,
      email,
      username,
      signedIn: Boolean(email || username),
    }),
    [configured, email, username],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error("SessionProvider is missing")
  return context
}
