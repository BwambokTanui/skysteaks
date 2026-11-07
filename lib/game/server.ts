import "server-only"

import { hasServiceKey } from "@/lib/env"
import { createServiceClient } from "@/lib/supabase/service"
import { ConfigError, GameDataError } from "@/lib/game/errors"
import type { Bet, BetStatus, GameState, HistoryPoint, LiveBet, PublicRound, RoundStatus } from "@/lib/game/types"

type Row = Record<string, unknown>

function asRecord(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new GameDataError(message)
  return value as Row
}

function asString(value: unknown, message: string) {
  if (typeof value === "string" && value) return value
  if (value instanceof Date) return value.toISOString()
  throw new GameDataError(message)
}

function asNullableString(value: unknown) {
  if (value == null) return null
  return asString(value, "bad round")
}

function asNumber(value: unknown, message: string) {
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) throw new GameDataError(message)
  return numeric
}

function asNullableNumber(value: unknown) {
  if (value == null) return null
  return asNumber(value, "bad bet")
}

function asStatus(value: unknown): RoundStatus {
  if (value === "betting" || value === "flying" || value === "crashed") return value
  throw new GameDataError("bad round")
}

function asBetStatus(value: unknown): BetStatus {
  if (value === "open" || value === "cashed" || value === "lost" || value === "cancelled") return value
  throw new GameDataError("bad bet")
}

function mapRound(value: unknown) {
  const row = asRecord(value, "bad round")
  const status = asStatus(row.status)
  const reveal = status === "crashed"
  const round: PublicRound = {
    id: asString(row.id, "bad round"),
    roundNumber: asNumber(row.roundNumber, "bad round"),
    status,
    bettingStartedAt: asString(row.bettingStartedAt, "bad round"),
    bettingEndsAt: asString(row.bettingEndsAt, "bad round"),
    flyingStartedAt: asNullableString(row.flyingStartedAt),
    crashedAt: asNullableString(row.crashedAt),
    serverSeedHash: asString(row.serverSeedHash, "bad round"),
    serverSeed: reveal ? asNullableString(row.serverSeed) : null,
    crashPoint: reveal ? asNullableNumber(row.crashPoint) : null,
  }
  return { round, serverNow: asString(row.serverNow, "bad round") }
}

function mapBet(row: Row): Bet {
  return {
    id: asString(row.id, "bad bet"),
    roundId: asString(row.round_id, "bad bet"),
    roundNumber: asNumber(row.round_number, "bad bet"),
    slot: asNumber(row.slot, "bad bet"),
    amount: asNumber(row.amount, "bad bet"),
    autoCashout: asNullableNumber(row.auto_cashout),
    status: asBetStatus(row.status),
    cashoutMultiplier: asNullableNumber(row.cashout_multiplier),
    profit: asNullableNumber(row.profit),
  }
}

async function rows(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query
  if (error) throw new GameDataError(error.message)
  return (data ?? []) as Row[]
}

export async function syncRound() {
  const service = createServiceClient()
  if (!service || !hasServiceKey()) throw new ConfigError()
  const { data, error } = await service.rpc("sync_rounds")
  if (error) throw new GameDataError(error.message)
  return { service, ...mapRound(data) }
}

export async function loadState(userId: string | null): Promise<GameState> {
  const { service, round, serverNow } = await syncRound()
  const [mineRows, liveRows, historyRows, profileResult] = await Promise.all([
    userId
      ? rows(service.from("bets").select("*").eq("user_id", userId).eq("round_id", round.id))
      : Promise.resolve([] as Row[]),
    rows(
      service
        .from("bets")
        .select("id, user_id, amount, status, cashout_multiplier, profit")
        .eq("round_id", round.id)
        .neq("status", "cancelled")
        .order("amount", { ascending: false })
        .limit(40),
    ),
    rows(
      service
        .from("rounds")
        .select("round_number, crash_point, server_seed, server_seed_hash")
        .eq("status", "crashed")
        .order("round_number", { ascending: false })
        .limit(18),
    ),
    userId
      ? service.from("profiles").select("username, balance").eq("id", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (profileResult.error) throw new GameDataError(profileResult.error.message)

  const ids = [...new Set(liveRows.map((row) => asString(row.user_id, "bad bet")))]
  const nameRows = ids.length
    ? await rows(service.from("profiles").select("id, username").in("id", ids))
    : []
  const names = new Map(nameRows.map((row) => [asString(row.id, "bad profile"), asString(row.username, "bad profile")]))

  const liveBets: LiveBet[] = liveRows.map((row) => ({
    id: asString(row.id, "bad bet"),
    username: names.get(asString(row.user_id, "bad bet")) ?? "pilot",
    amount: asNumber(row.amount, "bad bet"),
    status: asBetStatus(row.status),
    cashoutMultiplier: asNullableNumber(row.cashout_multiplier),
    profit: asNullableNumber(row.profit),
    mine: userId != null && row.user_id === userId,
  }))

  const history: HistoryPoint[] = historyRows.map((row) => ({
    roundNumber: asNumber(row.round_number, "bad round"),
    crashPoint: asNumber(row.crash_point, "bad round"),
    serverSeed: asString(row.server_seed, "bad round"),
    serverSeedHash: asString(row.server_seed_hash, "bad round"),
  }))

  const profile = profileResult.data

  return {
    serverNow,
    round,
    balance: profile ? asNumber(profile.balance, "bad profile") : null,
    me: profile ? { username: asString(profile.username, "bad profile") } : null,
    myBets: mineRows.map(mapBet).filter((bet) => bet.status !== "cancelled"),
    liveBets,
    history,
    authenticated: Boolean(userId),
  }
}

export async function mutate(name: "place_bet" | "cashout_bet" | "cancel_bet", args: Record<string, unknown>) {
  const service = createServiceClient()
  if (!service) throw new ConfigError()
  const synced = await service.rpc("sync_rounds")
  if (synced.error) throw new GameDataError(synced.error.message)
  const { error } = await service.rpc(name, args)
  if (error) throw new GameDataError(error.message)
}
