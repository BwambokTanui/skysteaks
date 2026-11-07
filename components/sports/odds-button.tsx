"use client"

import { useBetslip } from "@/components/sports/betslip"
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
        "grid min-h-14 flex-1 place-content-center gap-1 rounded-2xl border px-2 py-2 transition",
        active
          ? "border-[var(--mint)] bg-[rgba(62,224,162,0.16)] text-[var(--mint)]"
          : "border-white/10 bg-black/30 text-white hover:border-white/25",
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
      <span className="font-mono text-sm font-semibold">{formatOdds(item.odds)}</span>
    </button>
  )
}
