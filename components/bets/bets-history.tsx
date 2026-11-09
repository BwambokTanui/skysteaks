"use client"

import { useMemo, useState } from "react"
import { Pill } from "@/components/ui/pill"
import { cn } from "@/lib/cn"
import { formatTime, money, signedMoney } from "@/lib/format"

export type SportsTicketView = {
  id: string
  stake: number
  totalOdds: number
  potentialPayout: number
  status: string
  profit: number | null
  createdAt: string
  legs: Array<{
    homeTeam: string
    awayTeam: string
    selectionName: string
    odds: number
    result: string | null
  }>
}

export type AviatorBetView = {
  id: string
  roundNumber: number | string
  amount: number
  status: string
  cashoutMultiplier: number | null
  profit: number | null
  createdAt: string
}

function toneForStatus(status: string) {
  if (status === "cashed" || status === "won") return "win" as const
  if (status === "lost") return "loss" as const
  if (status === "open") return "mid" as const
  return "neutral" as const
}

function labelForStatus(status: string) {
  if (status === "cashed" || status === "won") return "Won"
  if (status === "lost") return "Lost"
  if (status === "open") return "Open"
  return status
}

function resultMoney(status: string, amount: number, profit: number | null) {
  if (status === "lost") return signedMoney(profit ?? -amount)
  if (profit == null) return "—"
  return signedMoney(profit)
}

