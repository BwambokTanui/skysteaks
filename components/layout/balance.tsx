"use client"

import { createContext, useContext, useMemo, useState } from "react"

type BalanceContextValue = {
  balance: number | null
  setBalance: (value: number | null) => void
}

const BalanceContext = createContext<BalanceContextValue | null>(null)

export function BalanceProvider({ initial, children }: { initial: number | null; children: React.ReactNode }) {
  const [balance, setBalance] = useState(initial)
  const value = useMemo(() => ({ balance, setBalance }), [balance])
  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
}

export function useBalance() {
  const context = useContext(BalanceContext)
  if (!context) throw new Error("BalanceProvider is missing")
  return context
}
