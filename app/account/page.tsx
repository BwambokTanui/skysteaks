import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { WalletCard } from "@/components/account/wallet-card"
import { Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { getSessionContext } from "@/lib/auth"
import { formatTime, money, signedMoney } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { loadUserTickets } from "@/lib/sports/server"

export const metadata: Metadata = { title: "Account" }
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

function toneForStatus(status: string) {
  if (status === "cashed" || status === "won") return "win" as const
  if (status === "lost") return "loss" as const
  if (status === "open") return "mid" as const
  return "neutral" as const
}

export default async function AccountPage() {
  const session = await getSessionContext()
  if (!session.user) redirect("/login")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("bets")
    .select("id, round_number, amount, status, cashout_multiplier, profit, created_at")
    .order("created_at", { ascending: false })
    .limit(20)
  const bets = (data ?? []) as BetRow[]

  let tickets: Awaited<ReturnType<typeof loadUserTickets>> = []
  let ticketError: string | null = null
  try {
    tickets = await loadUserTickets(session.user.id)
  } catch {
    ticketError = "Run supabase/sports.sql to load sports tickets."
  }

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-3 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">{session.profile?.username ?? "Pilot"}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{session.user.email}</p>
      </div>
      <WalletCard />

      <Panel className="overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-lg font-bold text-[var(--text)]">Sports tickets</h2>
        </div>
        {ticketError && <p className="px-5 py-4 text-sm text-[var(--rose)]">{ticketError}</p>}
        {!ticketError && tickets.length === 0 && (
          <p className="px-5 py-6 text-sm text-[var(--muted)]">Sports tickets you place will show up here.</p>
        )}
        {!ticketError && tickets.length > 0 && (
          <div className="grid gap-3 p-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Pill tone={toneForStatus(ticket.status)}>{ticket.status}</Pill>
                  <p className="font-mono text-sm text-[var(--muted)]">{formatTime(ticket.createdAt)}</p>
                </div>
                <div className="mt-3 grid gap-1 text-sm">
                  {ticket.legs.map((leg, index) => (
                    <p key={`${ticket.id}-${index}`} className="text-[var(--muted)]">
                      {leg.homeTeam} vs {leg.awayTeam} · {leg.selectionName} @ {leg.odds.toFixed(2)}
                    </p>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 font-mono text-sm text-[var(--text)]">
                  <span>Stake {money(ticket.stake)}</span>
                  <span>Odds {ticket.totalOdds.toFixed(2)}</span>
                  <span>Return {money(ticket.potentialPayout)}</span>
                  {ticket.profit != null && <span>{signedMoney(ticket.profit)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-lg font-bold text-[var(--text)]">Aviator bets</h2>
        </div>
        {error && <p className="px-5 py-4 text-sm text-[var(--rose)]">Run supabase/schema.sql, then refresh this page.</p>}
        {!error && bets.length === 0 && <p className="px-5 py-6 text-sm text-[var(--muted)]">Your Aviator bets will show up here.</p>}
        {!error && bets.length > 0 && (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Round</th>
                  <th className="px-3 py-3 font-medium">Stake</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Cash out</th>
                  <th className="px-3 py-3 font-medium">Result</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet) => {
                  const profit = bet.profit == null ? null : Number(bet.profit)
                  const cashout = bet.cashout_multiplier == null ? null : Number(bet.cashout_multiplier)
                  return (
                    <tr key={bet.id} className="border-t border-[var(--line)]">
                      <td className="px-5 py-3 font-mono">{bet.round_number}</td>
                      <td className="px-3 py-3 font-mono">{money(Number(bet.amount))}</td>
                      <td className="px-3 py-3">
                        <Pill tone={toneForStatus(bet.status)}>{bet.status}</Pill>
                      </td>
                      <td className="px-3 py-3 font-mono">{cashout == null ? "—" : `${cashout.toFixed(2)}x`}</td>
                      <td className="px-3 py-3 font-mono">{profit == null ? "—" : signedMoney(profit)}</td>
                      <td className="px-5 py-3 text-[var(--muted)]">{formatTime(bet.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
