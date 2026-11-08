import { NextResponse } from "next/server"
import { AdminForbiddenError, requireAdmin } from "@/lib/admin"
import { ConfigError, GameDataError } from "@/lib/game/errors"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { service } = await requireAdmin()
    const body = (await request.json()) as { action?: string; userId?: string; balance?: number; isAdmin?: boolean }

    if (!body.userId) {
      return NextResponse.json({ message: "userId required" }, { status: 400 })
    }

    if (body.action === "set-balance") {
      const { data, error } = await service.rpc("admin_set_balance", {
        p_user: body.userId,
        p_balance: Number(body.balance),
      })
      if (error) throw new GameDataError(error.message)
      return NextResponse.json({ ok: true, result: data })
    }

    if (body.action === "set-admin") {
      const { data, error } = await service.rpc("admin_set_flag", {
        p_user: body.userId,
        p_admin: Boolean(body.isAdmin),
      })
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
    return NextResponse.json({ message: "Unable to update user." }, { status: 500 })
  }
}
