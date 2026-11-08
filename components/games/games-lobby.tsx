import Link from "next/link"
import { PlaneIcon } from "@/components/ui/plane-icon"

export function GamesLobby() {
  return (
    <div className="relative mx-auto grid w-full max-w-lg gap-5 px-3 py-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-4 h-44 bg-[radial-gradient(ellipse_at_top,rgba(227,27,35,0.2),transparent_65%)]"
      />

      <header className="relative">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--sporty)]">GAMES</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Aviator</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">SkySteaks crash game — watch the multiplier climb and cash out before it flies away.</p>
      </header>

      <Link
        href="/aviator"
        className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.3)] transition hover:border-[var(--sporty)]/50"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(227,27,35,0.35),transparent_55%)]" />
        <div className="relative">
          <span className="inline-flex rounded-md bg-[rgba(57,255,20,0.14)] px-2 py-1 text-[11px] font-semibold text-[var(--mint)]">Live</span>
          <div className="mt-8 grid h-36 place-items-center">
            <PlaneIcon className="h-20 w-20 text-[var(--sporty)] transition group-hover:scale-105" />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight">Aviator</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Provably fair crash rounds with shared play credits.</p>
        </div>
      </Link>

      <Link
        href="/aviator"
        className="relative grid h-14 place-items-center rounded-2xl bg-[var(--mint)] text-base font-bold text-black shadow-[0_12px_28px_rgba(57,255,20,0.25)] transition hover:brightness-110"
      >
        Play Aviator
      </Link>
    </div>
  )
}
