import "server-only"

import { createServiceClient } from "@/lib/supabase/service"
import { fetchAllSportsFeed, oddsForMatch, type SportId } from "@/lib/sports/provider"

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48)
}

const SPORT_META: Record<SportId, { name: string; sort: number }> = {
  football: { name: "Football", sort: 1 },
  basketball: { name: "Basketball", sort: 2 },
  tennis: { name: "Tennis", sort: 3 },
}

let lastIngestAt = 0
const INGEST_TTL_MS = 20_000

export async function ingestLiveSportsFeed(force = false) {
  const now = Date.now()
  if (!force && now - lastIngestAt < INGEST_TTL_MS) {
    return { ok: true as const, count: 0, skipped: true as const }
  }

  const service = createServiceClient()
  if (!service) return { ok: false as const, count: 0, skipped: false as const }

  const matches = await fetchAllSportsFeed()
  if (!matches.length) return { ok: false as const, count: 0, skipped: false as const }

  lastIngestAt = now

  for (const [id, meta] of Object.entries(SPORT_META)) {
    await service.from("sports").upsert({ id, name: meta.name, sort_order: meta.sort })
  }

  let count = 0
  for (const match of matches) {
    const leagueId = `ext_${match.sportId}_${slug(match.leagueName) || match.sportId}`
    await service.from("leagues").upsert({
      id: leagueId,
      sport_id: match.sportId,
      name: match.leagueName,
      country: "",
      sort_order: 50,
    })

    const { data: existing } = await service.from("events").select("id").eq("external_id", match.externalId).maybeSingle()

    let eventId = existing?.id as string | undefined
    const payload = {
      league_id: leagueId,
      home_team: match.homeTeam,
      away_team: match.awayTeam,
      kickoff_at: match.kickoffAt,
      status: match.status,
      home_score: match.homeScore,
      away_score: match.awayScore,
      minute: match.minute,
      featured: match.featured,
      external_id: match.externalId,
    }

    if (eventId) {
      await service.from("events").update(payload).eq("id", eventId)
    } else {
      const { data: created, error } = await service.from("events").insert(payload).select("id").single()
      if (error || !created) continue
      eventId = created.id as string
    }

    let marketId: string | undefined
    const { data: marketExisting } = await service
      .from("markets")
      .select("id")
      .eq("event_id", eventId)
      .eq("key", "1x2")
      .maybeSingle()

    if (marketExisting?.id) {
      marketId = marketExisting.id as string
    } else {
      const marketName = match.sportId === "football" ? "Match Result" : "Match Winner"
      const { data: marketCreated } = await service
        .from("markets")
        .insert({ event_id: eventId, key: "1x2", name: marketName })
        .select("id")
        .single()
      marketId = marketCreated?.id as string | undefined
    }
    if (!marketId) continue

    const allowDraw = match.sportId === "football"
    const odds = oddsForMatch(match.homeScore, match.awayScore, match.status, allowDraw)
    const rows = allowDraw
      ? [
          { key: "1", name: "1", odds: odds.home },
          { key: "x", name: "X", odds: odds.draw ?? 3.2 },
          { key: "2", name: "2", odds: odds.away },
        ]
      : [
          { key: "1", name: "1", odds: odds.home },
          { key: "2", name: "2", odds: odds.away },
        ]

    for (const row of rows) {
      const { data: selection } = await service
        .from("selections")
        .select("id")
        .eq("market_id", marketId)
        .eq("key", row.key)
        .maybeSingle()
      if (selection?.id) {
        await service.from("selections").update({ odds: row.odds, name: row.name }).eq("id", selection.id)
      } else {
        await service.from("selections").insert({ market_id: marketId, key: row.key, name: row.name, odds: row.odds })
      }
    }
    count += 1
  }

  return { ok: true as const, count, skipped: false as const }
}
