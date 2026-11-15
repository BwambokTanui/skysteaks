import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { fail, fromError, GameDataError } from "@/lib/game/errors"
import { createClient } from "@/lib/supabase/server"
import { fetchAssetPriceUsd, fingerprintCryptoAmount, listUserDeposits, mapDepositRequest } from "@/lib/deposits"
import { createServiceClient } from "@/lib/supabase/service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return fail("Sign in required.", 401)
    const deposits = await listUserDeposits(userId)
    return NextResponse.json({ deposits })
  } catch (error) {
    return fromError(error)
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) return fail("Sign in to deposit.", 401)
    const body = (await request.json()) as {
      methodId?: string
      amountUsd?: number
      relatedWithdrawalId?: string
      feeKind?: "commission" | "escrow"
    }
    const methodId = String(body.methodId ?? "")
    const relatedWithdrawalId = body.relatedWithdrawalId ? String(body.relatedWithdrawalId) : null
    const feeKind = body.feeKind ?? null
    let amountUsd = Number(body.amountUsd)

    if (!methodId) return fail("Choose a deposit method.", 400)

    const service = createServiceClient()
    if (!service) return fail("Wallet not configured.", 500)

    if (relatedWithdrawalId && feeKind) {
      const { data: withdrawal, error: withdrawalError } = await service
        .from("withdrawal_requests")
        .select("id, user_id, status, commission_fee, escrow_fee")
        .eq("id", relatedWithdrawalId)
        .eq("user_id", userId)
        .maybeSingle()
      if (withdrawalError) throw new GameDataError(withdrawalError.message)
      if (!withdrawal) return fail("Withdrawal not found.", 404)
      if (String(withdrawal.status) !== "awaiting_confirmation") {
        return fail("Withdrawal is not ready for fee payment.", 400)
      }
      amountUsd =
        feeKind === "commission"
          ? Number(withdrawal.commission_fee)
          : Number(withdrawal.escrow_fee)
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
        return fail(`This withdrawal has no ${feeKind} fee.`, 400)
      }
    } else {
      if (!Number.isFinite(amountUsd) || amountUsd < 10) return fail("Minimum deposit is USD 10.", 400)
      if (amountUsd > 50000) return fail("Maximum deposit is USD 50,000.", 400)
    }

    const { data: method, error: methodError } = await service
      .from("deposit_methods")
      .select("id, asset, network, address, is_active")
      .eq("id", methodId)
      .eq("is_active", true)
      .maybeSingle()
    if (methodError) throw new GameDataError(methodError.message)
    if (!method) return fail("Deposit method unavailable.", 400)

    const priceUsd = await fetchAssetPriceUsd(String(method.asset))
    if (priceUsd == null) return fail(`Could not fetch ${method.asset} price. Try again.`, 502)
    const requestedCrypto = fingerprintCryptoAmount(amountUsd, priceUsd, String(method.asset))

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("create_deposit_request", {
      p_method_id: methodId,
      p_amount_usd: amountUsd,
      p_requested_crypto: requestedCrypto,
      p_price_usd: priceUsd,
      p_related_withdrawal_id: relatedWithdrawalId,
      p_fee_kind: feeKind,
    })
    if (error) throw new GameDataError(error.message)
    return NextResponse.json({ deposit: mapDepositRequest((data ?? {}) as Record<string, unknown>) })
  } catch (error) {
    return fromError(error)
  }
}
