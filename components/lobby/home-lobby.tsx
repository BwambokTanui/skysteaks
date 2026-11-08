"use client"

import Link from "next/link"
import { SportsBoard } from "@/components/sports/sports-board"
import { PlaneIcon } from "@/components/ui/plane-icon"
import type { SportsCatalog } from "@/lib/sports/types"

export function HomeLobby({
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
  return (
    <SportsBoard
      catalog={catalog}
      error={error}
      code={code}
      sport={sport}
      live={live}
      hero={
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
      }
    />
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M8 5.5v13l11-6.5L8 5.5Z" />
    </svg>
  )
}
