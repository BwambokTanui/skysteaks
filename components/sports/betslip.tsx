"use client"

import Link from "next/link"
import { createContext, useContext, useMemo, useState } from "react"
import { useBalance } from "@/components/layout/balance"
import { Button, buttonClasses } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"
import { Panel } from "@/components/ui/panel"
import { cn } from "@/lib/cn"
import { money } from "@/lib/format"
import { combineOdds, formatOdds } from "@/lib/sports/format"
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

export function BetslipProvider({ children }: { children: React.ReactNode }) {
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

export function BetslipDock() {
  const { items, open, setOpen, remove, clear } = useBetslip()
  const { balance, setBalance } = useBalance()
  const [stake, setStake] = useState("10.00")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<"error" | "info">("error")

  const totalOdds = combineOdds(items.map((item) => item.odds))
  const stakeValue = Number(stake)
  const payout = Number.isFinite(stakeValue) && totalOdds ? Math.round(stakeValue * totalOdds * 100) / 100 : 0

  async function place() {
    setPending(true)
    setMessage(null)
    try {
      if (!Number.isFinite(stakeValue) || stakeValue < 1 || stakeValue > 5000) {
        setTone("error")
        setMessage("Stake must be between 1 and 5,000.")
        return
      }
      const response = await fetch("/api/sports/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stake: stakeValue,
          selectionIds: items.map((item) => item.selectionId),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Could not place ticket")
      setBalance(Number(data.balance))
      clear()
      setTone("info")
      setMessage(`Ticket placed. Potential return ${money(Number(data.potentialPayout))}.`)
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Could not place ticket")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-[76px] right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[var(--mint)] px-4 py-3 text-sm font-semibold text-black shadow-lg lg:hidden",
          items.length === 0 && "opacity-80",
        )}
      >
        Betslip
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-black/15 px-1 font-mono text-xs">{items.length}</span>
      </button>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/55 transition lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-auto rounded-t-3xl border border-white/10 bg-[#0c0f14] p-4 transition lg:sticky lg:top-20 lg:inset-auto lg:z-10 lg:max-h-[calc(100vh-6rem)] lg:rounded-3xl lg:opacity-100 lg:translate-y-0",
          open ? "translate-y-0" : "translate-y-full lg:translate-y-0",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--muted)]">BETSLIP</p>
            <h2 className="text-lg font-semibold">{items.length ? `${items.length} selection${items.length === 1 ? "" : "s"}` : "Empty"}</h2>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button type="button" onClick={clear} className="text-sm text-[var(--muted)] hover:text-white">
                Clear
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-[var(--muted)] hover:text-white lg:hidden">
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          {items.length === 0 && (
            <Panel className="p-4 text-sm text-[var(--muted)]">Tap 1, X or 2 on a match to build a ticket.</Panel>
          )}
          {items.map((item) => (
            <div key={item.selectionId} className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--muted)]">{item.leagueName}</p>
                  <p className="mt-1 text-sm">
                    {item.homeTeam} vs {item.awayTeam}
                  </p>
                  <p className="mt-1 text-sm text-[var(--mint)]">
                    {item.selectionName} @ {formatOdds(item.odds)}
                  </p>
                </div>
                <button type="button" onClick={() => remove(item.selectionId)} className="text-sm text-[var(--muted)] hover:text-[var(--rose)]">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between text-sm text-[var(--muted)]">
              <span>Total odds</span>
              <span className="font-mono text-white">{formatOdds(totalOdds)}</span>
            </div>
            <label className="grid gap-1.5 text-sm text-[var(--muted)]">
              Stake
              <input
                value={stake}
                onChange={(event) => setStake(event.target.value)}
                inputMode="decimal"
                className="h-12 rounded-2xl border border-white/10 bg-black/30 px-3 font-mono text-white outline-none focus:border-[var(--mint)]"
              />
            </label>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Potential return</span>
              <span className="font-mono text-[var(--gold)]">{money(payout)}</span>
            </div>
            {balance != null ? (
              <Button type="button" size="lg" disabled={pending} onClick={place}>
                Place ticket
              </Button>
            ) : (
              <Link href="/login" className={buttonClasses("primary", "lg")}>
                Sign in to place
              </Link>
            )}
          </div>
        )}

        {message && (
          <div className="mt-3">
            <Notice tone={tone}>{message}</Notice>
          </div>
        )}
      </aside>
    </>
  )
}
