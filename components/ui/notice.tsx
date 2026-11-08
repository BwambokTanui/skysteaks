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
          ? "border-[rgba(227,27,35,0.25)] bg-[#ffe8ea] text-[var(--rose)]"
          : "border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--muted)]",
      )}
    >
      {children}
    </p>
  )
}
