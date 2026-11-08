"use client"

import Link from "next/link"
import { MatchRow } from "@/components/sports/match-row"
import { useSportsCatalog } from "@/components/sports/use-sports-catalog"
import { PlaneIcon } from "@/components/ui/plane-icon"
import { cn } from "@/lib/cn"
import type { SportsCatalog } from "@/lib/sports/types"

export function HomeLobby({ catalog: initial }: { catalog: SportsCatalog | null }) {
  const { catalog } = useSportsCatalog(initial, { intervalMs: 12000 })
  const featured = (catalog?.events ?? []).filter((event) => event.featured).slice(0, 6)
  const live = (catalog?.events ?? []).filter((event) => event.status === "live").slice(0, 6)

  return (
    <div className="mx-auto grid w-full max-w-lg gap-5 px-3 py-4">
      <Link
        href="/aviator"
        className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(120deg,#fff1f2_0%,#ffe4e6_45%,#ffffff_100%)] p-5 shadow-[var(--shadow-lg)]"
      >
        <div className="absolute -right-6 -top-8 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(227,27,35,0.16),transparent_70%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--sporty)] text-white shadow-[0_8px_20px_rgba(227,27,35,0.35)]">
              <PlaneIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--muted)]">CRASH GAME</p>
              <p className="text-xl font-bold tracking-tight text-[var(--text)]">Aviator</p>
            </div>
          </div>
          <span className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--sporty)] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(227,27,35,0.3)]">
            <PlayIcon />
            Play
          </span>
        </div>
      </Link>

      <div className="scroll-thin flex gap-2 overflow-x-auto pb-0.5">
        <LobbyChip href="/sports" active>
          All Sports
        </LobbyChip>
        <LobbyChip href="/sports?live=1" hot>
          Live {catalog ? `(${catalog.liveCount})` : ""}
        </LobbyChip>
        <LobbyChip href="/sports/football">Football</LobbyChip>
        <LobbyChip href="/sports/basketball">Basketball</LobbyChip>
        <LobbyChip href="/sports/tennis">Tennis</LobbyChip>
      </div>

      {live.length > 0 && (
        <section className="grid gap-3">
          <SectionHead title="Live" href="/sports?live=1" action="View all" live />
          <div className="grid gap-3">
            {live.map((event) => (
              <MatchRow key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3">
        <SectionHead title="Featured" href="/sports" action="Full sportsbook" />
        {featured.length === 0 ? (
          <div className="rounded-[24px] border border-[var(--line)] bg-white p-5 text-sm text-[var(--muted)] shadow-[var(--shadow)]">
            Connect Supabase and run supabase/schema.sql plus supabase/sports.sql to load the sportsbook.
          </div>
        ) : (
          <div className="grid gap-3">
            {featured.map((event) => (
              <MatchRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SectionHead({ title, href, action, live }: { title: string; href: string; action: string; live?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {live && <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--sporty)]" />}
        <h2 className="text-lg font-bold tracking-tight text-[var(--text)]">{title}</h2>
      </div>
      <Link href={href} className="text-sm font-semibold text-[var(--sporty)]">
        {action}
      </Link>
    </div>
  )
}

function LobbyChip({ href, children, hot, active }: { href: string; children: React.ReactNode; hot?: boolean; active?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-semibold shadow-[var(--shadow)]",
        active && "bg-[var(--sporty)] text-white",
        hot && !active && "bg-[#ffe8ea] text-[var(--sporty)]",
        !active && !hot && "bg-white text-[var(--text)]",
      )}
    >
      {children}
    </Link>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M8 5.5v13l11-6.5L8 5.5Z" />
    </svg>
  )
}
