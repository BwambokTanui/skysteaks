import { NextResponse } from "next/server"
import { AdminForbiddenError, loadAdminOverview } from "@/lib/admin"
import { ConfigError, GameDataError } from "@/lib/game/errors"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const overview = await loadAdminOverview()
    return NextResponse.json(overview)
  } catch (error) {
    if (error instanceof AdminForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    if (error instanceof ConfigError) {
      return NextResponse.json({ message: "Supabase is not configured." }, { status: 503 })
    }
    if (error instanceof GameDataError) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    return NextResponse.json({ message: "Unable to load admin overview." }, { status: 500 })
  }
}
