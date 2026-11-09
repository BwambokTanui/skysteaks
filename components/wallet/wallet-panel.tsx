"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useBalance } from "@/components/layout/balance"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { Panel } from "@/components/ui/panel"
import { cn } from "@/lib/cn"
import { usd } from "@/lib/format"

const QUICK = ["10", "20", "50", "100", "200", "500", "1000"]

export function WalletPanel({ tab = "deposit" }: { tab?: "deposit" | "withdraw" }) {
  const router = useRouter()
  const { balance, setBalance } = useBalance()
  const [amount, setAmount] = useState(tab === "deposit" ? "100" : "50")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<"error" | "info">("info")

  useEffect(() => {
    setAmount(tab === "deposit" ? "100" : "50")
    setMessage(null)
  }, [tab])

  async function deposit() {
    setPending(true)
    setMessage(null)
    try {
      const value = Number(amount)
      if (!Number.isFinite(value) || value < 10) throw new Error("Minimum deposit is USD 10.")
      if (value > 10000) throw new Error("Maximum deposit is USD 10,000.")
      if (balance != null && balance + value > 50000) throw new Error("Balance cap is USD 50,000.")
      const response = await fetch("/api/account/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Deposit failed")
      setBalance(Number(data.balance))
      setTone("info")
      setMessage(`Deposited ${usd(value)}.`)
      router.refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Deposit failed")
    } finally {
      setPending(false)
    }
  }

  async function withdraw() {
    setPending(true)
    setMessage(null)
    try {
      const value = Number(amount)
      if (!Number.isFinite(value) || value < 10) throw new Error("Minimum withdrawal is USD 10.")
      if (balance != null && value > balance) throw new Error("Insufficient balance.")
      const response = await fetch("/api/account/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Withdrawal failed")
      setBalance(Number(data.balance))
      setTone("info")
      setMessage(`Withdrew ${usd(value)}.`)
      router.refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Withdrawal failed")
    } finally {
      setPending(false)
    }
  }

  function setQuick(value: string) {
    if (tab === "withdraw" && balance != null) {
      setAmount(String(Math.min(Number(value), Math.floor(balance * 100) / 100)))
      return
    }
    setAmount(value)
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

      <Panel className="grid gap-4 p-5">
        <p className="text-sm text-[var(--muted)]">
          {tab === "deposit"
            ? "Add play credits (USD 10–10,000). Cap USD 50,000."
            : "Withdraw play credits back from your balance (min USD 10)."}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setQuick(value)}
              className={cn(
                "rounded-full px-3 py-1.5 font-mono text-xs font-semibold",
                amount === value || amount === `${value}.00`
                  ? "bg-[var(--sporty)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--muted)]",
              )}
            >
              {value}
            </button>
          ))}
          {tab === "withdraw" && balance != null && balance >= 10 && (
            <button
              type="button"
              onClick={() => setAmount(String(Math.floor(balance * 100) / 100))}
              className="rounded-full bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]"
            >
              Max
            </button>
          )}
        </div>

        <Field
          label={tab === "deposit" ? "Deposit amount (USD)" : "Withdraw amount (USD)"}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
        />

        {tab === "deposit" ? (
          <Button type="button" size="lg" disabled={pending} onClick={() => void deposit()}>
            {pending ? "Depositing…" : `Deposit ${usd(Number(amount) || 0)}`}
          </Button>
        ) : (
          <Button type="button" size="lg" disabled={pending || (balance != null && balance < 10)} onClick={() => void withdraw()}>
            {pending ? "Withdrawing…" : `Withdraw ${usd(Number(amount) || 0)}`}
          </Button>
        )}

        {message && <Notice tone={tone}>{message}</Notice>}
      </Panel>

      <Link href="/wallet/history" className="text-center text-sm font-semibold text-[var(--sporty)]">
        View deposit & withdrawal history
      </Link>
    </div>
  )
}
