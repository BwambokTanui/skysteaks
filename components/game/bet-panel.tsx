"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore } from "react"
import { useBalance } from "@/components/layout/balance"
import { signedMoney, usd } from "@/lib/format"
import { getMultiplier, subscribeMultiplier } from "@/lib/game/ticker"
import type { GameState } from "@/lib/game/types"

function useMultiplier() {
  return useSyncExternalStore(subscribeMultiplier, getMultiplier, () => 1)
}

async function send(url: string, body: object) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || "Request failed")
  return data as GameState
}

export function BetPanel({
  slot,
  state,
  onState,
}: {
  slot: 0 | 1
  state: GameState | null
  onState: (state: GameState) => void
}) {
  const { balance } = useBalance()
  const multiplier = useMultiplier()
  const [amount, setAmount] = useState("0.20")
  const [autoOn, setAutoOn] = useState(false)
  const [auto, setAuto] = useState(2)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stake = Number(amount)
  const tooLow = !Number.isFinite(stake) || stake < 10

  const autoLabel = useMemo(() => {
    if (!autoOn) return "Off"
    return `${auto.toFixed(2)}x`
  }, [autoOn, auto])

  function setAmountSafe(next: number) {
    const cap = Math.min(5000, balance ?? 5000)
    const clamped = Math.min(cap, Math.max(0.2, Math.round(next * 100) / 100))
    setAmount(clamped.toFixed(2))
  }

  async function run(task: () => Promise<GameState>) {
    setPending(true)
    setError(null)
    try {
      onState(await task())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed")
    } finally {
      setPending(false)
    }
  }

  if (!state) {
    return <div className="rounded-[14px] bg-[#1a1e27] p-3 text-sm text-[#8b93a7]">Connecting…</div>
  }

  const bet = state.myBets.find((item) => item.slot === slot) ?? null
  const betting = state.round.status === "betting"
  const flying = state.round.status === "flying"
  const showAmount = !bet || bet.status === "cancelled"

  return (
    <section className="rounded-[14px] bg-[#1a1e27] p-2.5">
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-2.5">
        <div className="grid gap-1.5">
          {showAmount && tooLow && (
            <div className="relative z-10 w-fit rounded-md bg-[#2c3340] px-2 py-1 text-[10px] text-white">
              Minimum amount is USD 10
              <span className="absolute -bottom-1 left-5 h-2 w-2 rotate-45 bg-[#2c3340]" />
            </div>
          )}

          {showAmount && (
            <div className="flex items-center gap-1.5">
              <RoundBtn onClick={() => setAmountSafe(stake - 1)} ariaLabel="Decrease stake">
                −
              </RoundBtn>
              <div className="grid h-10 flex-1 place-items-center rounded-xl bg-[#0f1218] font-mono text-[13px] text-white">
                {usd(Number.isFinite(stake) ? stake : 0)}
              </div>
              <RoundBtn onClick={() => setAmountSafe(stake + 1)} ariaLabel="Increase stake">
                +
              </RoundBtn>
            </div>
          )}

          {bet?.status === "open" && (
            <div className="grid h-10 place-items-center rounded-xl bg-[#0f1218] font-mono text-[13px] text-white">
              {usd(bet.amount)}
            </div>
          )}

          {(bet?.status === "cashed" || bet?.status === "lost") && (
            <div className="grid h-10 place-items-center rounded-xl bg-[#0f1218] font-mono text-[13px]">
              <span className={bet.status === "cashed" ? "text-[#39ff14]" : "text-[#ff5d73]"}>
                {signedMoney(bet.profit ?? (bet.status === "lost" ? -bet.amount : 0))}
              </span>
            </div>
          )}

          <div className="grid gap-1">
            <div className="flex items-center justify-between text-[11px] text-[#9aa3b5]">
              <span>Auto Cash Out: {autoLabel}</span>
              <button
                type="button"
                onClick={() => setAutoOn((value) => !value)}
                className={`relative h-[18px] w-8 rounded-full transition ${autoOn ? "bg-[#39ff14]" : "bg-[#3a4050]"}`}
                aria-label="Toggle auto cash out"
              >
                <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition ${autoOn ? "left-[14px]" : "left-[2px]"}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#8b93a7]">OFF</span>
              <input
                type="range"
                min={1.1}
                max={100}
                step={0.1}
                value={auto}
                disabled={!autoOn || Boolean(bet && bet.status === "open")}
                onChange={(event) => setAuto(Number(event.target.value))}
                className="h-1.5 w-full accent-[#39ff14] disabled:opacity-40"
              />
              <span className="text-[9px] text-[#8b93a7]">MAX</span>
            </div>
          </div>
        </div>

        <div className="relative">
          {!state.authenticated && (
            <Link
              href="/login"
              className="grid h-full min-h-[88px] w-full place-content-center rounded-[12px] bg-[linear-gradient(180deg,#4cff2e_0%,#1f9a14_100%)] px-2 text-center text-sm font-semibold text-black"
            >
              Sign in
            </Link>
          )}

          {state.authenticated && showAmount && (
            <button
              type="button"
              disabled={pending || tooLow || stake > 5000}
              onClick={() => {
                if (stake < 10) {
                  setError("Minimum amount is USD 10")
                  return
                }
                void run(() =>
                  send("/api/game/bet", {
                    roundId: state.round.id,
                    amount: stake,
                    slot,
                    autoCashout: autoOn ? auto : null,
                  }),
                )
              }}
              className="relative grid h-full min-h-[88px] w-full place-content-center rounded-[12px] bg-[linear-gradient(180deg,#4cff2e_0%,#1f9a14_100%)] px-2 text-center font-semibold text-black disabled:opacity-40"
            >
              <span className="text-[15px] leading-tight">Place bet</span>
              <span className="text-[11px] font-medium opacity-80">for the next round</span>
              <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/20 text-[10px] text-white">↻</span>
            </button>
          )}

          {state.authenticated && bet?.status === "open" && betting && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => send("/api/game/cancel", { betId: bet.id }))}
              className="grid h-full min-h-[88px] w-full place-content-center rounded-[12px] bg-[#ff5d73] px-2 text-center font-semibold text-white"
            >
              Cancel
            </button>
          )}

          {state.authenticated && bet?.status === "open" && flying && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => send("/api/game/cashout", { betId: bet.id }))}
              className="grid h-full min-h-[88px] w-full place-content-center rounded-[12px] bg-[linear-gradient(180deg,#ffd27a,#e0a03a)] px-2 text-center font-semibold text-black"
            >
              <span className="text-[15px] leading-tight">Cash out</span>
              <span className="font-mono text-[11px]">{usd(bet.amount * multiplier)}</span>
            </button>
          )}

          {state.authenticated && bet?.status === "open" && !betting && !flying && (
            <div className="grid h-full min-h-[88px] place-content-center rounded-[12px] bg-[#2a2f3a] text-sm text-[#8b93a7]">Settling…</div>
          )}

          {state.authenticated && bet?.status === "cashed" && (
            <div className="grid h-full min-h-[88px] place-content-center rounded-[12px] bg-[#1f7a3a] px-2 text-center text-sm font-semibold text-[#7dff9a]">
              Cashed {bet.cashoutMultiplier?.toFixed(2)}x
            </div>
          )}

          {state.authenticated && bet?.status === "lost" && (
            <div className="grid h-full min-h-[88px] place-content-center rounded-[12px] bg-[#4a1d24] px-2 text-center text-sm font-semibold text-[#ff5d73]">
              Flew away
            </div>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-[#ff5d73]">{error}</p>}
    </section>
  )
}

function RoundBtn({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-xl bg-[#2a3140] text-lg text-white"
    >
      {children}
    </button>
  )
}
