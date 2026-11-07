import Link from "next/link"
import { MatchRow } from "@/components/sports/match-row"
import { BetslipDock } from "@/components/sports/betslip"
import { PlaneIcon } from "@/components/ui/plane-icon"
import { buttonClasses } from "@/components/ui/button"
import { Panel } from "@/components/ui/panel"
import type { SportsCatalog } from "@/lib/sports/types"

export function HomeLobby({ catalog }: { catalog: SportsCatalog | null }) {
  const featured = (catalog?.events ?? []).filter((event) => event.featured).slice(0, 6)
  const live = (catalog?.events ?? []).filter((event) => event.status === "live").slice(0, 4)

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-3 py-4">
      <div className="grid content-start gap-4">
        <section className="overflow-hidden rounded-2xl bg-[#171a21]">
          <div className="scroll-thin flex gap-2 overflow-x-auto p-3">
            {[
              { href: "/games", label: "Games", tone: "bg-[#e31b23]" },
              { href: "/aviator", label: "Aviator", tone: "bg-[#2a1013]" },
              { href: "/sports", label: "Football", tone: "bg-[#10241c]" },
              { href: "/sports?live=1", label: "Live", tone: "bg-[#1b2230]" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className={`min-w-28 shrink-0 rounded-xl ${item.tone} p-3`}>
                <p className="text-sm font-semibold">{item.label}</p>
              </Link>
            ))}
          </div>
        </section>

        <Link href="/aviator" className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#2a1013,#07080b)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e31b23] text-white">
                <PlaneIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs tracking-[0.18em] text-[#8b93a7]">CRASH</p>
                <p className="text-xl font-semibold">Aviator</p>
              </div>
            </div>
            <span className={`${buttonClasses("primary", "md")} bg-[#39ff14] text-black`}>Play</span>
          </div>
        </Link>

        <div className="scroll-thin flex gap-2 overflow-x-auto pb-1">
          <LobbyChip href="/sports">All sports</LobbyChip>
          <LobbyChip href="/sports?live=1">Live {catalog ? `(${catalog.liveCount})` : ""}</LobbyChip>
          <LobbyChip href="/sports/football">Football</LobbyChip>
          <LobbyChip href="/sports/basketball">Basketball</LobbyChip>
          <LobbyChip href="/sports/tennis">Tennis</LobbyChip>
          <LobbyChip href="/games">Games</LobbyChip>
          <LobbyChip href="/aviator">Aviator</LobbyChip>
        </div>

        {live.length > 0 && (
          <section className="grid gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-[0.16em] text-[var(--muted)]">LIVE</h2>
              <Link href="/sports?live=1" className="text-sm text-[var(--mint)]">
                View all
              </Link>
            </div>
            <div className="grid gap-3">
              {live.map((event) => (
                <MatchRow key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-[0.16em] text-[var(--muted)]">FEATURED</h2>
            <Link href="/sports" className="text-sm text-[var(--mint)]">
              Full sportsbook
            </Link>
          </div>
          {featured.length === 0 ? (
            <Panel className="p-5 text-sm text-[var(--muted)]">
              Connect Supabase and run supabase/schema.sql plus supabase/sports.sql to load the sportsbook.
            </Panel>
          ) : (
            <div className="grid gap-3">
              {featured.map((event) => (
                <MatchRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

      </div>
      <BetslipDock />
    </div>
  )
}

function LobbyChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="shrink-0 rounded-full bg-white/8 px-4 py-2 text-sm text-[var(--muted)] hover:text-white">
      {children}
    </Link>
  )
}
