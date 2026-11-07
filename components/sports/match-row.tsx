"use client"

import { OddsButton } from "@/components/sports/odds-button"
import { Pill } from "@/components/ui/pill"
import { formatKickoff } from "@/lib/sports/format"
import type { SportsEvent } from "@/lib/sports/types"

export function MatchRow({ event }: { event: SportsEvent }) {
  const market = event.markets.find((item) => item.key === "1x2") ?? event.markets[0]
  const selections = market?.selections ?? []

  return (
    <article className="rounded-3xl border border-white/10 bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-[var(--muted)]">
            {event.leagueName} · {event.status === "live" ? "Live" : formatKickoff(event.kickoffAt)}
          </p>
          <h3 className="mt-1 text-base font-semibold">
            {event.homeTeam}
            <span className="mx-2 text-[var(--muted)]">vs</span>
            {event.awayTeam}
          </h3>
        </div>
        {event.status === "live" ? (
          <Pill tone="loss">
            LIVE {event.homeScore ?? 0}:{event.awayScore ?? 0}
          </Pill>
        ) : (
          <Pill>{event.sportName}</Pill>
        )}
      </div>

      <div className="mt-4 flex gap-2">
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
