import { cn } from "@/lib/cn"

const tones = {
  low: "bg-[#e8eefc] text-[var(--blue)]",
  mid: "bg-[#e8f8ee] text-[var(--mint)]",
  high: "bg-[#fff4e5] text-[var(--gold)]",
  win: "bg-[#e8f8ee] text-[var(--mint)]",
  loss: "bg-[#ffe8ea] text-[var(--rose)]",
  neutral: "bg-[var(--bg-elevated)] text-[var(--muted)]",
}

export function Pill({
  tone = "neutral",
  className,
  children,
  title,
}: {
  tone?: keyof typeof tones
  className?: string
  children: React.ReactNode
  title?: string
}) {
  return (
    <span title={title} className={cn("inline-flex shrink-0 items-center rounded-full px-3 py-1 font-mono text-sm font-semibold", tones[tone], className)}>
      {children}
    </span>
  )
}
