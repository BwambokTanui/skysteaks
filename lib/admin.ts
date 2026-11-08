import "server-only"

import { getSessionContext } from "@/lib/auth"
import { createServiceClient } from "@/lib/supabase/service"
import { ConfigError, GameDataError } from "@/lib/game/errors"

export class AdminForbiddenError extends Error {
  constructor(message = "Admin access required") {
    super(message)
    this.name = "AdminForbiddenError"
  }
}

export async function requireAdmin() {
  const session = await getSessionContext()
  if (!session.configured) throw new ConfigError()
  if (!session.user) throw new AdminForbiddenError("Sign in required")

  const service = createServiceClient()
  if (!service) throw new ConfigError()

  const { data, error } = await service.from("profiles").select("username, balance, is_admin").eq("id", session.user.id).maybeSingle()
  if (error) throw new GameDataError(error.message)
  if (!data?.is_admin) throw new AdminForbiddenError()

  return {
    service,
    user: session.user,
    profile: {
      username: String(data.username),
      balance: Number(data.balance),
      isAdmin: true as const,
    },
  }
}

export async function loadAdminOverview() {
  const { service } = await requireAdmin()
  const synced = await service.rpc("sync_rounds")
  if (synced.error) throw new GameDataError(synced.error.message)

  const { data: round, error: roundError } = await service
    .from("rounds")
    .select("id, round_number, status, server_seed, server_seed_hash, crash_point, fly_ms, forced, betting_started_at, betting_ends_at, flying_started_at, crashed_at")
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (roundError) throw new GameDataError(roundError.message)

  const { data: nextOverride } = await service.from("admin_settings").select("value").eq("key", "next_crash_point").maybeSingle()

  const [{ data: users, error: usersError }, { data: tickets, error: ticketsError }, { count: liveEvents }, { data: history }] =
    await Promise.all([
      service.from("profiles").select("id, username, balance, is_admin, created_at").order("created_at", { ascending: false }).limit(50),
      service.from("tickets").select("id, user_id, stake, total_odds, potential_payout, status, created_at").order("created_at", { ascending: false }).limit(30),
      service.from("events").select("id", { count: "exact", head: true }).eq("status", "live"),
      service
        .from("rounds")
        .select("round_number, crash_point, forced, status, crashed_at")
        .order("round_number", { ascending: false })
        .limit(20),
    ])

  if (usersError) throw new GameDataError(usersError.message)
  if (ticketsError && !ticketsError.message.includes("does not exist")) throw new GameDataError(ticketsError.message)

  return {
    serverNow: new Date().toISOString(),
    round: round
      ? {
          id: String(round.id),
          roundNumber: Number(round.round_number),
          status: String(round.status),
          serverSeed: String(round.server_seed),
          serverSeedHash: String(round.server_seed_hash),
          crashPoint: Number(round.crash_point),
          flyMs: Number(round.fly_ms),
          forced: Boolean(round.forced),
          bettingStartedAt: String(round.betting_started_at),
          bettingEndsAt: String(round.betting_ends_at),
          flyingStartedAt: round.flying_started_at ? String(round.flying_started_at) : null,
          crashedAt: round.crashed_at ? String(round.crashed_at) : null,
        }
      : null,
    nextCrashPoint: nextOverride?.value && typeof nextOverride.value === "object" && "crash" in (nextOverride.value as object)
      ? Number((nextOverride.value as { crash: number }).crash)
      : null,
    users: (users ?? []).map((row) => ({
      id: String(row.id),
      username: String(row.username),
      balance: Number(row.balance),
      isAdmin: Boolean(row.is_admin),
      createdAt: String(row.created_at),
    })),
    tickets: (tickets ?? []).map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      stake: Number(row.stake),
      totalOdds: Number(row.total_odds),
      potentialPayout: Number(row.potential_payout),
      status: String(row.status),
      createdAt: String(row.created_at),
    })),
    liveEvents: liveEvents ?? 0,
    history: (history ?? []).map((row) => ({
      roundNumber: Number(row.round_number),
      crashPoint: Number(row.crash_point),
      forced: Boolean(row.forced),
      status: String(row.status),
      crashedAt: row.crashed_at ? String(row.crashed_at) : null,
    })),
  }
}
