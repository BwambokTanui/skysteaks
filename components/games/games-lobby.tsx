import Link from "next/link"
import { PlaneIcon } from "@/components/ui/plane-icon"

export function GamesLobby() {
  return (
    <div className="mx-auto grid w-full max-w-lg gap-5 px-3 py-4">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--sporty)]">GAMES</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)]">Aviator</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">SkySteaks crash game — watch the multiplier climb and cash out before it flies away.</p>
      </header>

      <Link
        href="/aviator"
        className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(120deg,#fff1f2_0%,#ffe4e6_45%,#ffffff_100%)] p-5 shadow-[var(--shadow-lg)]"
      >
        <div className="absolute -right-6 -top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(227,27,35,0.16),transparent_70%)]" />
        <div className="relative">
          <span className="inline-flex rounded-full bg-[#e8f8ee] px-2.5 py-1 text-[11px] font-semibold text-[var(--mint)]">Live</span>
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--sporty)] text-white shadow-[0_8px_20px_rgba(227,27,35,0.35)]">
                <PlaneIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xl font-bold tracking-tight text-[var(--text)]">Aviator</p>
                <p className="mt-0.5 text-sm text-[var(--muted)]">Provably fair crash rounds</p>
              </div>
            </div>
            <span className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--sporty)] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(227,27,35,0.3)]">
              Play
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}
