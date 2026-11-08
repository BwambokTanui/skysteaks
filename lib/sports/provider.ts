import "server-only"

export type SportId = "football" | "basketball" | "tennis"

export type LiveFeedMatch = {
  externalId: string
  sportId: SportId
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

const SPORT_FEEDS: { sportId: SportId; livePath: string; nextLeagueId?: string; featured: RegExp }[] = [
  {
    sportId: "football",
    livePath: "/livescore.php?s=Soccer",
    nextLeagueId: "4328",
    featured: /premier league|la liga|serie a|bundesliga|ligue 1|champions league|europa league|mls|saudi/i,
  },
  {
    sportId: "basketball",
    livePath: "/livescore.php?s=Basketball",
    nextLeagueId: "4387",
    featured: /nba|euroleague|ncaa|nbl|wnba/i,
  },
  {
    sportId: "tennis",
    livePath: "/livescore.php?s=Tennis",
    featured: /atp|wta|grand slam|open|masters/i,
  },
]

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

/** Build simple 1X2 / match-winner odds from live score state for betting UI. */
export function oddsForMatch(homeScore: number, awayScore: number, status: LiveFeedMatch["status"], allowDraw: boolean) {
  if (status === "open") {
    return allowDraw ? { home: 2.1, draw: 3.3, away: 3.2 } : { home: 1.9, draw: null as number | null, away: 1.95 }
  }
  const diff = homeScore - awayScore
  if (!allowDraw) {
    if (diff >= 2) return { home: 1.25, draw: null, away: 3.9 }
    if (diff === 1) return { home: 1.55, draw: null, away: 2.45 }
    if (diff === 0) return { home: 1.9, draw: null, away: 1.9 }
    if (diff === -1) return { home: 2.45, draw: null, away: 1.55 }
    return { home: 3.9, draw: null, away: 1.25 }
  }
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

function mapLiveRows(
  rows: SportsDbLive[],
  sportId: SportId,
  featured: RegExp,
  limit: number,
): LiveFeedMatch[] {
  const ranked = rows
    .filter((row) => row.strHomeTeam && row.strAwayTeam && (row.idEvent || row.idLiveScore))
    .map((row) => {
      const status = mapStatus(row.strStatus)
      const top = featured.test(row.strLeague || "")
      return { row, status, top, rank: top ? 0 : status === "live" ? 1 : 2 }
    })
    .filter((item) => item.status !== "settled")
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)

  return ranked.map(({ row, status, top }, index) => ({
    externalId: `tsdb-${sportId}-${row.idEvent || row.idLiveScore}`,
    sportId,
    leagueName: row.strLeague || sportId,
    homeTeam: row.strHomeTeam!,
    awayTeam: row.strAwayTeam!,
    kickoffAt: kickoffIso(row),
    status: status === "open" && row.strProgress ? "live" : status,
    homeScore: toNumber(row.intHomeScore),
    awayScore: toNumber(row.intAwayScore),
    minute: row.strProgress ? toNumber(row.strProgress) : null,
    featured: index < 8 || top,
  }))
}

async function fetchSportFeed(config: (typeof SPORT_FEEDS)[number]): Promise<LiveFeedMatch[]> {
  const [livePayload, nextPayload] = await Promise.all([
    fetchJson<{ livescore?: SportsDbLive[] }>(config.livePath),
    config.nextLeagueId
      ? fetchJson<{ events?: SportsDbEvent[] }>(`/eventsnextleague.php?id=${config.nextLeagueId}`)
      : Promise.resolve(null),
  ])

  const liveMatches = mapLiveRows(livePayload?.livescore ?? [], config.sportId, config.featured, 20)

  const upcoming: LiveFeedMatch[] = (nextPayload?.events ?? []).slice(0, 10).map((row, index) => ({
    externalId: `tsdb-${config.sportId}-${row.idEvent}`,
    sportId: config.sportId,
    leagueName: row.strLeague || config.sportId,
    homeTeam: row.strHomeTeam || "Home",
    awayTeam: row.strAwayTeam || "Away",
    kickoffAt: kickoffIso(row),
    status: "open" as const,
    homeScore: 0,
    awayScore: 0,
    minute: null,
    featured: index < 5,
  }))

  const byId = new Map<string, LiveFeedMatch>()
  for (const match of [...liveMatches, ...upcoming]) {
    if (!byId.has(match.externalId)) byId.set(match.externalId, match)
  }
  return [...byId.values()]
}

/** Fallback cards so basketball/tennis never look empty when the free API is quiet or rate-limited. */
function fallbackMatches(sportId: SportId): LiveFeedMatch[] {
  const now = Date.now()
  if (sportId === "basketball") {
    return [
      {
        externalId: "fallback-nba-lakers-celtics",
        sportId,
        leagueName: "NBA",
        homeTeam: "Lakers",
        awayTeam: "Celtics",
        kickoffAt: new Date(now + 90 * 60_000).toISOString(),
        status: "open",
        homeScore: 0,
        awayScore: 0,
        minute: null,
        featured: true,
      },
      {
        externalId: "fallback-nba-warriors-nuggets",
        sportId,
        leagueName: "NBA",
        homeTeam: "Warriors",
        awayTeam: "Nuggets",
        kickoffAt: new Date(now + 4 * 3600_000).toISOString(),
        status: "open",
        homeScore: 0,
        awayScore: 0,
        minute: null,
        featured: true,
      },
      {
        externalId: "fallback-nba-live-heat-bucks",
        sportId,
        leagueName: "NBA",
        homeTeam: "Heat",
        awayTeam: "Bucks",
        kickoffAt: new Date(now - 35 * 60_000).toISOString(),
        status: "live",
        homeScore: 78,
        awayScore: 74,
        minute: 36,
        featured: true,
      },
    ]
  }
  if (sportId === "tennis") {
    return [
      {
        externalId: "fallback-atp-djokovic-alcaraz",
        sportId,
        leagueName: "ATP Tour",
        homeTeam: "Djokovic",
        awayTeam: "Alcaraz",
        kickoffAt: new Date(now + 70 * 60_000).toISOString(),
        status: "open",
        homeScore: 0,
        awayScore: 0,
        minute: null,
        featured: true,
      },
      {
        externalId: "fallback-atp-sinner-medvedev",
        sportId,
        leagueName: "ATP Tour",
        homeTeam: "Sinner",
        awayTeam: "Medvedev",
        kickoffAt: new Date(now + 3 * 3600_000).toISOString(),
        status: "open",
        homeScore: 0,
        awayScore: 0,
        minute: null,
        featured: true,
      },
      {
        externalId: "fallback-wta-live-swiatek-gauff",
        sportId,
        leagueName: "WTA Tour",
        homeTeam: "Swiatek",
        awayTeam: "Gauff",
        kickoffAt: new Date(now - 40 * 60_000).toISOString(),
        status: "live",
        homeScore: 1,
        awayScore: 0,
        minute: null,
        featured: true,
      },
    ]
  }
  return []
}

export async function fetchAllSportsFeed(): Promise<LiveFeedMatch[]> {
  const batches = await Promise.all(SPORT_FEEDS.map((config) => fetchSportFeed(config)))
  const bySport = new Map<SportId, LiveFeedMatch[]>()
  for (const batch of batches) {
    for (const match of batch) {
      const list = bySport.get(match.sportId) ?? []
      list.push(match)
      bySport.set(match.sportId, list)
    }
  }

  const merged: LiveFeedMatch[] = []
  for (const sportId of ["football", "basketball", "tennis"] as SportId[]) {
    const list = bySport.get(sportId) ?? []
    if (list.length === 0 && sportId !== "football") {
      merged.push(...fallbackMatches(sportId))
    } else {
      merged.push(...list)
    }
  }
  return merged
}

/** @deprecated use fetchAllSportsFeed */
export async function fetchLiveFootballFeed(): Promise<LiveFeedMatch[]> {
  return (await fetchAllSportsFeed()).filter((match) => match.sportId === "football")
}
