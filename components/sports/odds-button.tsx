"use client"

import { useBetslip } from "@/components/sports/betslip-context"
import { cn } from "@/lib/cn"
import { formatOdds } from "@/lib/sports/format"
import type { BetslipItem } from "@/lib/sports/types"

export function OddsButton({
  item,
  label,
}: {
  item: BetslipItem
  label: string
}) {
  const { has, toggle } = useBetslip()
  const active = has(item.selectionId)

  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      className={cn(
        "grid min-h-[52px] place-content-center gap-0.5 rounded-xl px-2 py-2 transition active:scale-[0.98]",
        active
          ? "bg-[var(--sporty)] text-white shadow-[0_8px_18px_rgba(227,27,35,0.28)]"
          : "bg-[var(--bg-elevated)] text-[var(--text)] hover:bg-[#e7ebf2]",
      )}
    >
      <span className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", active ? "text-white/85" : "text-[var(--muted)]")}>
        {label}
      </span>
      <span className="font-mono text-[15px] font-bold tabular-nums">{formatOdds(item.odds)}</span>
    </button>
  )
}
