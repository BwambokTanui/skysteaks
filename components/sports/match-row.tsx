"use client"

import { OddsButton } from "@/components/sports/odds-button"
import { formatKickoff } from "@/lib/sports/format"
import type { SportsEvent } from "@/lib/sports/types"

export function MatchRow({ event }: { event: SportsEvent }) {
  const market = event.markets.find((item) => item.key === "1x2") ?? event.markets[0]
  const selections = market?.selections ?? []
  const live = event.status === "live"

  return (
    <article className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-white shadow-[var(--shadow)]">
      <div className="flex">
        <span className="w-1.5 shrink-0 bg-[var(--sporty)]" aria-hidden />
        <div className="min-w-0 flex-1 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                {event.leagueName}
                {!live && <span> · {formatKickoff(event.kickoffAt)}</span>}
              </p>
              <div className="mt-2.5 grid gap-1.5">
                <TeamLine name={event.homeTeam} score={live ? event.homeScore ?? 0 : null} emphasize={live && (event.homeScore ?? 0) >= (event.awayScore ?? 0)} />
                <TeamLine name={event.awayTeam} score={live ? event.awayScore ?? 0 : null} emphasize={live && (event.awayScore ?? 0) > (event.homeScore ?? 0)} />
              </div>
            </div>
            <div className="shrink-0 pt-0.5">
              {live ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe8ea] px-2.5 py-1 font-mono text-[11px] font-bold text-[var(--sporty)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--sporty)]" />
                  {event.minute != null && event.minute > 0 ? `${event.minute}'` : "LIVE"}
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]">
                  {event.sportName}
                </span>
              )}
            </div>
          </div>

          <div className={`mt-3 grid gap-2 ${selections.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {selections.map((selection) => (
              <OddsButton
                key={selection.id}
                label={selection.name}
                item={{
                  selectionId: selection.id,
                  eventId: event.id,
                  marketKey: market?.key ?? "1x2",
                  selectionKey: selection.key,
                  selectionName: selection.name === "1" ? event.homeTeam : selection.name === "2" ? event.awayTeam : "Draw",
                  homeTeam: event.homeTeam,
                  awayTeam: event.awayTeam,
                  leagueName: event.leagueName,
                  odds: selection.odds,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

function TeamLine({ name, score, emphasize }: { name: string; score: number | null; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className={`truncate text-[15px] font-semibold leading-tight ${emphasize ? "text-[var(--text)]" : "text-slate-700"}`}>{name}</p>
      {score != null && (
        <span className={`font-mono text-base font-bold tabular-nums ${emphasize ? "text-[var(--text)]" : "text-[var(--muted)]"}`}>{score}</span>
      )}
    </div>
  )
}
