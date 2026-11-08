import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Panel } from "@/components/ui/panel"
import { getSessionContext } from "@/lib/auth"
import { formatTime, usd } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Wallet history" }
export const dynamic = "force-dynamic"

type LedgerRow = {
  id: string
  kind: string
  amount: number | string
  balance_after: number | string
  note: string | null
  created_at: string
}

export default async function WalletHistoryPage() {
  const session = await getSessionContext()
  if (!session.user) redirect("/login?next=/wallet/history")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("wallet_ledger")
    .select("id, kind, amount, balance_after, note, created_at")
    .order("created_at", { ascending: false })
    .limit(50)
  const rows = (data ?? []) as LedgerRow[]

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-3 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--sporty)]">HISTORY</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text)]">Deposits & withdrawals</h1>
        </div>
        <Link href="/wallet" className="text-sm font-semibold text-[var(--sporty)]">
          Wallet
        </Link>
      </div>

      <Panel className="overflow-hidden">
        {error && <p className="px-5 py-4 text-sm text-[var(--rose)]">Run supabase/wallet.sql to enable ledger history.</p>}
        {!error && rows.length === 0 && <p className="px-5 py-6 text-sm text-[var(--muted)]">No deposits or withdrawals yet.</p>}
        {!error && rows.length > 0 && (
          <div className="divide-y divide-[var(--line)]">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold capitalize text-[var(--text)]">{row.kind}</p>
                  <p className="text-xs text-[var(--muted)]">{formatTime(row.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-sm font-bold ${row.kind === "deposit" ? "text-[var(--mint)]" : "text-[var(--text)]"}`}>
                    {row.kind === "deposit" ? "+" : "−"}
                    {usd(Number(row.amount))}
                  </p>
                  <p className="font-mono text-xs text-[var(--muted)]">Bal {usd(Number(row.balance_after))}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Link href="/aviator" className="text-center text-sm font-semibold text-[var(--sporty)]">
        Back to Aviator
      </Link>
    </div>
  )
}
