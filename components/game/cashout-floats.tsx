"use client"

import { useEffect, useMemo, useState } from "react"
import { getMultiplier, subscribeMultiplier } from "@/lib/game/ticker"
import { money } from "@/lib/format"
import type { LiveBet, PublicRound } from "@/lib/game/types"

type FloatItem = {
  id: string
  username: string
  multiplier: number
  payout: number
  lane: number
}

type BotPlan = {
  id: string
  username: string
  stake: number
  cashAt: number
}

const NAME_POOL = [
  "Ken***12",
  "Avi***88",
  "Tu***99",
  "Max***07",
  "Leo***44",
  "Sam***21",
  "Rio***63",
  "Jay***15",
  "Neo***02",
  "Sky***77",
  "Ben***39",
  "Ali***54",
  "Zoe***18",
  "Kai***91",
  "Dex***66",
  "Mia***33",
]

const STAKE_POOL = [10, 20, 50, 100, 200, 500, 1000, 2500]
const BOT_COUNT = 32
/** How long a cashout stays visible in multiplier-space (shared across devices). */
const FLOAT_WINDOW = 0.22

function mulberry32(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Same seed → identical bots on every device for this round. */
function seedBots(roundNumber: number): BotPlan[] {
  const random = mulberry32(roundNumber * 7919 + 13)
  return Array.from({ length: BOT_COUNT }, (_, index) => {
    const u = random()
    const cashAt = Number((1.01 + Math.pow(u, 1.6) * 9 + (u > 0.9 ? random() * 14 : 0)).toFixed(2))
    return {
      id: `bot-${roundNumber}-${index}`,
      username: NAME_POOL[Math.floor(random() * NAME_POOL.length)],
      stake: STAKE_POOL[Math.floor(random() * STAKE_POOL.length)],
      cashAt,
    }
  })
}

function crowdFromMultiplier(round: PublicRound | null, multiplier: number, liveBets: LiveBet[]) {
  const realOpen = liveBets.filter((bet) => bet.status === "open").length
  const realCashed = liveBets.filter((bet) => bet.status === "cashed" && bet.cashoutMultiplier != null)

  if (!round) {
    return { floats: [] as FloatItem[], inPlay: 0, total: 1 }
  }

  const bots = seedBots(round.roundNumber)
  const total = bots.length + Math.max(liveBets.length, realOpen + realCashed.length)

  if (round.status === "betting") {
    return { floats: [] as FloatItem[], inPlay: bots.length + realOpen, total }
  }

  if (round.status === "crashed") {
    const crash = round.crashPoint ?? multiplier
    const late = bots
      .filter((bot) => bot.cashAt <= crash)
      .sort((a, b) => b.cashAt - a.cashAt)
      .slice(0, 4)
      .map((bot, index) => ({
        id: bot.id,
        username: bot.username,
        multiplier: bot.cashAt,
        payout: Math.round(bot.stake * bot.cashAt * 100) / 100,
        lane: index % 5,
      }))
    return { floats: late, inPlay: 0, total }
  }

  // Flying: deterministic — every device at the same multiplier shows the same pops/count
  const cashedBots = bots.filter((bot) => bot.cashAt <= multiplier)
  const inPlay = bots.length - cashedBots.length + realOpen

  const recentBots = cashedBots
    .filter((bot) => multiplier - bot.cashAt <= FLOAT_WINDOW)
    .sort((a, b) => b.cashAt - a.cashAt)
    .slice(0, 5)
    .map((bot, index) => ({
      id: bot.id,
      username: bot.username,
      multiplier: bot.cashAt,
      payout: Math.round(bot.stake * bot.cashAt * 100) / 100,
      lane: index % 5,
    }))

  const recentReal = realCashed
    .filter((bet) => {
      const at = bet.cashoutMultiplier ?? 0
      return multiplier - at <= FLOAT_WINDOW * 1.5
    })
    .slice(0, 3)
    .map((bet, index) => ({
      id: `live-${bet.id}`,
      username: bet.mine ? "You" : bet.username,
      multiplier: bet.cashoutMultiplier!,
      payout: bet.profit != null ? bet.amount + bet.profit : bet.amount * (bet.cashoutMultiplier ?? 1),
      lane: (index + 2) % 5,
    }))

  const floats = [...recentReal, ...recentBots].slice(0, 8)
  return { floats, inPlay, total }
}

export function useCashoutCrowd({
  round,
  liveBets,
}: {
  round: PublicRound | null
  liveBets: LiveBet[]
}) {
  const [multiplier, setMultiplier] = useState(1)

  useEffect(() => {
    const sync = () => setMultiplier(getMultiplier())
    sync()
    const unsubscribe = subscribeMultiplier(sync)
    return () => {
      unsubscribe()
    }
  }, [round?.id, round?.status])

  return useMemo(() => {
    const crowd = crowdFromMultiplier(round, multiplier, liveBets)
    return {
      floats: crowd.floats,
      inPlay: Math.max(0, crowd.inPlay),
      total: Math.max(crowd.total, crowd.inPlay, 1),
    }
  }, [round, liveBets, multiplier])
}

export function CashoutFloats({ items }: { items: FloatItem[] }) {
  if (!items.length) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {items.map((item) => (
        <div
          key={item.id}
          className="cashout-float absolute left-3 flex max-w-[min(220px,62%)] items-center gap-2 rounded-full border border-[#39ff14]/40 bg-[#07140c]/88 px-2.5 py-1 text-[11px] shadow-[0_0_16px_rgba(57,255,20,0.22)] backdrop-blur-sm"
          style={{ top: `${28 + item.lane * 13}%` }}
        >
          <span className="max-w-[68px] truncate text-white/90">{item.username}</span>
          <span className="font-mono font-semibold text-[#39ff14]">{item.multiplier.toFixed(2)}x</span>
          <span className="font-mono text-[#9dffb0]">+{money(item.payout)}</span>
        </div>
      ))}
    </div>
  )
}
