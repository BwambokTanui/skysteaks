import { NextResponse } from "next/server"
import { AdminForbiddenError, requireAdmin } from "@/lib/admin"
import { ConfigError, GameDataError } from "@/lib/game/errors"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { service } = await requireAdmin()
    const body = (await request.json()) as { action?: string; crashPoint?: number }
    const crash = Number(body.crashPoint)

    if (body.action === "force-current") {
      const { data, error } = await service.rpc("admin_force_current_crash", { p_crash: crash })
      if (error) throw new GameDataError(error.message)
      return NextResponse.json({ ok: true, result: data })
    }

    if (body.action === "set-next") {
      const { data, error } = await service.rpc("admin_set_next_crash", { p_crash: crash })
      if (error) throw new GameDataError(error.message)
      return NextResponse.json({ ok: true, result: data })
    }

    if (body.action === "clear-next") {
      const { data, error } = await service.rpc("admin_clear_next_crash")
      if (error) throw new GameDataError(error.message)
      return NextResponse.json({ ok: true, result: data })
    }

    return NextResponse.json({ message: "Unknown action." }, { status: 400 })
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
    return NextResponse.json({ message: "Unable to update Aviator controls." }, { status: 500 })
  }
}
