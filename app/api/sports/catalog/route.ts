import { NextResponse } from "next/server"
import { fromError } from "@/lib/game/errors"
import { loadSportsCatalog } from "@/lib/sports/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const sport = url.searchParams.get("sport")
    const live = url.searchParams.get("live") === "1"
    const featured = url.searchParams.get("featured") === "1"
    const catalog = await loadSportsCatalog({ sport, live, featured })
    return NextResponse.json(catalog)
  } catch (error) {
    return fromError(error)
  }
}
