"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { Page } from "@/components/ui/page"
import { Panel } from "@/components/ui/panel"
import { isFeeDepositNote } from "@/lib/fees"
import { money } from "@/lib/format"

type DepositRow = {
  id: string
  username?: string
  amountUsd: number
  requestedCrypto: number
  asset: string
  network: string
  address: string
  status: string
  note?: string | null
  createdAt: string
  userConfirmedAt: string | null
}

type WithdrawalRow = {
  id: string
  username?: string
  amountUsd: number
  destinationAsset: string
  destinationNetwork: string
  destinationAddress: string
  status: string
  commissionFee: number | null
  escrowFee: number | null
  commissionPaid?: boolean
  escrowPaid?: boolean
  createdAt: string
}

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
  deposits: DepositRow[]
  fundingDeposits?: DepositRow[]
  feeDeposits?: DepositRow[]
  withdrawals?: WithdrawalRow[]
}

export function AdminDashboard({ initial }: { initial: Overview }) {
  const [data, setData] = useState({
    ...initial,
    deposits: initial.deposits ?? [],
    fundingDeposits: initial.fundingDeposits ?? (initial.deposits ?? []).filter((item) => !isFeeDepositNote(item.note)),
    feeDeposits: initial.feeDeposits ?? (initial.deposits ?? []).filter((item) => isFeeDepositNote(item.note)),
    withdrawals: initial.withdrawals ?? [],
  })
  const [crashInput, setCrashInput] = useState(String(initial.round?.crashPoint ?? "2.00"))
  const [nextInput, setNextInput] = useState(initial.nextCrashPoint != null ? String(initial.nextCrashPoint) : "1.50")
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<"error" | "info">("info")
  const [pending, setPending] = useState(false)

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/overview", { cache: "no-store" })
    if (!response.ok) return
    const next = (await response.json()) as Overview
    setData({
      ...next,
      deposits: next.deposits ?? [],
      fundingDeposits: next.fundingDeposits ?? (next.deposits ?? []).filter((item) => !isFeeDepositNote(item.note)),
      feeDeposits: next.feeDeposits ?? (next.deposits ?? []).filter((item) => isFeeDepositNote(item.note)),
      withdrawals: next.withdrawals ?? [],
    })
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

  async function reviewDeposit(depositId: string, action: "approve" | "reject", isFee = false) {
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, depositId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || "Could not update deposit")
      setTone("info")
      setMessage(
        action === "approve"
          ? isFee
            ? "Fee payment approved (no balance credit)."
            : "Deposit approved and balance credited."
          : "Deposit rejected.",
      )
      await refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Could not update deposit")
    } finally {
      setPending(false)
    }
  }

  async function reviewWithdrawal(withdrawalId: string, action: "confirm" | "set-escrow" | "release" | "reject") {
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, withdrawalId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || "Could not update withdrawal")
      setTone("info")
      const labels: Record<typeof action, string> = {
        confirm: "Withdrawal confirmed — user can pay commission/escrow.",
        "set-escrow": "Escrow fee assigned.",
        release: "Withdrawal released (funds already reserved).",
        reject: "Withdrawal rejected and balance refunded.",
      }
      setMessage(labels[action])
      await refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Could not update withdrawal")
    } finally {
      setPending(false)
    }
  }

  const round = data.round
  const fundingDeposits = data.fundingDeposits ?? []
  const feeDeposits = data.feeDeposits ?? []
  const pendingFunding = fundingDeposits.filter((item) => item.status === "awaiting_confirmation" || item.status === "processing")
  const pendingFees = feeDeposits.filter((item) => item.status === "awaiting_confirmation" || item.status === "processing")
  const openWithdrawals = (data.withdrawals ?? []).filter(
    (item) => item.status === "processing" || item.status === "awaiting_confirmation",
  )

  return (
    <Page width="lg">
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
        <div>
          <h2 className="text-lg font-bold">Withdrawals</h2>
          <p className="text-sm text-[var(--muted)]">
            Confirm → user pays commission (first time) / escrow if set → release after fee deposits are approved.
          </p>
        </div>
        {openWithdrawals.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No open withdrawals.</p>
        ) : (
          <div className="grid gap-2">
            {openWithdrawals.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-2xl bg-[var(--bg-elevated)] p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--text)]">
                      {item.username ?? "pilot"} · {money(item.amountUsd)}
                    </p>
                    <p className="font-mono text-xs text-[var(--muted)]">
                      {item.destinationAsset} · {item.destinationNetwork}
                    </p>
                    <p className="mt-1 break-all font-mono text-[11px] text-[var(--muted)]">{item.destinationAddress}</p>
                    <p className="mt-1 text-xs capitalize text-[var(--muted)]">{item.status.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Commission:{" "}
                      {item.commissionFee == null
                        ? "waived"
                        : `${money(item.commissionFee)}${item.commissionPaid ? " · paid" : " · unpaid"}`}
                      {" · "}
                      Escrow:{" "}
                      {item.escrowFee == null
                        ? "none"
                        : `${money(item.escrowFee)}${item.escrowPaid ? " · paid" : " · unpaid"}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.status === "processing" && (
                      <Button type="button" disabled={pending} onClick={() => void reviewWithdrawal(item.id, "confirm")}>
                        Confirm
                      </Button>
                    )}
                    {item.status === "awaiting_confirmation" && (
                      <>
                        <Button type="button" disabled={pending} onClick={() => void reviewWithdrawal(item.id, "set-escrow")}>
                          Set escrow
                        </Button>
                        <Button type="button" disabled={pending} onClick={() => void reviewWithdrawal(item.id, "release")}>
                          Release
                        </Button>
                      </>
                    )}
                    <Button type="button" variant="ghost" disabled={pending} onClick={() => void reviewWithdrawal(item.id, "reject")}>
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {(data.withdrawals ?? []).filter((item) => item.status === "approved" || item.status === "rejected").slice(0, 8).length > 0 && (
          <div className="grid gap-1 border-t border-[var(--line)] pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Recent reviewed</p>
            {(data.withdrawals ?? [])
              .filter((item) => item.status === "approved" || item.status === "rejected")
              .slice(0, 8)
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>
                    {item.username ?? "pilot"} · {money(item.amountUsd)}
                  </span>
                  <span className="capitalize text-[var(--muted)]">{item.status}</span>
                </div>
              ))}
          </div>
        )}
      </Panel>

      <Panel className="grid gap-3 p-5">
        <div>
          <h2 className="text-lg font-bold">Commission & escrow fees</h2>
          <p className="text-sm text-[var(--muted)]">Approve after on-chain match — does not credit play balance.</p>
        </div>
        {pendingFees.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No open fee payments.</p>
        ) : (
          <div className="grid gap-2">
            {pendingFees.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-2xl bg-[var(--bg-elevated)] p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--text)]">
                      {item.username ?? "pilot"} · {money(item.amountUsd)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{item.note}</p>
                    <p className="font-mono text-xs text-[var(--muted)]">
                      {item.requestedCrypto} {item.asset} · {item.network}
                    </p>
                    <p className="mt-1 break-all font-mono text-[11px] text-[var(--muted)]">{item.address}</p>
                    <p className="mt-1 text-xs capitalize text-[var(--muted)]">{item.status.replaceAll("_", " ")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={pending || item.status !== "awaiting_confirmation"}
                      onClick={() => void reviewDeposit(item.id, "approve", true)}
                    >
                      Approve fee
                    </Button>
                    <Button type="button" variant="ghost" disabled={pending} onClick={() => void reviewDeposit(item.id, "reject", true)}>
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="grid gap-3 p-5">
        <div>
          <h2 className="text-lg font-bold">Crypto deposits</h2>
          <p className="text-sm text-[var(--muted)]">Approve only after the user taps “I’ve sent it” and you see the transfer.</p>
        </div>
        {pendingFunding.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No open deposit requests.</p>
        ) : (
          <div className="grid gap-2">
            {pendingFunding.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-2xl bg-[var(--bg-elevated)] p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--text)]">
                      {item.username ?? "pilot"} · {money(item.amountUsd)}
                    </p>
                    <p className="font-mono text-xs text-[var(--muted)]">
                      {item.requestedCrypto} {item.asset} · {item.network}
                    </p>
                    <p className="mt-1 break-all font-mono text-[11px] text-[var(--muted)]">{item.address}</p>
                    <p className="mt-1 text-xs capitalize text-[var(--muted)]">{item.status.replaceAll("_", " ")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={pending || item.status !== "awaiting_confirmation"}
                      onClick={() => void reviewDeposit(item.id, "approve")}
                    >
                      Approve
                    </Button>
                    <Button type="button" variant="ghost" disabled={pending} onClick={() => void reviewDeposit(item.id, "reject")}>
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {fundingDeposits.filter((item) => item.status === "approved" || item.status === "rejected").slice(0, 8).length > 0 && (
          <div className="grid gap-1 border-t border-[var(--line)] pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Recent reviewed</p>
            {fundingDeposits
              .filter((item) => item.status === "approved" || item.status === "rejected")
              .slice(0, 8)
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>
                    {item.username ?? "pilot"} · {money(item.amountUsd)}
                  </span>
                  <span className="capitalize text-[var(--muted)]">{item.status}</span>
                </div>
              ))}
          </div>
        )}
      </Panel>

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
                <span>
                  {money(ticket.stake)} @ {ticket.totalOdds.toFixed(2)}
                </span>
                <span className="capitalize">{ticket.status}</span>
                <span className="font-mono">{money(ticket.potentialPayout)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </Page>
  )
}
