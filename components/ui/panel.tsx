import { cn } from "@/lib/cn"

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-[24px] border border-[var(--line)] bg-white shadow-[var(--shadow)]", className)}>
      {children}
    </section>
  )
}
