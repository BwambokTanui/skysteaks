import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export function Field({ label, className, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id || props.name
  return (
    <label className="grid gap-1.5 text-sm text-[var(--muted)]" htmlFor={id}>
      <span>{label}</span>
      <input
        {...props}
        id={id}
        className={cn(
          "h-12 rounded-2xl border border-white/10 bg-black/30 px-3 text-base text-[var(--text)] outline-none transition focus:border-[var(--mint)]",
          className,
        )}
      />
    </label>
  )
}
