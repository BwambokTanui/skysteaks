import { NextResponse } from "next/server"
import { AdminForbiddenError, requireAdmin } from "@/lib/admin"
import { fail, fromError, GameDataError } from "@/lib/game/errors"
import { listAdminDeposits, mapDepositRequest } from "@/lib/deposits"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    await requireAdmin()
    const deposits = await listAdminDeposits()
    return NextResponse.json({ deposits })
  } catch (error) {
    if (error instanceof AdminForbiddenError) return fail(error.message, 403)
    return fromError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { user, service } = await requireAdmin()
    const body = (await request.json()) as { action?: string; depositId?: string }
    const depositId = String(body.depositId ?? "")
    if (!depositId) return fail("Deposit id required.", 400)

    if (body.action === "approve") {
      const { data, error } = await service.rpc("admin_approve_deposit", {
        p_id: depositId,
        p_admin: user.id,
      })
      if (error) throw new GameDataError(error.message)
      return NextResponse.json({ deposit: mapDepositRequest((data ?? {}) as Record<string, unknown>) })
    }

    if (body.action === "reject") {
      const { data, error } = await service.rpc("admin_reject_deposit", {
        p_id: depositId,
        p_admin: user.id,
      })
      if (error) throw new GameDataError(error.message)
      return NextResponse.json({ deposit: mapDepositRequest((data ?? {}) as Record<string, unknown>) })
    }

    return fail("Unknown action.", 400)
  } catch (error) {
    if (error instanceof AdminForbiddenError) return fail(error.message, 403)
    return fromError(error)
  }
}
