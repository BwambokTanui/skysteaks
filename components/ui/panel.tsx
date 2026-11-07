import { cn } from "@/lib/cn"

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_14px_40px_rgba(0,0,0,0.28)]", className)}>
      {children}
    </section>
  )
}
