import { NextResponse } from "next/server"
import { AdminForbiddenError, requireAdmin } from "@/lib/admin"
import { fail, fromError, GameDataError } from "@/lib/game/errors"
import { generateEscrowFee } from "@/lib/fees"
import { listAdminWithdrawals, mapWithdrawal } from "@/lib/withdrawals"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    await requireAdmin()
    const withdrawals = await listAdminWithdrawals()
    return NextResponse.json({ withdrawals })
  } catch (error) {
    if (error instanceof AdminForbiddenError) return fail(error.message, 403)
    return fromError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { user, service } = await requireAdmin()
    const body = (await request.json()) as { action?: string; withdrawalId?: string; escrowFee?: number }
    const withdrawalId = String(body.withdrawalId ?? "")
    if (!withdrawalId) return fail("Withdrawal id required.", 400)

    if (body.action === "confirm") {
      const { data, error } = await service.rpc("admin_confirm_withdrawal", {
        p_id: withdrawalId,
        p_admin: user.id,
      })
      if (error) throw new GameDataError(error.message)
      return NextResponse.json({ withdrawal: mapWithdrawal((data ?? {}) as Record<string, unknown>) })
    }

    if (body.action === "set-escrow") {
      const fee = body.escrowFee != null ? Number(body.escrowFee) : generateEscrowFee()
      const { data, error } = await service.rpc("admin_set_withdrawal_escrow", {
        p_id: withdrawalId,
        p_admin: user.id,
        p_escrow: fee,
      })
      if (error) throw new GameDataError(error.message)
      return NextResponse.json({ withdrawal: mapWithdrawal((data ?? {}) as Record<string, unknown>) })
    }

    if (body.action === "release") {
      const { data, error } = await service.rpc("admin_release_withdrawal", {
        p_id: withdrawalId,
        p_admin: user.id,
      })
      if (error) throw new GameDataError(error.message)
      return NextResponse.json({ withdrawal: mapWithdrawal((data ?? {}) as Record<string, unknown>) })
    }

    if (body.action === "reject") {
      const { data, error } = await service.rpc("admin_reject_withdrawal", {
        p_id: withdrawalId,
        p_admin: user.id,
      })
      if (error) throw new GameDataError(error.message)
      return NextResponse.json({ withdrawal: mapWithdrawal((data ?? {}) as Record<string, unknown>) })
    }

    return fail("Unknown action.", 400)
  } catch (error) {
    if (error instanceof AdminForbiddenError) return fail(error.message, 403)
    return fromError(error)
  }
}
