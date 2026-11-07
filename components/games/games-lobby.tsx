import Link from "next/link"
import { PlaneIcon } from "@/components/ui/plane-icon"

const categories = [
  { id: "crash", label: "Crash", active: true },
  { id: "slots", label: "Slots", active: false },
  { id: "virtuals", label: "Virtuals", active: false },
  { id: "jackpot", label: "Jackpot", active: false },
] as const

export function GamesLobby() {
  return (
    <div className="relative mx-auto grid w-full max-w-lg gap-5 px-3 py-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-4 h-44 bg-[radial-gradient(ellipse_at_top,rgba(227,27,35,0.2),transparent_65%)]"
      />

      <header className="relative">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--sporty)]">GAMES</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Featured games</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Crash, upcoming titles, and more from SkySteaks.</p>
      </header>

      <div className="relative scroll-thin flex gap-3 overflow-x-auto pb-1">
        {categories.map((item) => (
          <div key={item.id} className="grid shrink-0 place-items-center gap-1.5">
            <span
              className={
                item.active
                  ? "grid h-14 w-14 place-items-center rounded-2xl bg-[var(--sporty)] text-white shadow-[0_10px_24px_rgba(227,27,35,0.4)]"
                  : "grid h-14 w-14 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"
              }
            >
              {item.active ? <PlaneIcon className="h-6 w-6" /> : <span className="text-sm font-bold">{item.label.slice(0, 1)}</span>}
            </span>
            <span className={`text-[11px] font-medium ${item.active ? "text-white" : "text-[var(--muted)]"}`}>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-2 gap-3">
        <Link
          href="/aviator"
          className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5 shadow-[0_14px_36px_rgba(0,0,0,0.3)] transition hover:border-[var(--sporty)]/50"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(227,27,35,0.35),transparent_55%)]" />
          <div className="relative">
            <span className="inline-flex rounded-md bg-[rgba(57,255,20,0.14)] px-2 py-1 text-[11px] font-semibold text-[var(--mint)]">Hot</span>
            <div className="mt-6 grid h-24 place-items-center">
              <PlaneIcon className="h-14 w-14 text-[var(--sporty)] transition group-hover:scale-105" />
            </div>
            <p className="mt-2 text-lg font-semibold">Aviator</p>
            <p className="text-xs font-medium text-[var(--mint)]">Live now</p>
          </div>
        </Link>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5 opacity-80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(126,203,255,0.12),transparent_55%)]" />
          <div className="relative">
            <span className="inline-flex rounded-md bg-white/8 px-2 py-1 text-[11px] font-semibold text-[var(--muted)]">Soon</span>
            <div className="mt-6 grid h-24 place-items-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#1b2230] text-xl font-black text-[var(--blue)]">SJ</span>
            </div>
            <p className="mt-2 text-lg font-semibold">Sporty Jet</p>
            <p className="text-xs text-[var(--muted)]">Coming next</p>
          </div>
        </div>
      </div>

      <Link
        href="/aviator"
        className="relative grid h-14 place-items-center rounded-2xl bg-[var(--mint)] text-base font-bold text-black shadow-[0_12px_28px_rgba(57,255,20,0.25)] transition hover:brightness-110"
      >
        Play Aviator
      </Link>
    </div>
  )
}
