import { cn } from "@/lib/cn"

const tones = {
  low: "bg-white/6 text-[var(--blue)]",
  mid: "bg-[rgba(62,224,162,0.12)] text-[var(--mint)]",
  high: "bg-[rgba(243,197,123,0.16)] text-[var(--gold)]",
  win: "bg-[rgba(62,224,162,0.12)] text-[var(--mint)]",
  loss: "bg-[rgba(255,93,115,0.12)] text-[var(--rose)]",
  neutral: "bg-white/6 text-[var(--muted)]",
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
    <span title={title} className={cn("inline-flex shrink-0 items-center rounded-full px-3 py-1 font-mono text-sm", tones[tone], className)}>
      {children}
    </span>
  )
}
