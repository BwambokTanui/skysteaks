import type { Metadata } from "next"
import { SportsBoard } from "@/components/sports/sports-board"
import { ConfigError, GameDataError, cleanMessage, isSchemaMessage } from "@/lib/game/errors"
import { loadSportsCatalog } from "@/lib/sports/server"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>
}): Promise<Metadata> {
  const { sport } = await params
  const label = sport.charAt(0).toUpperCase() + sport.slice(1)
  return { title: label }
}

export default async function SportPage({
  params,
}: {
  params: Promise<{ sport: string }>
}) {
  const { sport } = await params
  let catalog = null
  let error: string | null = null
  let code: "config" | "schema" | "error" | null = null

  try {
    catalog = await loadSportsCatalog({ sport })
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

  return <SportsBoard catalog={catalog} error={error} code={code} sport={sport} />
}