export function BetsHistory({
  tickets,
  ticketError,
  aviatorBets,
  aviatorError,
}: {
  tickets: SportsTicketView[]
  ticketError?: string | null
  aviatorBets: AviatorBetView[]
  aviatorError?: string | null
}) {
  const [tab, setTab] = useState<"all" | "sports" | "aviator">("all")
  const [filter, setFilter] = useState<"all" | "won" | "lost" | "open">("all")
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})

  function toggle(id: string) {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const sports = useMemo(() => {
    return tickets.filter((ticket) => {
      if (filter === "all") return true
      if (filter === "won") return ticket.status === "won"
      if (filter === "lost") return ticket.status === "lost"
      return ticket.status === "open"
    })
  }, [tickets, filter])

  const aviator = useMemo(() => {
    return aviatorBets.filter((bet) => {
      if (filter === "all") return true
      if (filter === "won") return bet.status === "cashed"
      if (filter === "lost") return bet.status === "lost"
      return bet.status === "open"
    })
  }, [aviatorBets, filter])

  const showSports = tab === "all" || tab === "sports"
  const showAviator = tab === "all" || tab === "aviator"

  return (
    <div className="grid gap-4">
      <div className="scroll-thin flex gap-2 overflow-x-auto">
        {(
          [
            ["all", "All"],
            ["sports", "Sports"],
            ["aviator", "Aviator"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold",
              tab === id ? "bg-[var(--sporty)] text-white" : "bg-white text-[var(--text)] shadow-[var(--shadow)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="scroll-thin flex gap-2 overflow-x-auto">
        {(
          [
            ["all", "All results"],
            ["won", "Won"],
            ["lost", "Lost"],
            ["open", "Open"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-1.5 text-sm font-semibold",
              filter === id ? "border-[var(--sporty)] text-[var(--sporty)]" : "border-transparent text-[var(--muted)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {showSports && (
        <section className="grid gap-2">
          <h2 className="px-0.5 text-sm font-bold tracking-wide text-[var(--text)]">Sports tickets</h2>
          {ticketError && <p className="rounded-2xl bg-[#ffe8ea] px-4 py-3 text-sm text-[var(--rose)]">{ticketError}</p>}
          {!ticketError && sports.length === 0 && (
            <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-5 text-sm text-[var(--muted)]">No sports tickets in this filter.</p>
          )}
          {sports.map((ticket) => {
            const expanded = Boolean(openIds[`s-${ticket.id}`])
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => toggle(`s-${ticket.id}`)}
                className="rounded-[20px] border border-[var(--line)] bg-white p-4 text-left shadow-[var(--shadow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={toneForStatus(ticket.status)}>{labelForStatus(ticket.status)}</Pill>
                      <span className="text-xs text-[var(--muted)]">{ticket.legs.length} selection{ticket.legs.length === 1 ? "" : "s"}</span>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-[var(--text)]">
                      {ticket.legs[0]
                        ? `${ticket.legs[0].homeTeam} vs ${ticket.legs[0].awayTeam}`
                        : "Sports ticket"}
                      {ticket.legs.length > 1 ? ` +${ticket.legs.length - 1}` : ""}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[var(--muted)]">{formatTime(ticket.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-mono text-sm font-bold",
                        ticket.status === "won" && "text-[var(--mint)]",
                        ticket.status === "lost" && "text-[var(--rose)]",
                      )}
                    >
                      {resultMoney(ticket.status, ticket.stake, ticket.profit)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{expanded ? "Hide" : "Expand"}</p>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-3 grid gap-2 border-t border-[var(--line)] pt-3">
                    {ticket.legs.map((leg, index) => (
                      <div key={`${ticket.id}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text)]">
                            {leg.homeTeam} vs {leg.awayTeam}
                          </p>
                          <p className="text-[var(--muted)]">
                            {leg.selectionName} @ {leg.odds.toFixed(2)}
                          </p>
                        </div>
                        <Pill tone={toneForStatus(leg.result ?? "open")} className="text-xs">
                          {labelForStatus(leg.result ?? "open")}
                        </Pill>
                      </div>
                    ))}
                    <div className="mt-1 flex flex-wrap gap-3 font-mono text-xs text-[var(--muted)]">
                      <span>Stake {money(ticket.stake)}</span>
                      <span>Odds {ticket.totalOdds.toFixed(2)}</span>
                      <span>Return {money(ticket.potentialPayout)}</span>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </section>
      )}

      {showAviator && (
        <section className="grid gap-2">
          <h2 className="px-0.5 text-sm font-bold tracking-wide text-[var(--text)]">Aviator bets</h2>
          {aviatorError && <p className="rounded-2xl bg-[#ffe8ea] px-4 py-3 text-sm text-[var(--rose)]">{aviatorError}</p>}
          {!aviatorError && aviator.length === 0 && (
            <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-5 text-sm text-[var(--muted)]">No Aviator bets in this filter.</p>
          )}
          {aviator.map((bet) => {
            const expanded = Boolean(openIds[`a-${bet.id}`])
            const status = bet.status === "cashed" ? "won" : bet.status
            return (
              <button
                key={bet.id}
                type="button"
                onClick={() => toggle(`a-${bet.id}`)}
                className="rounded-[20px] border border-[var(--line)] bg-white p-4 text-left shadow-[var(--shadow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={toneForStatus(status)}>{labelForStatus(status)}</Pill>
                      <span className="font-mono text-xs text-[var(--muted)]">Round {bet.roundNumber}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[var(--text)]">
                      Stake {money(bet.amount)}
                      {bet.cashoutMultiplier != null ? ` · cashed ${bet.cashoutMultiplier.toFixed(2)}x` : ""}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[var(--muted)]">{formatTime(bet.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-mono text-sm font-bold",
                        status === "won" && "text-[var(--mint)]",
                        status === "lost" && "text-[var(--rose)]",
                      )}
                    >
                      {resultMoney(status, bet.amount, bet.profit)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{expanded ? "Hide" : "Expand"}</p>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-3 grid gap-1 border-t border-[var(--line)] pt-3 font-mono text-sm text-[var(--text)]">
                    <p>Round #{bet.roundNumber}</p>
                    <p>Stake {money(bet.amount)}</p>
                    <p>Cash out {bet.cashoutMultiplier == null ? "—" : `${bet.cashoutMultiplier.toFixed(2)}x`}</p>
                    <p className={status === "won" ? "text-[var(--mint)]" : status === "lost" ? "text-[var(--rose)]" : ""}>
                      Result {resultMoney(status, bet.amount, bet.profit)}
                    </p>
                    <p className="text-[var(--muted)]">{formatTime(bet.createdAt)}</p>
                  </div>
                )}
              </button>
            )
          })}
        </section>
      )}
    </div>
  )
}
