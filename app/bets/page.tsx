import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { BetsHistory } from "@/components/bets/bets-history"
import { getSessionContext } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { loadUserTickets } from "@/lib/sports/server"

export const metadata: Metadata = { title: "My bets" }
export const dynamic = "force-dynamic"

type BetRow = {
  id: string
  round_number: number | string
  amount: number | string
  status: string
  cashout_multiplier: number | string | null
  profit: number | string | null
  created_at: string
}

export default async function BetsPage() {
  const session = await getSessionContext()
  if (!session.user) redirect("/login")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("bets")
    .select("id, round_number, amount, status, cashout_multiplier, profit, created_at")
    .order("created_at", { ascending: false })
    .limit(40)

  const aviatorBets = ((data ?? []) as BetRow[]).map((bet) => ({
    id: bet.id,
    roundNumber: bet.round_number,
    amount: Number(bet.amount),
    status: bet.status,
    cashoutMultiplier: bet.cashout_multiplier == null ? null : Number(bet.cashout_multiplier),
    profit: bet.profit == null ? null : Number(bet.profit),
    createdAt: bet.created_at,
  }))

  let tickets: Awaited<ReturnType<typeof loadUserTickets>> = []
  let ticketError: string | null = null
  try {
    tickets = await loadUserTickets(session.user.id)
  } catch {
    ticketError = "Sports tickets are unavailable right now."
  }

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-3 py-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--sporty)]">HISTORY</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text)]">My bets</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Tap a ticket to expand won and lost details.</p>
      </div>

      <BetsHistory
        tickets={tickets}
        ticketError={ticketError}
        aviatorBets={aviatorBets}
        aviatorError={error ? "Aviator bet history is unavailable right now." : null}
      />
    </div>
  )
}
