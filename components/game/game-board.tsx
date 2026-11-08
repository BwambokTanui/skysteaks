"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { BetPanel } from "@/components/game/bet-panel"
import { CashoutFloats, useCashoutCrowd } from "@/components/game/cashout-floats"
import { FlightStage } from "@/components/game/flight-stage"
import { HistoryRail } from "@/components/game/history-rail"
import { SetupNotice } from "@/components/game/setup-notice"
import { useGameState } from "@/components/game/use-game-state"
import { useBalance } from "@/components/layout/balance"
import { formatClock, usd } from "@/lib/format"

export function GameBoard() {
  const { state, message, code, apply } = useGameState()
  const { balance } = useBalance()
  const [clock, setClock] = useState(formatClock())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(formatClock()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const { floats, inPlay: crowdInPlay, total: crowdTotal } = useCashoutCrowd({
    round: state?.round ?? null,
    liveBets: state?.liveBets ?? [],
  })

  if (!state && (code === "config" || code === "schema")) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <SetupNotice message={message} />
      </div>
    )
  }

  const username = state?.me?.username ?? "Pilot"
  const flying = state?.round.status === "flying"

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-[#07090e] text-white">
      <header className="flex h-12 shrink-0 items-center justify-between bg-[linear-gradient(90deg,#c8161d,#e31b23_55%,#ff4d55)] px-3 shadow-[0_8px_24px_rgba(227,27,35,0.35)]">
        <Link href="/games" className="grid h-9 w-9 place-items-center rounded-full bg-black/15 text-2xl font-light leading-none" aria-label="Close">
          ×
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-white/80">SKYSTEAKS</p>
          <h1 className="text-[17px] font-bold tracking-wide">Aviator</h1>
        </div>
        <Link href="/wallet/history" className="grid h-9 w-9 place-items-center rounded-full bg-black/15" aria-label="Deposit history">
          <HistoryIcon />
        </Link>
      </header>

      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 bg-[#0c1018] px-3 py-2.5">
        <Link
          href="/wallet?tab=withdraw"
          className="inline-flex items-center gap-2 rounded-full bg-[#121826] px-3 py-1.5 ring-1 ring-[#39ff14]/25 transition hover:bg-[#172033]"
        >
          <WalletIcon />
          <span className="font-mono text-[15px] font-bold text-[#9dffb0]">{balance == null ? "USD —" : usd(balance)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6f7b91]">Withdraw</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/wallet?tab=deposit"
            className="rounded-full bg-[var(--sporty)] px-3 py-1.5 text-xs font-bold text-white shadow-[0_8px_18px_rgba(227,27,35,0.35)]"
          >
            Deposit
          </Link>
          <Link href="/fairness" className="grid h-8 w-8 place-items-center rounded-full bg-[#121826] text-[#9aa3b5]" aria-label="Fairness">
            <SettingsIcon />
          </Link>
        </div>
      </div>

      <Link href="/wallet/history" className="block shrink-0 border-b border-white/5 bg-[#0a0d14] px-3 py-2 transition hover:bg-[#10151f]">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d879a]">Round history · tap for wallet history</p>
          <span className="text-[10px] font-semibold text-[#e31b23]">Open ›</span>
        </div>
        <HistoryRail history={state?.history ?? []} inPlay={flying} />
      </Link>

      {message && code !== "config" && code !== "schema" && (
        <p className="shrink-0 bg-[#2a1216] px-3 py-2 text-xs text-[#ff5d73]">{message}</p>
      )}

      <div className="relative min-h-0 flex-1">
        <FlightStage
          round={state?.round ?? null}
          serverNow={state?.serverNow ?? null}
          players={crowdInPlay}
          className="absolute inset-0"
        />
        <CashoutFloats items={floats} />

        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex items-start justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1b2433] ring-2 ring-[#e31b23]/50">
              <RankBadge />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold drop-shadow">{username}</p>
              <p className="text-[11px] text-[#b7becc] drop-shadow">Online · USD table</p>
            </div>
          </div>
        </div>

        <div className="absolute left-3 top-[52px] z-10">
          <button type="button" className="inline-flex items-center gap-1.5 rounded-full bg-[#1b2230]/85 px-2.5 py-1 text-xs text-white backdrop-blur">
            <UsersIcon />
            {crowdInPlay}/{crowdTotal}
          </button>
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-white/5 bg-[#080b11] px-2.5 pb-1 pt-2">
        <BetPanel slot={0} state={state} onState={apply} />
        <BetPanel slot={1} state={state} onState={apply} />
      </div>

      <div className="flex shrink-0 items-center justify-between px-3 py-2 text-[10px] text-[#6b7280]">
        <span>SkySteaks · USD</span>
        <span>{clock}</span>
      </div>
    </div>
  )
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#39ff14]" fill="currentColor">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v1H7.5a.5.5 0 0 0 0 1H20a1 1 0 0 1 1 1v7.5A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Zm14.25 7.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h10M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM4 17h6M10 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM16 17h4M4 12h4M8 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM14 12h6" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M9 11a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 9 11Zm7.5 0A3 3 0 1 0 13.5 8 3 3 0 0 0 16.5 11ZM3 18.5C3 16 5.5 14 9 14s6 2 6 4.5V20H3Zm11.5 0c0-1.4.5-2.6 1.4-3.5 1.2-.6 2.6-.9 4.1-.9 2.7 0 5 1.4 5 3.4V20h-10.5Z" />
    </svg>
  )
}

function RankBadge() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#ff8d96]" fill="currentColor">
      <path d="M12 2 4.5 6v5.5c0 5 3.4 8.7 7.5 10 4.1-1.3 7.5-5 7.5-10V6L12 2Zm0 4.2 1.4 2.8 3.1.3-2.4 2.1.7 3-2.8-1.6-2.8 1.6.7-3-2.4-2.1 3.1-.3L12 6.2Z" />
    </svg>
  )
}
