import Link from "next/link"
import { PlaneIcon } from "@/components/ui/plane-icon"
import { Pill } from "@/components/ui/pill"

export function GamesLobby() {
  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-3 py-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.22em] text-[#e31b23]">GAMES</p>
        <h1 className="mt-1 text-2xl font-semibold">Featured games</h1>
      </div>

      <div className="scroll-thin flex gap-3 overflow-x-auto pb-1">
        {["Crash", "Slots", "Virtuals", "Jackpot"].map((label, index) => (
          <div key={label} className="grid shrink-0 place-items-center gap-1">
            <span className={`grid h-12 w-12 place-items-center rounded-full ${index === 0 ? "bg-[#e31b23] text-white" : "bg-white/8 text-[#8b93a7]"}`}>
              {index === 0 ? <PlaneIcon className="h-5 w-5" /> : label.slice(0, 1)}
            </span>
            <span className="text-[11px] text-[#8b93a7]">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/aviator" className="relative overflow-hidden rounded-2xl bg-[#171a21] p-3">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(227,27,35,0.35),transparent_55%)]" />
          <div className="relative">
            <Pill tone="mid">Hot</Pill>
            <div className="mt-8 grid h-24 place-items-center">
              <PlaneIcon className="h-14 w-14 text-[#e31b23]" />
            </div>
            <p className="mt-2 text-lg font-semibold">Aviator</p>
            <p className="text-xs text-[#39ff14]">270 players</p>
          </div>
        </Link>
        <div className="relative overflow-hidden rounded-2xl bg-[#171a21] p-3 opacity-70">
          <Pill>Soon</Pill>
          <div className="mt-8 grid h-24 place-items-center text-4xl">🚀</div>
          <p className="mt-2 text-lg font-semibold">Sporty Jet</p>
          <p className="text-xs text-[#8b93a7]">Coming next</p>
        </div>
      </div>

      <Link href="/aviator" className="grid h-14 place-items-center rounded-2xl bg-[#39ff14] text-base font-semibold text-black">
        Play Aviator
      </Link>
    </div>
  )
}
