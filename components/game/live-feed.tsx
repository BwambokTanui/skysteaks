import { Panel } from "@/components/ui/panel"
import { cn } from "@/lib/cn"
import { money } from "@/lib/format"
import type { LiveBet } from "@/lib/game/types"

function detail(bet: LiveBet) {
  if (bet.status === "cashed" && bet.cashoutMultiplier) return `Cashed ${bet.cashoutMultiplier.toFixed(2)}x`
  if (bet.status === "lost") return "Lost"
  return "In play"
}

export function LiveFeed({ bets }: { bets: LiveBet[] }) {
  return (
    <Panel className="scroll-thin h-fit p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6.5rem)] lg:overflow-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-[var(--muted)]">THIS ROUND</h2>
        <span className="font-mono text-sm text-[var(--muted)]">{bets.length}</span>
      </div>
      <div className="grid gap-2">
        {bets.length === 0 && <p className="text-sm text-[var(--muted)]">Waiting for the first stake.</p>}
        {bets.map((bet) => (
          <div key={bet.id} className={cn("grid grid-cols-[1fr_auto] gap-x-3 rounded-2xl px-3 py-2", bet.mine ? "bg-white/10" : "bg-black/25")}>
            <span className="truncate text-sm">{bet.username}</span>
            <span className="font-mono text-sm">{money(bet.amount)}</span>
            <span className={cn("col-span-2 text-xs", bet.status === "cashed" ? "text-[var(--mint)]" : bet.status === "lost" ? "text-[var(--rose)]" : "text-[var(--muted)]")}>
              {detail(bet)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
