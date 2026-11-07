import type { Metadata } from "next"
import { GameBoard } from "@/components/game/game-board"

export const metadata: Metadata = {
  title: "Aviator",
}

export default function AviatorPage() {
  return <GameBoard />
}
