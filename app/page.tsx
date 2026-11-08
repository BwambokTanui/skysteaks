import { HomeLobby } from "@/components/lobby/home-lobby"
import { ConfigError, GameDataError, cleanMessage, isSchemaMessage } from "@/lib/game/errors"
import { loadSportsCatalog } from "@/lib/sports/server"

export const dynamic = "force-dynamic"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ live?: string; sport?: string }>
}) {
  const params = await searchParams
  const live = params.live === "1"
  const sport = params.sport || null
  let catalog = null
  let error: string | null = null
  let code: "config" | "schema" | "error" | null = null

  try {
    catalog = await loadSportsCatalog({ live, sport })
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
      console.error(caught)
    }
  }

  return <HomeLobby catalog={catalog} error={error} code={code} sport={sport} live={live} />
}
