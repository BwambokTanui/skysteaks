"use client"

import { OddsButton } from "@/components/sports/odds-button"
import { formatKickoff } from "@/lib/sports/format"
import type { SportsEvent } from "@/lib/sports/types"

export function MatchRow({ event }: { event: SportsEvent }) {
  const market = event.markets.find((item) => item.key === "1x2") ?? event.markets[0]
  const selections = market?.selections ?? []
  const live = event.status === "live"

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-3.5 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{event.leagueName}</span>
            {!live && <span className="text-[11px] text-[var(--muted)]">· {formatKickoff(event.kickoffAt)}</span>}
          </div>
          <div className="mt-2 grid gap-1.5">
            <TeamLine name={event.homeTeam} score={live ? event.homeScore ?? 0 : null} emphasize={live && (event.homeScore ?? 0) > (event.awayScore ?? 0)} />
            <TeamLine name={event.awayTeam} score={live ? event.awayScore ?? 0 : null} emphasize={live && (event.awayScore ?? 0) > (event.homeScore ?? 0)} />
          </div>
        </div>
        <div className="shrink-0 pt-0.5">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[rgba(255,93,115,0.14)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--rose)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--rose)]" />
              {event.minute != null && event.minute > 0 ? `${event.minute}'` : "LIVE"}
            </span>
          ) : (
            <span className="inline-flex rounded-md bg-white/6 px-2 py-1 text-[11px] font-medium text-[var(--muted)]">{event.sportName}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-elevated)] p-2">
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
    </article>
  )
}

function TeamLine({ name, score, emphasize }: { name: string; score: number | null; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className={`truncate text-[15px] font-semibold leading-tight ${emphasize ? "text-white" : "text-white/92"}`}>{name}</p>
      {score != null && (
        <span className={`font-mono text-base font-bold tabular-nums ${emphasize ? "text-white" : "text-[var(--muted)]"}`}>{score}</span>
      )}
    </div>
  )
}
