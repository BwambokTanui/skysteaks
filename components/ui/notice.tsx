import { cn } from "@/lib/cn"

export function Notice({
  tone = "error",
  children,
}: {
  tone?: "error" | "info"
  children: React.ReactNode
}) {
  return (
    <p
      className={cn(
        "rounded-2xl border px-3 py-2 text-sm",
        tone === "error"
          ? "border-[rgba(255,93,115,0.35)] bg-[rgba(255,93,115,0.08)] text-[var(--rose)]"
          : "border-white/10 bg-white/5 text-[var(--muted)]",
      )}
    >
      {children}
    </p>
  )
}
