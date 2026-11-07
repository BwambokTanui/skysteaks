import type { Metadata } from "next"
import { SportsBoard } from "@/components/sports/sports-board"
import { ConfigError, GameDataError, cleanMessage, isSchemaMessage } from "@/lib/game/errors"
import { loadSportsCatalog } from "@/lib/sports/server"

export const metadata: Metadata = {
  title: "Sports",
}

export const dynamic = "force-dynamic"

export default async function SportsPage({
  searchParams,
}: {
  searchParams: Promise<{ live?: string }>
}) {
  const params = await searchParams
  const live = params.live === "1"
  let catalog = null
  let error: string | null = null
  let code: "config" | "schema" | "error" | null = null

  try {
    catalog = await loadSportsCatalog({ live })
  } catch (caught) {
    if (caught instanceof ConfigError) {
      code = "config"
      error = "Add the Supabase URL, anon key, and service role key to .env.local."
    } else if (caught instanceof GameDataError) {
      code = isSchemaMessage(caught.message) ? "schema" : "error"
      error = cleanMessage(caught.message)
    } else {
      code = "error"
      error = "Unable to load the sportsbook."
    }
  }

  return <SportsBoard catalog={catalog} error={error} code={code} live={live} />
}
