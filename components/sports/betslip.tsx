"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useBalance } from "@/components/layout/balance"
import { useBetslip } from "@/components/sports/betslip-context"
import { Button, buttonClasses } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"
import { Panel } from "@/components/ui/panel"
import { cn } from "@/lib/cn"
import { money } from "@/lib/format"
import { combineOdds, formatOdds } from "@/lib/sports/format"

const QUICK_STAKES = ["10", "20", "50", "100", "200", "500"]

export function BetslipDock() {
  const { items, open, setOpen, remove, clear } = useBetslip()
  const { balance, setBalance } = useBalance()
  const [stake, setStake] = useState("10.00")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<"error" | "info">("error")
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

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

  if (!mounted) return null

  return createPortal(
    <>
      {items.length > 0 && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-3 z-[70] inline-flex items-center gap-2 rounded-full bg-[var(--sporty)] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(227,27,35,0.45)] lg:bottom-6"
        >
          Betslip
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/20 px-1.5 font-mono text-xs">{items.length}</span>
        </button>
      )}

      <div
        className={cn(
          "fixed inset-0 z-[80] bg-slate-900/40 transition",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 z-[90] max-h-[min(85vh,720px)] overflow-auto rounded-t-[28px] border border-[var(--line)] bg-white p-4 pb-[calc(18px+env(safe-area-inset-bottom))] shadow-[0_-16px_50px_rgba(15,23,42,0.18)] transition duration-300 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[380px] lg:rounded-[24px]",
          open ? "translate-y-0" : "translate-y-[110%] lg:translate-y-[120%]",
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 lg:hidden" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--sporty)]">BETSLIP</p>
            <h2 className="text-lg font-bold text-[var(--text)]">
              {items.length ? `${items.length} selection${items.length === 1 ? "" : "s"}` : "Empty"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button type="button" onClick={clear} className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
                Clear
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-[var(--bg-elevated)] px-3 py-1.5 text-sm font-semibold text-[var(--text)]">
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          {items.length === 0 && (
            <Panel className="p-4 text-sm text-[var(--muted)]">Tap 1, X or 2 on a match to build a ticket.</Panel>
          )}
          {items.map((item) => (
            <div key={item.selectionId} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">{item.leagueName}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-[var(--text)]">
                    {item.homeTeam} vs {item.awayTeam}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--sporty)]">
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
              <span className="font-mono font-bold text-[var(--text)]">{formatOdds(totalOdds)}</span>
            </div>

            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">Stake</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_STAKES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStake(value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 font-mono text-xs font-semibold",
                      stake === value || stake === `${value}.00`
                        ? "bg-[var(--sporty)] text-white"
                        : "bg-[var(--bg-elevated)] text-[var(--muted)]",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <input
                value={stake}
                onChange={(event) => setStake(event.target.value)}
                inputMode="decimal"
                className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3 font-mono text-[var(--text)] outline-none focus:border-[var(--sporty)]"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Potential return</span>
              <span className="font-mono font-bold text-[var(--gold)]">{money(payout)}</span>
            </div>

            {balance != null ? (
              <Button type="button" size="lg" disabled={pending} onClick={place}>
                {pending ? "Placing…" : "Place bet"}
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
    </>,
    document.body,
  )
}
