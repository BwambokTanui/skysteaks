"use client"

import Link from "next/link"
import { useMemo } from "react"
import { MatchRow } from "@/components/sports/match-row"
import { useSportsCatalog } from "@/components/sports/use-sports-catalog"
import { SetupNotice } from "@/components/game/setup-notice"
import { Notice } from "@/components/ui/notice"
import { cn } from "@/lib/cn"
import type { SportsCatalog } from "@/lib/sports/types"

function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function tomorrowISO() {
  const now = new Date()
  now.setDate(now.getDate() + 1)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function SportsBoard({
  catalog: initial,
  error,
  code,
  sport,
  live,
  league,
  day,
  hero,
}: {
  catalog: SportsCatalog | null
  error?: string | null
  code?: "config" | "schema" | "error" | null
  sport?: string | null
  live?: boolean
  league?: string | null
  day?: string | null
  hero?: React.ReactNode
}) {
  const { catalog } = useSportsCatalog(initial, { sport, live, league, day, intervalMs: 10000 })
  const sports = catalog?.sports ?? []
  const events = catalog?.events ?? []
  const counts = catalog?.counts ?? { live: catalog?.liveCount ?? 0, football: 0, premierLeague: 0, laLiga: 0 }

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

  const title = live
    ? "Live now"
    : league === "premier_league"
      ? "Premier League"
      : league === "la_liga"
        ? "La Liga"
        : day === "today"
          ? "Today"
          : sport
            ? sports.find((item) => item.id === sport)?.name ?? "Sports"
            : "All sports"

  const today = todayISO()
  const tomorrow = tomorrowISO()

  return (
    <div className="relative mx-auto grid w-full max-w-lg gap-4 px-3 py-4">
      {hero}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickCard href="/?live=1" label="Live" count={counts.live} hot active={Boolean(live) && !league && !sport && !day} />
        <QuickCard href="/?sport=football" label="Football" count={counts.football} active={sport === "football" && !live && !league && !day} />
        <QuickCard
          href="/?league=premier_league"
          label="Premier League"
          count={counts.premierLeague}
          active={league === "premier_league"}
        />
        <QuickCard href="/?league=la_liga" label="La Liga" count={counts.laLiga} active={league === "la_liga"} />
      </div>

      <div className="scroll-thin flex gap-2 overflow-x-auto pb-0.5">
        <DayChip href="/" active={!day && !live && !league && !sport}>
          All
        </DayChip>
        <DayChip href={`/?day=today`} active={day === "today"}>
          Today
        </DayChip>
        <DayChip href={`/?day=${tomorrow}`} active={day === tomorrow}>
          Tomorrow
        </DayChip>
        <span className="sr-only">{today}</span>
      </div>

      <div className="scroll-thin flex gap-2 overflow-x-auto pb-0.5">
        <Chip href="/" active={!sport && !live && !league && !day}>
          All Sports
        </Chip>
        <Chip href="/?live=1" active={Boolean(live)} hot>
          Live {catalog ? `(${catalog.liveCount})` : ""}
        </Chip>
        {sports.map((item) => (
          <Chip key={item.id} href={`/?sport=${item.id}`} active={sport === item.id && !live && !league && !day}>
            {item.name}
          </Chip>
        ))}
      </div>

      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--sporty)]">SPORTSBOOK</p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-[var(--text)]">{title}</h1>
        </div>
        {catalog && (
          <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-[var(--shadow)]">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Live</p>
            <p className="font-mono text-base font-bold text-[var(--sporty)]">{catalog.liveCount}</p>
          </div>
        )}
      </div>

      {error && code !== "config" && code !== "schema" && <Notice>{error}</Notice>}

      {grouped.length === 0 && (
        <div className="rounded-[24px] border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)] shadow-[var(--shadow)]">
          No matches in this filter right now.
        </div>
      )}

      {grouped.map(([leagueName, leagueEvents]) => (
        <section key={leagueName} className="grid gap-2.5">
          <div className="flex items-center gap-2 px-0.5">
            <span className="h-4 w-1 rounded-full bg-[var(--sporty)]" />
            <h2 className="text-sm font-bold tracking-wide text-[var(--text)]">{leagueName}</h2>
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
  )
}

function QuickCard({
  href,
  label,
  count,
  active,
  hot,
}: {
  href: string
  label: string
  count: number
  active?: boolean
  hot?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-2xl border px-3 py-3 shadow-[var(--shadow)] transition",
        active && "border-[var(--sporty)] bg-[var(--sporty)] text-white",
        !active && hot && "border-[#ffd0d4] bg-[#fff5f6] text-[var(--sporty)]",
        !active && !hot && "border-[var(--line)] bg-white text-[var(--text)]",
      )}
    >
      <p className={cn("text-[11px] font-semibold uppercase tracking-[0.12em]", active ? "text-white/80" : "text-[var(--muted)]")}>
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-bold">{count}</p>
    </Link>
  )
}

function DayChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 border-b-2 px-3 py-1.5 text-sm font-semibold transition",
        active ? "border-[var(--sporty)] text-[var(--sporty)]" : "border-transparent text-[var(--muted)]",
      )}
    >
      {children}
    </Link>
  )
}

function Chip({ href, active, hot, children }: { href: string; active: boolean; hot?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-semibold shadow-[var(--shadow)] transition",
        active && "bg-[var(--sporty)] text-white shadow-[0_8px_18px_rgba(227,27,35,0.28)]",
        !active && hot && "bg-[#ffe8ea] text-[var(--sporty)]",
        !active && !hot && "bg-white text-[var(--text)]",
      )}
    >
      {children}
    </Link>
  )
}
