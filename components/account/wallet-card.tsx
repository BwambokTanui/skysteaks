"use client"

import Link from "next/link"
import { useBalance } from "@/components/layout/balance"
import { buttonClasses } from "@/components/ui/button"
import { Panel } from "@/components/ui/panel"
import { usd } from "@/lib/format"

export function WalletCard() {
  const { balance } = useBalance()

  return (
    <Panel padded className="grid gap-4">
      <div>
        <p className="text-sm text-[var(--muted)]">USD play credits</p>
        <p className="mt-2 font-mono text-4xl">{balance == null ? "USD —" : usd(balance)}</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
          Deposit or withdraw from your wallet. History keeps every credit move.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/wallet?tab=deposit" className={buttonClasses("primary", "md")}>
          Deposit
        </Link>
        <Link href="/wallet?tab=withdraw" className={buttonClasses("ghost", "md")}>
          Withdraw
        </Link>
        <Link href="/wallet/history" className={buttonClasses("ghost", "md")}>
          History
        </Link>
      </div>
    </Panel>
  )
}
