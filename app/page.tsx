import { HomeLobby } from "@/components/lobby/home-lobby"
import { ConfigError, GameDataError, cleanMessage, isSchemaMessage } from "@/lib/game/errors"
import { loadSportsCatalog } from "@/lib/sports/server"

export const dynamic = "force-dynamic"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ live?: string; sport?: string; league?: string; day?: string }>
}) {
  const params = await searchParams
  const live = params.live === "1"
  const sport = params.sport || null
  const league = params.league || null
  const day = params.day === "today"
    ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`
    : params.day || null
  let catalog = null
  let error: string | null = null
  let code: "config" | "schema" | "error" | null = null

  try {
    catalog = await loadSportsCatalog({ live, sport, league, day })
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

  return <HomeLobby catalog={catalog} error={error} code={code} sport={sport} live={live} league={league} day={day === null ? null : params.day === "today" ? "today" : day} />
}
