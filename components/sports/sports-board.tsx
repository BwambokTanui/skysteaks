"use client"

import Link from "next/link"
import { useMemo } from "react"
import { BetslipDock } from "@/components/sports/betslip"
import { MatchRow } from "@/components/sports/match-row"
import { SetupNotice } from "@/components/game/setup-notice"
import { Notice } from "@/components/ui/notice"
import { cn } from "@/lib/cn"
import type { SportsCatalog } from "@/lib/sports/types"

export function SportsBoard({
  catalog,
  error,
  code,
  sport,
  live,
}: {
  catalog: SportsCatalog | null
  error?: string | null
  code?: "config" | "schema" | "error" | null
  sport?: string | null
  live?: boolean
}) {
  const sports = catalog?.sports ?? []
  const events = catalog?.events ?? []

  const grouped = useMemo(() => {
    const map = new Map<string, typeof events>()
    for (const event of events) {
      const key = event.leagueName
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [events])

  if (!catalog && (code === "config" || code === "schema")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <SetupNotice message={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-3 py-4 lg:max-w-[1240px] lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-[var(--mint)]">SPORTS</p>
            <h1 className="mt-1 text-3xl font-semibold">{live ? "Live now" : sport ? sports.find((item) => item.id === sport)?.name ?? "Sports" : "All sports"}</h1>
          </div>
          {catalog && <p className="text-sm text-[var(--muted)]">{catalog.liveCount} live</p>}
        </div>

        <div className="scroll-thin flex gap-2 overflow-x-auto pb-1">
          <Chip href="/sports" active={!sport && !live}>
            All
          </Chip>
          <Chip href="/sports?live=1" active={Boolean(live)}>
            Live
          </Chip>
          {sports.map((item) => (
            <Chip key={item.id} href={`/sports/${item.id}`} active={sport === item.id && !live}>
              {item.name}
            </Chip>
          ))}
        </div>

        {error && code !== "config" && code !== "schema" && <Notice>{error}</Notice>}

        {grouped.length === 0 && <p className="text-sm text-[var(--muted)]">No matches in this filter right now.</p>}

        {grouped.map(([league, leagueEvents]) => (
          <section key={league} className="grid gap-3">
            <h2 className="text-sm font-semibold tracking-[0.16em] text-[var(--muted)]">{league.toUpperCase()}</h2>
            <div className="grid gap-3">
              {leagueEvents.map((event) => (
                <MatchRow key={event.id} event={event} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <BetslipDock />
    </div>
  )
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm",
        active ? "bg-white text-black" : "bg-white/8 text-[var(--muted)] hover:text-white",
      )}
    >
      {children}
    </Link>
  )
}
