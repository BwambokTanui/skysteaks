import { cn } from "@/lib/cn"

export function Panel({
  className,
  padded = false,
  children,
}: {
  className?: string
  padded?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-[var(--line)] bg-white shadow-[var(--shadow)]",
        padded && "p-[var(--space-panel)]",
        className,
      )}
    >
      {children}
    </section>
  )
}
