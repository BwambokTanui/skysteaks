"use client"

import Link from "next/link"
import { MatchRow } from "@/components/sports/match-row"
import { useSportsCatalog } from "@/components/sports/use-sports-catalog"
import { PlaneIcon } from "@/components/ui/plane-icon"
import type { SportsCatalog } from "@/lib/sports/types"

export function HomeLobby({ catalog: initial }: { catalog: SportsCatalog | null }) {
  const { catalog } = useSportsCatalog(initial, { intervalMs: 12000 })
  const featured = (catalog?.events ?? []).filter((event) => event.featured).slice(0, 6)
  const live = (catalog?.events ?? []).filter((event) => event.status === "live").slice(0, 6)

  return (
    <div className="relative mx-auto grid w-full max-w-lg gap-5 px-3 py-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-4 h-48 bg-[radial-gradient(ellipse_at_top,rgba(227,27,35,0.18),transparent_65%)]"
      />

      <section className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { href: "/games", label: "Games", hint: "Crash & more", tone: "from-[#e31b23] to-[#8f1016]" },
          { href: "/aviator", label: "Aviator", hint: "Fly now", tone: "from-[#2a1013] to-[#12080a]" },
          { href: "/sports/football", label: "Football", hint: "Top leagues", tone: "from-[#143528] to-[#0b1a14]" },
          { href: "/sports?live=1", label: "Live", hint: catalog ? `${catalog.liveCount} on` : "In play", tone: "from-[#1b2230] to-[#10141c]" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${item.tone} p-3.5 shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition hover:brightness-110`}
          >
            <p className="text-[15px] font-semibold">{item.label}</p>
            <p className="mt-1 text-[11px] text-white/65">{item.hint}</p>
          </Link>
        ))}
      </section>

      <Link
        href="/aviator"
        className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(120deg,#1a0c10_0%,#0b0d12_55%,#0e1a14_100%)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
      >
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(57,255,20,0.18),transparent_70%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--sporty)] text-white shadow-[0_8px_20px_rgba(227,27,35,0.4)]">
              <PlaneIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--muted)]">CRASH GAME</p>
              <p className="text-xl font-semibold tracking-tight">Aviator</p>
            </div>
          </div>
          <span className="inline-flex h-11 items-center rounded-xl bg-[var(--mint)] px-4 text-sm font-bold text-black">Play</span>
        </div>
      </Link>

      <div className="scroll-thin relative flex gap-2 overflow-x-auto pb-0.5">
        <LobbyChip href="/sports">All sports</LobbyChip>
        <LobbyChip href="/sports?live=1" hot>
          Live {catalog ? `(${catalog.liveCount})` : ""}
        </LobbyChip>
        <LobbyChip href="/sports/football">Football</LobbyChip>
        <LobbyChip href="/sports/basketball">Basketball</LobbyChip>
        <LobbyChip href="/sports/tennis">Tennis</LobbyChip>
        <LobbyChip href="/games">Games</LobbyChip>
      </div>

      {live.length > 0 && (
        <section className="relative grid gap-3">
          <SectionHead title="Live" href="/sports?live=1" action="View all" live />
          <div className="grid gap-3">
            {live.map((event) => (
              <MatchRow key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <section className="relative grid gap-3">
        <SectionHead title="Featured" href="/sports" action="Full sportsbook" />
        {featured.length === 0 ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
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
        {live && <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--rose)]" />}
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      </div>
      <Link href={href} className="text-sm font-medium text-[var(--sporty)] hover:text-white">
        {action}
      </Link>
    </div>
  )
}

function LobbyChip({ href, children, hot }: { href: string; children: React.ReactNode; hot?: boolean }) {
  return (
    <Link
      href={href}
      className={
        hot
          ? "shrink-0 rounded-full border border-[rgba(255,93,115,0.35)] bg-[rgba(255,93,115,0.12)] px-4 py-2 text-sm font-medium text-[var(--rose)]"
          : "shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-white/20 hover:text-white"
      }
    >
      {children}
    </Link>
  )
}
