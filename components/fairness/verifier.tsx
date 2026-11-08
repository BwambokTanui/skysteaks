"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { toneForCrash } from "@/lib/format"
import { crashPoint, sha256Hex } from "@/lib/game/math"
import type { GameState } from "@/lib/game/types"

export function Verifier() {
  const [state, setState] = useState<GameState | null>(null)
  const [seed, setSeed] = useState("")
  const [roundNumber, setRoundNumber] = useState("1")
  const [hash, setHash] = useState<string | null>(null)
  const [point, setPoint] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let stop = false
    const load = async () => {
      try {
        const response = await fetch("/api/game/state", { cache: "no-store" })
        const data = await response.json()
        if (stop) return
        if (!response.ok) {
          setMessage(data.message || "Fairness data is unavailable.")
          return
        }
        setState(data)
        setMessage(null)
      } catch {
        if (!stop) setMessage("Fairness data is unavailable.")
      }
    }
    void load()
    const timer = window.setInterval(() => void load(), 2000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [])

  async function verifyValues(nextSeed: string, round: number) {
    const [nextHash, nextPoint] = await Promise.all([sha256Hex(nextSeed), crashPoint(nextSeed, round)])
    setSeed(nextSeed)
    setRoundNumber(String(round))
    setHash(nextHash)
    setPoint(nextPoint)
    setMessage(null)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const round = Number(roundNumber)
    if (!seed.trim() || !Number.isInteger(round) || round < 1) {
      setMessage("Enter the revealed server seed and round number.")
      return
    }
    await verifyValues(seed.trim(), round)
  }

  const published = state?.history.find((item) => item.roundNumber === Number(roundNumber)) ?? null

  return (
    <div className="grid gap-4">
      <Panel className="grid gap-3 p-5">
        <h2 className="text-lg font-semibold">Current commitment</h2>
        {state ? (
          <>
            <p className="text-sm text-[var(--muted)]">Round {state.round.roundNumber} is {state.round.status}.</p>
            <p className="break-all font-mono text-sm text-[var(--mint)]">{state.round.serverSeedHash}</p>
            {state.round.status === "crashed" && state.round.serverSeed && state.round.crashPoint != null && (
              <div className="grid gap-2 text-sm">
                <p className="break-all font-mono text-[var(--muted)]">{state.round.serverSeed}</p>
                <p>Revealed crash point {state.round.crashPoint.toFixed(2)}x</p>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-fit"
                  onClick={() => verifyValues(state.round.serverSeed || "", state.round.roundNumber)}
                >
                  Verify this round
                </Button>
              </div>
            )}
          </>
        ) : !message ? (
          <p className="text-sm text-[var(--muted)]">Loading the current round…</p>
        ) : null}
        {message && <Notice>{message}</Notice>}
      </Panel>

      <Panel className="grid gap-4 p-5">
        <h2 className="text-lg font-semibold">Check a revealed seed</h2>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Field label="Server seed" name="seed" value={seed} onChange={(event) => setSeed(event.target.value)} />
          <Field label="Round number" name="round" value={roundNumber} onChange={(event) => setRoundNumber(event.target.value)} inputMode="numeric" />
          <Button type="submit" className="w-fit">
            Recompute
          </Button>
        </form>
        {hash && point != null && (
          <div className="grid gap-2 text-sm">
            <p className="break-all font-mono">{hash}</p>
            <p className="font-mono text-2xl">{point.toFixed(2)}x</p>
            {published && <MatchRow label="Commitment" ok={hash === published.serverSeedHash} />}
            {published && <MatchRow label="Crash point" ok={point === published.crashPoint} />}
          </div>
        )}
      </Panel>

      <Panel className="grid gap-3 p-5">
        <h2 className="text-lg font-semibold">Recent rounds</h2>
        <div className="grid gap-2">
          {(state?.history ?? []).map((item) => (
            <button
              key={item.roundNumber}
              type="button"
              onClick={() => verifyValues(item.serverSeed, item.roundNumber)}
              className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--bg-elevated)] px-3 py-2 text-left hover:bg-[#e7ebf2]"
            >
              <span className="text-sm text-[var(--muted)]">Round {item.roundNumber}</span>
              <Pill tone={toneForCrash(item.crashPoint)}>{item.crashPoint.toFixed(2)}x</Pill>
            </button>
          ))}
          {!state?.history.length && <p className="text-sm text-[var(--muted)]">Crashed rounds show up here with their seeds.</p>}
        </div>
      </Panel>
    </div>
  )
}

function MatchRow({ label, ok }: { label: string; ok: boolean }) {
  return <p className={ok ? "text-[var(--mint)]" : "text-[var(--rose)]"}>{ok ? `${label} matches.` : `${label} does not match.`}</p>
}
