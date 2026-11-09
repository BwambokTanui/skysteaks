"use client"

import Link from "next/link"
import { useBalance } from "@/components/layout/balance"
import { Panel } from "@/components/ui/panel"
import { usd } from "@/lib/format"

export function WalletCard() {
  const { balance } = useBalance()

  return (
    <Panel className="grid gap-4 p-5">
      <div>
        <p className="text-sm text-[var(--muted)]">USD play credits</p>
        <p className="mt-2 font-mono text-4xl">{balance == null ? "USD —" : usd(balance)}</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
          Deposit or withdraw from your wallet. History keeps every credit move.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/wallet?tab=deposit"
          className="inline-flex h-11 items-center rounded-2xl bg-[var(--sporty)] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(227,27,35,0.28)]"
        >
          Deposit
        </Link>
        <Link
          href="/wallet?tab=withdraw"
          className="inline-flex h-11 items-center rounded-2xl bg-[var(--bg-elevated)] px-4 text-sm font-semibold text-[var(--text)]"
        >
          Withdraw
        </Link>
        <Link
          href="/wallet/history"
          className="inline-flex h-11 items-center rounded-2xl bg-[var(--bg-elevated)] px-4 text-sm font-semibold text-[var(--text)]"
        >
          History
        </Link>
      </div>
    </Panel>
  )
}
