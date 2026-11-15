import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { fail, fromError, GameDataError } from "@/lib/game/errors"
import { createClient } from "@/lib/supabase/server"
import { nextCommissionFee, listUserWithdrawals, mapWithdrawal } from "@/lib/withdrawals"
import { createServiceClient } from "@/lib/supabase/service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return fail("Sign in required.", 401)
    const service = createServiceClient()
    if (!service) return fail("Wallet not configured.", 500)
    const [withdrawals, commission] = await Promise.all([
      listUserWithdrawals(userId),
      service.rpc("has_approved_commission_fee", { p_user: userId }),
    ])
    return NextResponse.json({
      withdrawals,
      commissionPaid: Boolean(commission.data),
    })
  } catch (error) {
    return fromError(error)
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) return fail("Sign in to withdraw.", 401)
    const body = (await request.json()) as {
      amount?: number
      asset?: string
      network?: string
      address?: string
    }
    const amount = Number(body.amount)
    const address = String(body.address ?? "").trim()
    if (!Number.isFinite(amount) || amount < 10) return fail("Minimum withdrawal is USD 10.", 400)
    if (address.length < 8) return fail("Enter a valid payout address.", 400)

    const service = createServiceClient()
    if (!service) return fail("Wallet not configured.", 500)
    const paid = await service.rpc("has_approved_commission_fee", { p_user: userId })
    const commissionFee = paid.data ? null : nextCommissionFee()

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("create_withdrawal_request", {
      p_amount: amount,
      p_asset: body.asset || "USDT",
      p_network: body.network || "TRC-20",
      p_address: address,
      p_commission_fee: commissionFee,
    })
    if (error) throw new GameDataError(error.message)
    return NextResponse.json({ withdrawal: mapWithdrawal((data ?? {}) as Record<string, unknown>) })
  } catch (error) {
    return fromError(error)
  }
}
