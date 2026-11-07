export type RoundStatus = "betting" | "flying" | "crashed"
export type BetStatus = "open" | "cashed" | "lost" | "cancelled"

export type PublicRound = {
  id: string
  roundNumber: number
  status: RoundStatus
  bettingStartedAt: string
  bettingEndsAt: string
  flyingStartedAt: string | null
  crashedAt: string | null
  serverSeedHash: string
  serverSeed: string | null
  crashPoint: number | null
}

export type Bet = {
  id: string
  roundId: string
  roundNumber: number
  slot: number
  amount: number
  autoCashout: number | null
  status: BetStatus
  cashoutMultiplier: number | null
  profit: number | null
}

export type LiveBet = {
  id: string
  username: string
  amount: number
  status: BetStatus
  cashoutMultiplier: number | null
  profit: number | null
  mine: boolean
}

export type HistoryPoint = {
  roundNumber: number
  crashPoint: number
  serverSeed: string
  serverSeedHash: string
}

export type GameState = {
  serverNow: string
  round: PublicRound
  balance: number | null
  me: { username: string } | null
  myBets: Bet[]
  liveBets: LiveBet[]
  history: HistoryPoint[]
  authenticated: boolean
}
