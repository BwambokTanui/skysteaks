"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useBalance } from "@/components/layout/balance"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { Panel } from "@/components/ui/panel"
import { usd } from "@/lib/format"

export function WalletPanel({ tab = "deposit" }: { tab?: "deposit" | "withdraw" }) {
  const router = useRouter()
  const { balance, setBalance } = useBalance()
  const [amount, setAmount] = useState(tab === "deposit" ? "1000" : "50")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<"error" | "info">("info")

  async function deposit() {
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch("/api/account/topup", { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Deposit failed")
      setBalance(Number(data.balance))
      setTone("info")
      setMessage("USD 1,000 deposited.")
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
      const response = await fetch("/api/account/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Withdrawal failed")
      setBalance(Number(data.balance))
      setTone("info")
      setMessage(`Withdrew ${usd(Number(amount))}.`)
      router.refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Withdrawal failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-3 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--sporty)]">WALLET</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text)]">USD balance</h1>
        </div>
        <Link href="/aviator" className="text-sm font-semibold text-[var(--sporty)]">
          Back to Aviator
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
        {tab === "deposit" ? (
          <>
            <p className="text-sm text-[var(--muted)]">Add USD 1,000 play credits per tap (cap USD 50,000).</p>
            <Button type="button" size="lg" disabled={pending} onClick={() => void deposit()}>
              Deposit USD 1,000
            </Button>
          </>
        ) : (
          <>
            <Field label="Withdraw amount (USD)" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
            <Button type="button" size="lg" disabled={pending} onClick={() => void withdraw()}>
              Withdraw
            </Button>
          </>
        )}
        {message && <Notice tone={tone}>{message}</Notice>}
      </Panel>

      <Link href="/wallet/history" className="text-center text-sm font-semibold text-[var(--sporty)]">
        View deposit & withdrawal history
      </Link>
    </div>
  )
}
