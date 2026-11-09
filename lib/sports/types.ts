export type SportId = "football" | "basketball" | "tennis" | string
export type EventStatus = "open" | "live" | "settled"
export type TicketStatus = "open" | "won" | "lost" | "void" | "cancelled"

export type Sport = {
  id: string
  name: string
}

export type Selection = {
  id: string
  key: string
  name: string
  odds: number
}

export type Market = {
  id: string
  key: string
  name: string
  selections: Selection[]
}

export type SportsEvent = {
  id: string
  sportId: string
  sportName: string
  leagueId: string
  leagueName: string
  homeTeam: string
  awayTeam: string
  kickoffAt: string
  status: EventStatus
  homeScore: number | null
  awayScore: number | null
  minute?: number | null
  featured: boolean
  markets: Market[]
}

export type BetslipItem = {
  selectionId: string
  eventId: string
  marketKey: string
  selectionKey: string
  selectionName: string
  homeTeam: string
  awayTeam: string
  leagueName: string
  odds: number
}

export type SportsCatalog = {
  sports: Sport[]
  events: SportsEvent[]
  liveCount: number
  counts: {
    live: number
    football: number
    premierLeague: number
    laLiga: number
  }
}

export type TicketSummary = {
  id: string
  stake: number
  totalOdds: number
  potentialPayout: number
  status: TicketStatus
  profit: number | null
  createdAt: string
  legs: Array<{
    homeTeam: string
    awayTeam: string
    selectionName: string
    odds: number
    result: string | null
  }>
}
