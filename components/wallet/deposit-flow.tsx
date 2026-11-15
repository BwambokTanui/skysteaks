"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { Panel } from "@/components/ui/panel"
import { cn } from "@/lib/cn"
import { formatTime, usd } from "@/lib/format"

type Method = {
  id: string
  asset: string
  network: string
  address: string
  iconUrl: string | null
}

type Deposit = {
  id: string
  amountUsd: number
  requestedCrypto: number
  asset: string
  network: string
  address: string
  status: string
  priceUsd: number | null
  userConfirmedAt: string | null
  createdAt: string
}

const QUICK = [50, 100, 300, 500, 1000]

function cryptoLabel(value: number, asset: string) {
  const decimals = asset === "BTC" ? 8 : asset === "USDT" || asset === "USDC" ? 2 : 6
  return `${value.toFixed(decimals)} ${asset}`
}

export function DepositFlow() {
  const [methods, setMethods] = useState<Method[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [methodId, setMethodId] = useState<string | null>(null)
  const [amount, setAmount] = useState("100")
  const [active, setActive] = useState<Deposit | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<"error" | "info">("info")
  const [copied, setCopied] = useState(false)

  const selected = useMemo(() => methods.find((item) => item.id === methodId) ?? null, [methods, methodId])
  const openDeposit = useMemo(
    () => deposits.find((item) => item.status === "processing" || item.status === "awaiting_confirmation") ?? null,
    [deposits],
  )

  const refresh = useCallback(async () => {
    const [methodsRes, depositsRes] = await Promise.all([
      fetch("/api/wallet/deposit-methods", { cache: "no-store" }),
      fetch("/api/wallet/deposits", { cache: "no-store" }),
    ])
    if (methodsRes.ok) {
      const data = await methodsRes.json()
      setMethods(data.methods ?? [])
    }
    if (depositsRes.ok) {
      const data = await depositsRes.json()
      const list = (data.deposits ?? []) as Deposit[]
      setDeposits(list)
      const open = list.find((item) => item.status === "processing" || item.status === "awaiting_confirmation")
      if (open) {
        setActive(open)
        setStep(3)
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createDeposit() {
    if (!methodId) return
    setPending(true)
    setMessage(null)
    try {
      const value = Number(amount)
      if (!Number.isFinite(value) || value < 10) throw new Error("Minimum deposit is USD 10.")
      const response = await fetch("/api/wallet/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methodId, amountUsd: value }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Could not create deposit")
      setActive(data.deposit)
      setStep(3)
      setTone("info")
      setMessage("Send the exact crypto amount, then tap I’ve sent it.")
      await refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Could not create deposit")
    } finally {
      setPending(false)
    }
  }

  async function confirmSent() {
    if (!active) return
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/wallet/deposits/${active.id}/confirm`, { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Could not confirm deposit")
      setActive(data.deposit)
      setTone("info")
      setMessage("Marked as sent. An admin will confirm and credit your balance.")
      await refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Could not confirm deposit")
    } finally {
      setPending(false)
    }
  }

  async function copyAddress() {
    if (!active) return
    try {
      await navigator.clipboard.writeText(active.address)
      setCopied(true)
      void fetch(`/api/wallet/deposits/${active.id}/copied`, { method: "POST" })
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setTone("error")
      setMessage("Could not copy address.")
    }
  }

  const assets = useMemo(() => {
    const map = new Map<string, Method[]>()
    for (const method of methods) {
      const list = map.get(method.asset) ?? []
      list.push(method)
      map.set(method.asset, list)
    }
    return [...map.entries()]
  }, [methods])

  return (
    <div className="grid gap-4">
      {openDeposit && openDeposit.status === "awaiting_confirmation" && (
        <Notice tone="info">Deposit pending admin confirmation — balance updates after approval.</Notice>
      )}

      <div className="flex items-center gap-2">
        {[1, 2, 3].map((value) => (
          <div key={value} className="flex flex-1 items-center last:flex-none">
            <div
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full text-sm font-bold",
                step >= value ? "bg-[var(--sporty)] text-white" : "bg-[var(--bg-elevated)] text-[var(--muted)]",
              )}
            >
              {value}
            </div>
            {value < 3 && <div className={cn("mx-1 h-0.5 flex-1", step > value ? "bg-[var(--sporty)]" : "bg-[var(--line)]")} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Panel className="grid gap-3 p-5">
          <p className="text-sm font-semibold text-[var(--text)]">1. Choose crypto method</p>
          {assets.length === 0 && <p className="text-sm text-[var(--muted)]">Loading deposit methods…</p>}
          {assets.map(([asset, list]) => (
            <div key={asset} className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{asset}</p>
              <div className="grid gap-2">
                {list.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setMethodId(method.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-3 py-3 text-left",
                      methodId === method.id ? "border-[var(--sporty)] bg-[#fff5f6]" : "border-[var(--line)] bg-white",
                    )}
                  >
                    {method.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={method.iconUrl} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--bg-elevated)] text-xs font-bold">
                        {method.asset.slice(0, 1)}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">
                        {method.asset} · {method.network}
                      </p>
                      <p className="truncate font-mono text-[11px] text-[var(--muted)]">{method.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Button type="button" size="lg" disabled={!methodId} onClick={() => setStep(2)}>
            Continue
          </Button>
        </Panel>
      )}

      {step === 2 && selected && (
        <Panel className="grid gap-4 p-5">
          <button type="button" className="w-fit text-sm font-semibold text-[var(--muted)]" onClick={() => setStep(1)}>
            ← Change method
          </button>
          <p className="text-sm font-semibold text-[var(--text)]">
            2. Enter USD amount · {selected.asset} ({selected.network})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className={cn(
                  "rounded-full px-3 py-1.5 font-mono text-xs font-semibold",
                  amount === String(value) ? "bg-[var(--sporty)] text-white" : "bg-[var(--bg-elevated)] text-[var(--muted)]",
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <Field label="Amount (USD)" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
          <Button type="button" size="lg" disabled={pending} onClick={() => void createDeposit()}>
            {pending ? "Generating…" : "Generate payment details"}
          </Button>
        </Panel>
      )}

      {step === 3 && active && (
        <Panel className="grid gap-4 p-5">
          <p className="text-sm font-semibold text-[var(--text)]">3. Send crypto, then confirm</p>
          <div className="rounded-2xl bg-[var(--bg-elevated)] p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(active.address)}`}
              alt="Deposit address QR"
              className="mx-auto h-[180px] w-[180px] rounded-xl bg-white p-2"
            />
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              {active.asset} · {active.network}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold text-[var(--text)]">{cryptoLabel(active.requestedCrypto, active.asset)}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Credit {usd(active.amountUsd)}</p>
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Wallet address</p>
            <p className="break-all rounded-2xl bg-[var(--bg-elevated)] px-3 py-3 font-mono text-xs text-[var(--text)]">{active.address}</p>
            <Button type="button" variant="ghost" onClick={() => void copyAddress()}>
              {copied ? "Copied" : "Copy address"}
            </Button>
          </div>

          <Notice tone="info">Send the exact amount shown. Unique amount helps admin match your transfer.</Notice>

          {active.status === "processing" ? (
            <Button type="button" size="lg" disabled={pending} onClick={() => void confirmSent()}>
              {pending ? "Submitting…" : "I’ve sent it"}
            </Button>
          ) : (
            <div className="rounded-2xl bg-[#e8f8ee] px-4 py-3 text-sm font-semibold text-[var(--mint)]">
              Waiting for admin confirmation
            </div>
          )}
        </Panel>
      )}

      {message && <Notice tone={tone}>{message}</Notice>}

      {deposits.length > 0 && (
        <Panel className="overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-3">
            <p className="text-sm font-bold text-[var(--text)]">Recent deposit requests</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {deposits.slice(0, 8).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-semibold capitalize text-[var(--text)]">{item.status.replaceAll("_", " ")}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {item.asset}/{item.network} · {formatTime(item.createdAt)}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <p className="font-bold">{usd(item.amountUsd)}</p>
                  <p className="text-xs text-[var(--muted)]">{cryptoLabel(item.requestedCrypto, item.asset)}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
