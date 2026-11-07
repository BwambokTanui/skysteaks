"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useBalance } from "@/components/layout/balance"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"
import { Panel } from "@/components/ui/panel"
import { ksh } from "@/lib/format"

export function WalletCard() {
  const router = useRouter()
  const { balance, setBalance } = useBalance()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<"error" | "info">("info")

  async function topup() {
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch("/api/account/topup", { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Could not add play credits")
      setBalance(Number(data.balance))
      setTone("info")
      setMessage("1,000 play credits added.")
      router.refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Could not add play credits")
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel className="grid gap-4 p-5">
      <div>
        <p className="text-sm text-[var(--muted)]">Play credits</p>
        <p className="mt-2 font-mono text-4xl">{balance == null ? "KSh —" : ksh(balance)}</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
          Credits are for play inside SkySteaks. Add 1,000 at a time, up to 50,000.
        </p>
      </div>
      <Button type="button" onClick={topup} disabled={pending} className="w-fit">
        Add 1,000
      </Button>
      {message && <Notice tone={tone}>{message}</Notice>}
    </Panel>
  )
}
