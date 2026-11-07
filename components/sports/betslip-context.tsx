"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import type { BetslipItem } from "@/lib/sports/types"

type BetslipContextValue = {
  items: BetslipItem[]
  open: boolean
  setOpen: (value: boolean) => void
  toggle: (item: BetslipItem) => void
  remove: (selectionId: string) => void
  clear: () => void
  has: (selectionId: string) => boolean
}

const BetslipContext = createContext<BetslipContextValue | null>(null)

export function BetslipProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BetslipItem[]>([])
  const [open, setOpen] = useState(false)

  const value = useMemo<BetslipContextValue>(
    () => ({
      items,
      open,
      setOpen,
      has: (selectionId) => items.some((item) => item.selectionId === selectionId),
      clear: () => setItems([]),
      remove: (selectionId) => setItems((current) => current.filter((item) => item.selectionId !== selectionId)),
      toggle: (item) => {
        setItems((current) => {
          if (current.some((entry) => entry.selectionId === item.selectionId)) {
            return current.filter((entry) => entry.selectionId !== item.selectionId)
          }
          const withoutEvent = current.filter((entry) => entry.eventId !== item.eventId)
          return [...withoutEvent, item]
        })
        setOpen(true)
      },
    }),
    [items, open],
  )

  return <BetslipContext.Provider value={value}>{children}</BetslipContext.Provider>
}

export function useBetslip() {
  const context = useContext(BetslipContext)
  if (!context) throw new Error("BetslipProvider is missing")
  return context
}
