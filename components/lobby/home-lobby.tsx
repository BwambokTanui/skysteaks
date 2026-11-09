"use client"

import { SportsBoard } from "@/components/sports/sports-board"
import type { SportsCatalog } from "@/lib/sports/types"

export function HomeLobby({
  catalog,
  error,
  code,
  sport,
  live,
  league,
  day,
}: {
  catalog: SportsCatalog | null
  error?: string | null
  code?: "config" | "schema" | "error" | null
  sport?: string | null
  live?: boolean
  league?: string | null
  day?: string | null
}) {
  return (
    <SportsBoard catalog={catalog} error={error} code={code} sport={sport} live={live} league={league} day={day} />
  )
}
