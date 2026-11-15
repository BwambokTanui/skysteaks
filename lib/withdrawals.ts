import "server-only"

import { createServiceClient } from "@/lib/supabase/service"
import { ConfigError, GameDataError } from "@/lib/game/errors"
import { generateCommissionFee } from "@/lib/fees"

export type WithdrawalRequest = {
  id: string
  userId: string
  amountUsd: number
  networkFeeUsd: number
  destinationAsset: string
  destinationNetwork: string
  destinationAddress: string
  status: "processing" | "awaiting_confirmation" | "approved" | "rejected" | "cancelled"
  commissionFee: number | null
  escrowFee: number | null
  note: string | null
  confirmedAt: string | null
  reviewedAt: string | null
  createdAt: string
  username?: string
  commissionPaid?: boolean
  escrowPaid?: boolean
}

export function mapWithdrawal(row: Record<string, unknown>): WithdrawalRequest {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    amountUsd: Number(row.amount_usd),
    networkFeeUsd: Number(row.network_fee_usd ?? 2.5),
    destinationAsset: String(row.destination_asset ?? "USDT"),
    destinationNetwork: String(row.destination_network ?? "TRC-20"),
    destinationAddress: String(row.destination_address),
    status: String(row.status) as WithdrawalRequest["status"],
    commissionFee: row.commission_fee == null ? null : Number(row.commission_fee),
    escrowFee: row.escrow_fee == null ? null : Number(row.escrow_fee),
    note: row.note == null ? null : String(row.note),
    confirmedAt: row.confirmed_at == null ? null : String(row.confirmed_at),
    reviewedAt: row.reviewed_at == null ? null : String(row.reviewed_at),
    createdAt: String(row.created_at),
  }
}

export function nextCommissionFee() {
  return generateCommissionFee()
}

export async function listUserWithdrawals(userId: string) {
  const service = createServiceClient()
  if (!service) throw new ConfigError()
  const { data, error } = await service
    .from("withdrawal_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40)
  if (error) throw new GameDataError(error.message)
  return ((data ?? []) as Record<string, unknown>[]).map(mapWithdrawal)
}

export async function listAdminWithdrawals() {
  const service = createServiceClient()
  if (!service) throw new ConfigError()
  const { data, error } = await service
    .from("withdrawal_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60)
  if (error) throw new GameDataError(error.message)
  const rows = ((data ?? []) as Record<string, unknown>[]).map(mapWithdrawal)
  const ids = [...new Set(rows.map((row) => row.userId))]
  if (!ids.length) return rows

  const [{ data: profiles }, commissionChecks, escrowChecks] = await Promise.all([
    service.from("profiles").select("id, username").in("id", ids),
    Promise.all(ids.map(async (id) => {
      const { data } = await service.rpc("has_approved_commission_fee", { p_user: id })
      return [id, Boolean(data)] as const
    })),
    Promise.all(ids.map(async (id) => {
      const { data } = await service.rpc("has_approved_escrow_fee", { p_user: id })
      return [id, Boolean(data)] as const
    })),
  ])

  const names = new Map(((profiles ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), String(row.username)]))
  const commissionMap = new Map(commissionChecks)
  const escrowMap = new Map(escrowChecks)

  return rows.map((row) => ({
    ...row,
    username: names.get(row.userId) ?? "pilot",
    commissionPaid: commissionMap.get(row.userId) ?? false,
    escrowPaid: escrowMap.get(row.userId) ?? false,
  }))
}

export async function getWithdrawal(id: string, userId?: string) {
  const service = createServiceClient()
  if (!service) throw new ConfigError()
  let query = service.from("withdrawal_requests").select("*").eq("id", id)
  if (userId) query = query.eq("user_id", userId)
  const { data, error } = await query.maybeSingle()
  if (error) throw new GameDataError(error.message)
  if (!data) return null
  return mapWithdrawal(data as Record<string, unknown>)
}
