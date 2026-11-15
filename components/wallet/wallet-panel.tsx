"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useBalance } from "@/components/layout/balance"
import { DepositFlow } from "@/components/wallet/deposit-flow"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { Panel } from "@/components/ui/panel"
import { cn } from "@/lib/cn"
import { formatTime, usd } from "@/lib/format"
import { WITHDRAWAL_NETWORK_FEE_USD } from "@/lib/fees"

const QUICK = ["50", "100", "200", "500", "1000"]

type Withdrawal = {
  id: string
  amountUsd: number
  networkFeeUsd: number
  destinationAsset: string
  destinationNetwork: string
  destinationAddress: string
  status: string
  commissionFee: number | null
  escrowFee: number | null
  createdAt: string
}

export function WalletPanel({
  tab = "deposit",
  commissionWithdrawalId = null,
  escrowWithdrawalId = null,
}: {
  tab?: "deposit" | "withdraw"
  commissionWithdrawalId?: string | null
  escrowWithdrawalId?: string | null
}) {
  const router = useRouter()
  const { balance, setBalance } = useBalance()
  const [amount, setAmount] = useState("100")
  const [address, setAddress] = useState("")
  const [asset, setAsset] = useState("USDT")
  const [network, setNetwork] = useState("TRC-20")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<"error" | "info">("info")
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [commissionPaid, setCommissionPaid] = useState(false)
  const [feeMode, setFeeMode] = useState<{ kind: "commission" | "escrow"; withdrawalId: string; amountUsd: number } | null>(null)

  const refreshWithdrawals = useCallback(async () => {
    const response = await fetch("/api/wallet/withdrawals", { cache: "no-store" })
    if (!response.ok) return
    const data = await response.json()
    setWithdrawals(data.withdrawals ?? [])
    setCommissionPaid(Boolean(data.commissionPaid))
  }, [])

  useEffect(() => {
    void refreshWithdrawals()
  }, [refreshWithdrawals])

  useEffect(() => {
    async function loadFee() {
      const id = commissionWithdrawalId || escrowWithdrawalId
      if (!id) {
        setFeeMode(null)
        return
      }
      await refreshWithdrawals()
      const response = await fetch("/api/wallet/withdrawals", { cache: "no-store" })
      if (!response.ok) return
      const data = await response.json()
      const row = ((data.withdrawals ?? []) as Withdrawal[]).find((item) => item.id === id)
      if (!row) return
      if (commissionWithdrawalId && row.commissionFee != null) {
        setFeeMode({ kind: "commission", withdrawalId: row.id, amountUsd: row.commissionFee })
      } else if (escrowWithdrawalId && row.escrowFee != null) {
        setFeeMode({ kind: "escrow", withdrawalId: row.id, amountUsd: row.escrowFee })
      }
    }
    void loadFee()
  }, [commissionWithdrawalId, escrowWithdrawalId, refreshWithdrawals])

  async function withdraw() {
    setPending(true)
    setMessage(null)
    try {
      const value = Number(amount)
      if (!Number.isFinite(value) || value < 10) throw new Error("Minimum withdrawal is USD 10.")
      if (balance != null && value > balance) throw new Error("Insufficient balance.")
      if (address.trim().length < 8) throw new Error("Enter a valid payout address.")
      const response = await fetch("/api/wallet/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, asset, network, address: address.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Withdrawal failed")
      if (typeof data.withdrawal?.amountUsd === "number" && balance != null) {
        setBalance(Math.max(0, balance - Number(data.withdrawal.amountUsd)))
      }
      setTone("info")
      setMessage(
        data.withdrawal?.commissionFee
          ? `Withdrawal submitted. After admin confirms, pay the one-time commission fee (${usd(Number(data.withdrawal.commissionFee))}).`
          : "Withdrawal submitted. Waiting for admin confirmation.",
      )
      setAddress("")
      await refreshWithdrawals()
      router.refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Withdrawal failed")
    } finally {
      setPending(false)
    }
  }

  const openWithdrawal = withdrawals.find((item) => item.status === "processing" || item.status === "awaiting_confirmation")

  if ((commissionWithdrawalId || escrowWithdrawalId) && feeMode) {
    return (
      <div className="mx-auto grid w-full max-w-lg gap-4 px-3 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--sporty)]">FEE PAYMENT</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text)]">
              {feeMode.kind === "commission" ? "Commission fee" : "Escrow fee"}
            </h1>
          </div>
          <Link href="/wallet?tab=withdraw" className="text-sm font-semibold text-[var(--sporty)]">
            Back
          </Link>
        </div>
        <DepositFlow feeMode={feeMode} />
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-3 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--sporty)]">WALLET</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text)]">USD balance</h1>
        </div>
        <Link href="/account" className="text-sm font-semibold text-[var(--sporty)]">
          Account
        </Link>
      </div>

      <Panel className="grid gap-2 p-5">
        <p className="text-sm text-[var(--muted)]">Available</p>
        <p className="font-mono text-4xl font-bold text-[var(--text)]">{balance == null ? "USD —" : usd(balance)}</p>
      </Panel>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/wallet?tab=deposit"
          className={`rounded-2xl px-4 py-3 text-center text-sm font-bold ${tab === "deposit" ? "bg-[var(--sporty)] text-white" : "bg-white text-[var(--text)] shadow-[var(--shadow)]"}`}
        >
          Deposit
        </Link>
        <Link
          href="/wallet?tab=withdraw"
          className={`rounded-2xl px-4 py-3 text-center text-sm font-bold ${tab === "withdraw" ? "bg-[var(--sporty)] text-white" : "bg-white text-[var(--text)] shadow-[var(--shadow)]"}`}
        >
          Withdraw
        </Link>
      </div>

      {tab === "deposit" ? (
        <DepositFlow />
      ) : (
        <div className="grid gap-4">
          {openWithdrawal && (
            <Panel className="grid gap-3 p-5">
              <p className="text-sm font-bold text-[var(--text)]">Open withdrawal</p>
              <p className="font-mono text-lg font-bold">{usd(openWithdrawal.amountUsd)}</p>
              <p className="text-sm capitalize text-[var(--muted)]">{openWithdrawal.status.replaceAll("_", " ")}</p>
              <p className="break-all font-mono text-xs text-[var(--muted)]">
                {openWithdrawal.destinationAsset}/{openWithdrawal.destinationNetwork}: {openWithdrawal.destinationAddress}
              </p>
              {openWithdrawal.status === "awaiting_confirmation" && openWithdrawal.commissionFee != null && !commissionPaid && (
                <Link
                  href={`/wallet?commission=${openWithdrawal.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--sporty)] px-4 text-sm font-bold text-white"
                >
                  Pay commission {usd(openWithdrawal.commissionFee)}
                </Link>
              )}
              {openWithdrawal.status === "awaiting_confirmation" && openWithdrawal.escrowFee != null && (
                <Link
                  href={`/wallet?escrow=${openWithdrawal.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--betslip)] px-4 text-sm font-bold text-[var(--betslip-ink)]"
                >
                  Pay escrow {usd(openWithdrawal.escrowFee)}
                </Link>
              )}
            </Panel>
          )}

          <Panel className="grid gap-4 p-5">
            <p className="text-sm text-[var(--muted)]">
              Request a crypto payout. Network fee {usd(WITHDRAWAL_NETWORK_FEE_USD)}.
              {!commissionPaid ? " First withdrawal requires a one-time commission fee after admin confirms." : ""}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 font-mono text-xs font-semibold",
                    amount === value ? "bg-[var(--sporty)] text-white" : "bg-[var(--bg-elevated)] text-[var(--muted)]",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
            <Field label="Amount (USD)" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--muted)]">Asset</span>
                <select value={asset} onChange={(event) => setAsset(event.target.value)} className="h-11 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3">
                  <option value="USDT">USDT</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="BNB">BNB</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--muted)]">Network</span>
                <select value={network} onChange={(event) => setNetwork(event.target.value)} className="h-11 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3">
                  <option value="TRC-20">TRC-20</option>
                  <option value="ERC-20">ERC-20</option>
                  <option value="BEP-20">BEP-20</option>
                  <option value="Bitcoin">Bitcoin</option>
                </select>
              </label>
            </div>
            <Field label="Payout address" value={address} onChange={(event) => setAddress(event.target.value)} />
            <Button type="button" size="lg" disabled={pending || Boolean(openWithdrawal) || (balance != null && balance < 10)} onClick={() => void withdraw()}>
              {pending ? "Submitting…" : `Request ${usd(Number(amount) || 0)}`}
            </Button>
            {message && <Notice tone={tone}>{message}</Notice>}
          </Panel>

          {withdrawals.length > 0 && (
            <Panel className="overflow-hidden">
              <div className="border-b border-[var(--line)] px-5 py-3">
                <p className="text-sm font-bold text-[var(--text)]">Recent withdrawals</p>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {withdrawals.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <p className="font-semibold capitalize text-[var(--text)]">{item.status.replaceAll("_", " ")}</p>
                      <p className="text-xs text-[var(--muted)]">{formatTime(item.createdAt)}</p>
                    </div>
                    <p className="font-mono font-bold">{usd(item.amountUsd)}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}

      <Link href="/wallet/history" className="text-center text-sm font-semibold text-[var(--sporty)]">
        View deposit & withdrawal history
      </Link>
    </div>
  )
}
