import type { Metadata } from "next"
import { GamesLobby } from "@/components/games/games-lobby"

export const metadata: Metadata = {
  title: "Games",
}

export default function GamesPage() {
  return <GamesLobby />
}
