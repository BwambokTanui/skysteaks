import "server-only"

import { hasServiceKey } from "@/lib/env"
import { ConfigError, GameDataError } from "@/lib/game/errors"
import { createServiceClient } from "@/lib/supabase/service"
import type { Market, Selection, Sport, SportsCatalog, SportsEvent, TicketSummary } from "@/lib/sports/types"

type Row = Record<string, unknown>

function unwrap(value: unknown): Row {
  if (Array.isArray(value)) return (value[0] ?? {}) as Row
  if (value && typeof value === "object") return value as Row
  return {}
}

function asString(value: unknown, message = "bad sports row") {
  if (typeof value === "string" && value) return value
  if (value instanceof Date) return value.toISOString()
  throw new GameDataError(message)
}

function asNumber(value: unknown, message = "bad sports row") {
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) throw new GameDataError(message)
  return numeric
}

function asNullableNumber(value: unknown) {
  if (value == null) return null
  return asNumber(value)
}

function asStatus(value: unknown): SportsEvent["status"] {
  if (value === "open" || value === "live" || value === "settled") return value
  throw new GameDataError("bad event status")
}

async function ensureService() {
  const service = createServiceClient()
  if (!service || !hasServiceKey()) throw new ConfigError()
  const synced = await service.rpc("sync_sportsbook")
  if (synced.error) throw new GameDataError(synced.error.message)
  return service
}

export async function loadSportsCatalog(options?: {
  sport?: string | null
  live?: boolean
  featured?: boolean
}): Promise<SportsCatalog> {
  const service = await ensureService()

  const [{ data: sportRows, error: sportError }, eventsQuery] = await Promise.all([
    service.from("sports").select("id, name, sort_order").order("sort_order"),
    (async () => {
      let query = service
        .from("events")
        .select("id, league_id, home_team, away_team, kickoff_at, status, home_score, away_score, featured, leagues(id, name, sport_id, sports(id, name))")
        .neq("status", "settled")
        .order("kickoff_at", { ascending: true })
        .limit(80)
      if (options?.live) query = query.eq("status", "live")
      if (options?.featured) query = query.eq("featured", true)
      return query
    })(),
  ])

  if (sportError) throw new GameDataError(sportError.message)
  if (eventsQuery.error) throw new GameDataError(eventsQuery.error.message)

  const sports: Sport[] = ((sportRows ?? []) as Row[]).map((row) => ({
    id: asString(row.id),
    name: asString(row.name),
  }))

  let eventRows = (eventsQuery.data ?? []) as Row[]
  if (options?.sport) {
    eventRows = eventRows.filter((row) => {
      const league = row.leagues as Row | null
      const sport = league?.sports as Row | null
      return sport?.id === options.sport
    })
  }

  const eventIds = eventRows.map((row) => asString(row.id))
  const marketsByEvent = new Map<string, Market[]>()

  if (eventIds.length) {
    const { data: marketRows, error: marketError } = await service
      .from("markets")
      .select("id, event_id, key, name, selections(id, key, name, odds)")
      .in("event_id", eventIds)
    if (marketError) throw new GameDataError(marketError.message)

    for (const market of (marketRows ?? []) as Row[]) {
      const eventId = asString(market.event_id)
      const selections = ((market.selections ?? []) as Row[])
        .map(
          (selection): Selection => ({
            id: asString(selection.id),
            key: asString(selection.key),
            name: asString(selection.name),
            odds: asNumber(selection.odds),
          }),
        )
        .sort((a, b) => a.key.localeCompare(b.key))
      const next: Market = {
        id: asString(market.id),
        key: asString(market.key),
        name: asString(market.name),
        selections,
      }
      const list = marketsByEvent.get(eventId) ?? []
      list.push(next)
      marketsByEvent.set(eventId, list)
    }
  }

  const events: SportsEvent[] = eventRows.map((row) => {
    const league = unwrap(row.leagues)
    const sport = unwrap(league.sports)
    return {
      id: asString(row.id),
      sportId: asString(sport.id),
      sportName: asString(sport.name),
      leagueId: asString(league.id ?? row.league_id),
      leagueName: asString(league.name),
      homeTeam: asString(row.home_team),
      awayTeam: asString(row.away_team),
      kickoffAt: asString(row.kickoff_at),
      status: asStatus(row.status),
      homeScore: asNullableNumber(row.home_score),
      awayScore: asNullableNumber(row.away_score),
      featured: Boolean(row.featured),
      markets: marketsByEvent.get(asString(row.id)) ?? [],
    }
  })

  const { count } = await service
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("status", "live")

  return {
    sports,
    events,
    liveCount: count ?? events.filter((event) => event.status === "live").length,
  }
}

export async function placeSportsTicket(userId: string, stake: number, selectionIds: string[]) {
  const service = await ensureService()
  const { data, error } = await service.rpc("place_sports_ticket", {
    p_user: userId,
    p_stake: stake,
    p_selection_ids: selectionIds,
  })
  if (error) throw new GameDataError(error.message)
  const row = (data ?? {}) as Row
  return {
    ticketId: asString(row.ticketId ?? row.ticketid),
    balance: asNumber(row.balance),
    potentialPayout: asNumber(row.potentialPayout ?? row.potentialpayout),
    totalOdds: asNumber(row.totalOdds ?? row.totalodds),
  }
}

export async function loadUserTickets(userId: string): Promise<TicketSummary[]> {
  const service = createServiceClient()
  if (!service) throw new ConfigError()
  const { data, error } = await service
    .from("tickets")
    .select("id, stake, total_odds, potential_payout, status, profit, created_at, ticket_legs(home_team, away_team, selection_name, odds, result)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)
  if (error) throw new GameDataError(error.message)

  return ((data ?? []) as Row[]).map((row) => ({
    id: asString(row.id),
    stake: asNumber(row.stake),
    totalOdds: asNumber(row.total_odds),
    potentialPayout: asNumber(row.potential_payout),
    status: row.status as TicketSummary["status"],
    profit: asNullableNumber(row.profit),
    createdAt: asString(row.created_at),
    legs: ((row.ticket_legs ?? []) as Row[]).map((leg) => ({
      homeTeam: asString(leg.home_team),
      awayTeam: asString(leg.away_team),
      selectionName: asString(leg.selection_name),
      odds: asNumber(leg.odds),
      result: leg.result == null ? null : asString(leg.result),
    })),
  }))
}
