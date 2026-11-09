import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { WalletCard } from "@/components/account/wallet-card"
import { Panel } from "@/components/ui/panel"
import { getSessionContext } from "@/lib/auth"

export const metadata: Metadata = { title: "Account" }
export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const session = await getSessionContext()
  if (!session.user) redirect("/login")

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-3 py-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--sporty)]">ACCOUNT</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text)]">{session.profile?.username ?? "Pilot"}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{session.user.email}</p>
      </div>

      <WalletCard />

      <Panel className="overflow-hidden">
        <div className="divide-y divide-[var(--line)]">
          <Link href="/bets" className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-[var(--text)] hover:bg-[var(--bg-elevated)]">
            <span>My bets</span>
            <span className="text-[var(--muted)]">›</span>
          </Link>
          <Link href="/wallet" className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-[var(--text)] hover:bg-[var(--bg-elevated)]">
            <span>Wallet</span>
            <span className="text-[var(--muted)]">›</span>
          </Link>
          <Link href="/wallet/history" className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-[var(--text)] hover:bg-[var(--bg-elevated)]">
            <span>Deposit history</span>
            <span className="text-[var(--muted)]">›</span>
          </Link>
          <Link href="/fairness" className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-[var(--text)] hover:bg-[var(--bg-elevated)]">
            <span>Fairness</span>
            <span className="text-[var(--muted)]">›</span>
          </Link>
          <Link href="/games" className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-[var(--text)] hover:bg-[var(--bg-elevated)]">
            <span>Aviator</span>
            <span className="text-[var(--muted)]">›</span>
          </Link>
        </div>
      </Panel>
    </div>
  )
}
