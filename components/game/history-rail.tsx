import { cn } from "@/lib/cn"
import { toneForCrash } from "@/lib/format"
import type { HistoryPoint } from "@/lib/game/types"

const tones = {
  low: "bg-[#1a4f9c] text-white",
  mid: "bg-[#148a3c] text-[#9dffb0]",
  high: "bg-[#3d3d3d] text-[#d0d0d0]",
}

export function HistoryRail({ history, inPlay }: { history: HistoryPoint[]; inPlay?: boolean }) {
  return (
    <div className="scroll-thin flex items-center gap-1.5 overflow-x-auto">
      {inPlay && (
        <span className="inline-flex shrink-0 rounded-md bg-[#2a2f3a] px-2 py-1 text-[11px] font-semibold text-[#c5c9d3]">
          In Play
        </span>
      )}
      {history.map((item) => (
        <span
          key={item.roundNumber}
          title={`Round ${item.roundNumber}`}
          className={cn("inline-flex shrink-0 rounded-md px-2 py-1 font-mono text-[11px] font-semibold", tones[toneForCrash(item.crashPoint)])}
        >
          {item.crashPoint.toFixed(2)}
        </span>
      ))}
      {!history.length && !inPlay && <span className="text-[11px] text-[#8b93a7]">Waiting for first crash…</span>}
      <span className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/8 text-[#8b93a7]">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      </span>
    </div>
  )
}
