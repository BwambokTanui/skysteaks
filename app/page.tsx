import { HomeLobby } from "@/components/lobby/home-lobby"
import { isSchemaMessage } from "@/lib/game/errors"
import { loadSportsCatalog } from "@/lib/sports/server"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  let catalog = null
  try {
    catalog = await loadSportsCatalog({ featured: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (!isSchemaMessage(message) && message !== "config") {
      console.error(error)
    }
    catalog = null
  }

  return <HomeLobby catalog={catalog} />
}
