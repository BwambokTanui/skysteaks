"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { Panel } from "@/components/ui/panel"
import { money } from "@/lib/format"

type Overview = {
  serverNow: string
  round: {
    id: string
    roundNumber: number
    status: string
    serverSeed: string
    serverSeedHash: string
    crashPoint: number
    flyMs: number
    forced: boolean
    bettingEndsAt: string
    flyingStartedAt: string | null
  } | null
  nextCrashPoint: number | null
  users: { id: string; username: string; balance: number; isAdmin: boolean; createdAt: string }[]
  tickets: { id: string; userId: string; stake: number; totalOdds: number; potentialPayout: number; status: string; createdAt: string }[]
  liveEvents: number
  history: { roundNumber: number; crashPoint: number; forced: boolean; status: string }[]
}

export function AdminDashboard({ initial }: { initial: Overview }) {
  const [data, setData] = useState(initial)
  const [crashInput, setCrashInput] = useState(String(initial.round?.crashPoint ?? "2.00"))
  const [nextInput, setNextInput] = useState(initial.nextCrashPoint != null ? String(initial.nextCrashPoint) : "1.50")
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<"error" | "info">("info")
  const [pending, setPending] = useState(false)

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/overview", { cache: "no-store" })
    if (!response.ok) return
    const next = (await response.json()) as Overview
    setData(next)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 2000)
    return () => window.clearInterval(timer)
  }, [refresh])

  async function runAviator(action: string, crashPoint?: string) {
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/aviator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, crashPoint: crashPoint != null ? Number(crashPoint) : undefined }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || "Action failed")
      setTone("info")
      setMessage(action === "clear-next" ? "Next crash override cleared." : "Aviator control updated.")
      await refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Action failed")
    } finally {
      setPending(false)
    }
  }

  async function setBalance(userId: string, balance: string) {
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-balance", userId, balance: Number(balance) }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || "Could not update balance")
      setTone("info")
      setMessage("Balance updated.")
      await refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Could not update balance")
    } finally {
      setPending(false)
    }
  }

  async function setAdmin(userId: string, isAdmin: boolean) {
    setPending(true)
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-admin", userId, isAdmin }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || "Could not update admin flag")
      setTone("info")
      setMessage(isAdmin ? "Admin granted." : "Admin removed.")
      await refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Could not update admin flag")
    } finally {
      setPending(false)
    }
  }

  const round = data.round

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 px-3 py-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--sporty)]">ADMIN</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text)]">Control center</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Full Aviator foresight, user balances, and sportsbook pulse.</p>
      </div>

      {message && <Notice tone={tone}>{message}</Notice>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="grid gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--sporty)]">AVIATOR LIVE</p>
              <h2 className="mt-1 text-xl font-bold">Round {round?.roundNumber ?? "—"}</h2>
              <p className="mt-1 text-sm capitalize text-[var(--muted)]">{round?.status ?? "offline"}{round?.forced ? " · forced" : ""}</p>
            </div>
            <div className="rounded-2xl bg-[#ffe8ea] px-4 py-3 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sporty)]">Stops at</p>
              <p className="font-mono text-3xl font-bold text-[var(--sporty)]">{round ? `${round.crashPoint.toFixed(2)}x` : "—"}</p>
            </div>
          </div>

          <div className="grid gap-2 rounded-2xl bg-[var(--bg-elevated)] p-3 text-xs text-[var(--muted)]">
            <p>
              <span className="font-semibold text-[var(--text)]">Fly duration:</span> {round ? `${(round.flyMs / 1000).toFixed(2)}s` : "—"}
            </p>
            <p className="break-all">
              <span className="font-semibold text-[var(--text)]">Seed:</span> {round?.serverSeed ?? "—"}
            </p>
            <p className="break-all">
              <span className="font-semibold text-[var(--text)]">Hash:</span> {round?.serverSeedHash ?? "—"}
            </p>
          </div>

          <Field label="Force current round crash (betting only)" value={crashInput} onChange={(event) => setCrashInput(event.target.value)} inputMode="decimal" />
          <Button type="button" disabled={pending || round?.status !== "betting"} onClick={() => void runAviator("force-current", crashInput)}>
            Set current stop
          </Button>
        </Panel>

        <Panel className="grid gap-4 p-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--sporty)]">NEXT ROUND</p>
            <h2 className="mt-1 text-xl font-bold">Queued stop</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {data.nextCrashPoint != null ? `Next crash locked at ${data.nextCrashPoint.toFixed(2)}x` : "No override — next round uses fair seed math."}
            </p>
          </div>
          <Field label="Next round crash point" value={nextInput} onChange={(event) => setNextInput(event.target.value)} inputMode="decimal" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => void runAviator("set-next", nextInput)}>
              Queue next stop
            </Button>
            <Button type="button" variant="ghost" disabled={pending || data.nextCrashPoint == null} onClick={() => void runAviator("clear-next")}>
              Clear queue
            </Button>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-semibold text-[var(--text)]">Recent rounds</p>
            <div className="grid max-h-56 gap-1 overflow-auto">
              {data.history.map((item) => (
                <div key={item.roundNumber} className="flex items-center justify-between rounded-xl bg-[var(--bg-elevated)] px-3 py-2 text-sm">
                  <span className="text-[var(--muted)]">#{item.roundNumber}</span>
                  <span className="font-mono font-bold">{item.crashPoint.toFixed(2)}x</span>
                  <span className="text-xs text-[var(--muted)]">{item.forced ? "forced" : item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <Panel className="grid gap-3 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Players</h2>
            <p className="text-sm text-[var(--muted)]">Live sports events: {data.liveEvents}</p>
          </div>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="px-2 py-2 font-medium">User</th>
                <th className="px-2 py-2 font-medium">Balance</th>
                <th className="px-2 py-2 font-medium">Role</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-t border-[var(--line)]">
                  <td className="px-2 py-3 font-semibold">{user.username}</td>
                  <td className="px-2 py-3 font-mono">{money(user.balance)}</td>
                  <td className="px-2 py-3">{user.isAdmin ? "Admin" : "Player"}</td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-xs font-semibold"
                        disabled={pending}
                        onClick={() => {
                          const value = window.prompt(`New balance for ${user.username}`, String(user.balance))
                          if (value != null) void setBalance(user.id, value)
                        }}
                      >
                        Set balance
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-xs font-semibold"
                        disabled={pending}
                        onClick={() => void setAdmin(user.id, !user.isAdmin)}
                      >
                        {user.isAdmin ? "Revoke admin" : "Make admin"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="grid gap-3 p-5">
        <h2 className="text-lg font-bold">Recent sports tickets</h2>
        {data.tickets.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No tickets yet.</p>
        ) : (
          <div className="grid gap-2">
            {data.tickets.map((ticket) => (
              <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--bg-elevated)] px-3 py-2 text-sm">
                <span className="font-mono text-xs text-[var(--muted)]">{ticket.id.slice(0, 8)}</span>
                <span>{money(ticket.stake)} @ {ticket.totalOdds.toFixed(2)}</span>
                <span className="capitalize">{ticket.status}</span>
                <span className="font-mono">{money(ticket.potentialPayout)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
