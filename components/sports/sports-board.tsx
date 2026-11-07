"use client"

import Link from "next/link"
import { useMemo } from "react"
import { MatchRow } from "@/components/sports/match-row"
import { useSportsCatalog } from "@/components/sports/use-sports-catalog"
import { SetupNotice } from "@/components/game/setup-notice"
import { Notice } from "@/components/ui/notice"
import { cn } from "@/lib/cn"
import type { SportsCatalog } from "@/lib/sports/types"

export function SportsBoard({
  catalog: initial,
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
  const { catalog } = useSportsCatalog(initial, { sport, live, intervalMs: 10000 })
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

  const title = live ? "Live now" : sport ? sports.find((item) => item.id === sport)?.name ?? "Sports" : "All sports"

  return (
    <div className="relative mx-auto grid w-full max-w-lg gap-4 px-3 py-4 lg:max-w-[1240px] lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-4 h-40 bg-[radial-gradient(ellipse_at_top,rgba(227,27,35,0.14),transparent_70%)] lg:left-0 lg:right-[340px]"
      />

      <div className="relative grid content-start gap-4">
        <header className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--sporty)]">SPORTSBOOK</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            </div>
            {catalog && (
              <div className="rounded-xl bg-[var(--bg-elevated)] px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Live markets</p>
                <p className="font-mono text-lg font-bold text-[var(--rose)]">{catalog.liveCount}</p>
              </div>
            )}
          </div>
        </header>

        <div className="scroll-thin flex gap-2 overflow-x-auto pb-0.5">
          <Chip href="/sports" active={!sport && !live}>
            All
          </Chip>
          <Chip href="/sports?live=1" active={Boolean(live)} hot>
            Live
          </Chip>
          {sports.map((item) => (
            <Chip key={item.id} href={`/sports/${item.id}`} active={sport === item.id && !live}>
              {item.name}
            </Chip>
          ))}
        </div>

        {error && code !== "config" && code !== "schema" && <Notice>{error}</Notice>}

        {grouped.length === 0 && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
            No matches in this filter right now.
          </div>
        )}

        {grouped.map(([league, leagueEvents]) => (
          <section key={league} className="grid gap-2.5">
            <div className="flex items-center gap-2 px-0.5">
              <span className="h-4 w-1 rounded-full bg-[var(--sporty)]" />
              <h2 className="text-sm font-semibold tracking-wide text-white/90">{league}</h2>
              <span className="text-xs text-[var(--muted)]">{leagueEvents.length}</span>
            </div>
            <div className="grid gap-3">
              {leagueEvents.map((event) => (
                <MatchRow key={event.id} event={event} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function Chip({ href, active, hot, children }: { href: string; active: boolean; hot?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
        active && hot && "border-[var(--rose)] bg-[var(--rose)] text-white",
        active && !hot && "border-white bg-white text-black",
        !active && hot && "border-[rgba(255,93,115,0.3)] bg-[rgba(255,93,115,0.1)] text-[var(--rose)]",
        !active && !hot && "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-white/20 hover:text-white",
      )}
    >
      {children}
    </Link>
  )
}
