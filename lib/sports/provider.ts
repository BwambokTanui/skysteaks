import "server-only"

export type LiveFeedMatch = {
  externalId: string
  sportId: "football"
  leagueName: string
  homeTeam: string
  awayTeam: string
  kickoffAt: string
  status: "open" | "live" | "settled"
  homeScore: number
  awayScore: number
  minute: number | null
  featured: boolean
}

type SportsDbLive = {
  idEvent?: string
  idLiveScore?: string
  strLeague?: string
  strHomeTeam?: string
  strAwayTeam?: string
  intHomeScore?: string | null
  intAwayScore?: string | null
  strStatus?: string
  strProgress?: string | null
  strTimestamp?: string
  dateEvent?: string
  strEventTime?: string
}

type SportsDbEvent = {
  idEvent?: string
  strLeague?: string
  strHomeTeam?: string
  strAwayTeam?: string
  strTimestamp?: string
  dateEvent?: string
  strTime?: string
  intHomeScore?: string | null
  intAwayScore?: string | null
  strStatus?: string
}

const API_KEY = process.env.SPORTSDB_API_KEY || "123"
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`

function toNumber(value: string | null | undefined) {
  if (value == null || value === "") return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function mapStatus(raw: string | undefined): LiveFeedMatch["status"] {
  const status = (raw || "").toUpperCase()
  if (!status || status === "NS" || status === "TBD" || status === "SCHED") return "open"
  if (["FT", "AET", "PEN", "AWD", "WO", "CANC", "PST", "ABD"].includes(status)) return "settled"
  return "live"
}

function kickoffIso(row: { strTimestamp?: string; dateEvent?: string; strEventTime?: string; strTime?: string }) {
  if (row.strTimestamp) {
    const d = new Date(row.strTimestamp.endsWith("Z") ? row.strTimestamp : `${row.strTimestamp}Z`)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  const date = row.dateEvent || new Date().toISOString().slice(0, 10)
  const time = (row.strEventTime || row.strTime || "12:00").slice(0, 8)
  const d = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}Z`)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

/** Build simple 1X2 odds from live score state for betting UI. */
export function oddsForMatch(homeScore: number, awayScore: number, status: LiveFeedMatch["status"]) {
  if (status === "open") {
    return { home: 2.1, draw: 3.3, away: 3.2 }
  }
  const diff = homeScore - awayScore
  if (diff >= 2) return { home: 1.28, draw: 5.4, away: 8.5 }
  if (diff === 1) return { home: 1.55, draw: 4.1, away: 5.8 }
  if (diff === 0) return { home: 2.45, draw: 3.1, away: 2.85 }
  if (diff === -1) return { home: 5.6, draw: 4.0, away: 1.58 }
  return { home: 8.2, draw: 5.2, away: 1.3 }
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${BASE}${path}`, {
      next: { revalidate: 20 },
      headers: { Accept: "application/json" },
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function fetchLiveFootballFeed(): Promise<LiveFeedMatch[]> {
  const [livePayload, nextEpl] = await Promise.all([
    fetchJson<{ livescore?: SportsDbLive[] }>("/livescore.php?s=Soccer"),
    fetchJson<{ events?: SportsDbEvent[] }>("/eventsnextleague.php?id=4328"),
  ])

  const liveRows = livePayload?.livescore ?? []
  const featuredLeagues = /premier league|la liga|serie a|bundesliga|ligue 1|champions league|europa league|mls|saudi/i

  const ranked = liveRows
    .filter((row) => row.strHomeTeam && row.strAwayTeam && row.idEvent)
    .map((row) => {
      const status = mapStatus(row.strStatus)
      const top = featuredLeagues.test(row.strLeague || "")
      return { row, status, top, rank: top ? 0 : status === "live" ? 1 : 2 }
    })
    .filter((item) => item.status !== "settled" && (item.top || item.status === "live"))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 24)

  const liveMatches: LiveFeedMatch[] = ranked.map(({ row, status, top }, index) => ({
    externalId: `tsdb-${row.idEvent}`,
    sportId: "football" as const,
    leagueName: row.strLeague || "Football",
    homeTeam: row.strHomeTeam!,
    awayTeam: row.strAwayTeam!,
    kickoffAt: kickoffIso(row),
    status: status === "open" && row.strProgress ? "live" : status,
    homeScore: toNumber(row.intHomeScore),
    awayScore: toNumber(row.intAwayScore),
    minute: row.strProgress ? toNumber(row.strProgress) : null,
    featured: index < 10 || top,
  }))

  const upcoming: LiveFeedMatch[] = (nextEpl?.events ?? []).slice(0, 12).map((row, index) => ({
    externalId: `tsdb-${row.idEvent}`,
    sportId: "football" as const,
    leagueName: row.strLeague || "Premier League",
    homeTeam: row.strHomeTeam || "Home",
    awayTeam: row.strAwayTeam || "Away",
    kickoffAt: kickoffIso(row),
    status: "open" as const,
    homeScore: 0,
    awayScore: 0,
    minute: null,
    featured: index < 6,
  }))

  const byId = new Map<string, LiveFeedMatch>()
  for (const match of [...liveMatches, ...upcoming]) {
    if (!byId.has(match.externalId)) byId.set(match.externalId, match)
  }
  return [...byId.values()]
}
