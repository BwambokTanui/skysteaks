import { cn } from "@/lib/cn"

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-3xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl", className)}>
      {children}
    </section>
  )
}
