import Link from "next/link"
import { PlaneIcon } from "@/components/ui/plane-icon"

export function GamesLobby() {
  return (
    <div className="mx-auto grid w-full max-w-lg gap-5 px-3 py-4">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--sporty)]">GAMES</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)]">Crash</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Play Aviator — cash out before the plane flies away.</p>
      </header>

      <Link
        href="/aviator"
        className="relative block overflow-hidden rounded-[28px] bg-[#14060a] p-0 shadow-[var(--shadow-lg)] ring-1 ring-[rgba(227,27,35,0.35)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(227,27,35,0.45),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(255,120,40,0.22),transparent_40%)]" />
        <div className="relative aspect-[16/11] p-5">
          <span className="inline-flex rounded-full bg-[#39ff14]/15 px-2.5 py-1 text-[11px] font-semibold text-[#9dffb0] ring-1 ring-[#39ff14]/30">
            Live now
          </span>
          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--sporty)] text-white shadow-[0_10px_24px_rgba(227,27,35,0.45)]">
                <PlaneIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-2xl font-bold tracking-tight text-white">Aviator</p>
                <p className="mt-0.5 text-sm text-white/70">Provably fair crash rounds</p>
              </div>
            </div>
            <span className="inline-flex h-11 items-center rounded-full bg-[var(--sporty)] px-4 text-sm font-bold text-white">
              Play
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}
