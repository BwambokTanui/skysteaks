import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { WalletPanel } from "@/components/wallet/wallet-panel"
import { getSessionContext } from "@/lib/auth"

export const metadata: Metadata = { title: "Wallet" }
export const dynamic = "force-dynamic"

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; commission?: string; escrow?: string }>
}) {
  const session = await getSessionContext()
  if (!session.user) redirect("/login?next=/wallet")
  const params = await searchParams
  const tab = params.commission || params.escrow ? "deposit" : params.tab === "withdraw" ? "withdraw" : "deposit"
  return (
    <WalletPanel
      tab={tab}
      commissionWithdrawalId={params.commission || null}
      escrowWithdrawalId={params.escrow || null}
    />
  )
}
