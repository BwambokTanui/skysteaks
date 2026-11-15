import "server-only"

import { createServiceClient } from "@/lib/supabase/service"
import { ConfigError, GameDataError } from "@/lib/game/errors"

export type DepositMethod = {
  id: string
  asset: string
  network: string
  address: string
  iconUrl: string | null
  sortOrder: number
}

export type DepositRequest = {
  id: string
  userId: string
  methodId: string | null
  amountUsd: number
  requestedCrypto: number
  asset: string
  network: string
  address: string
  status: "processing" | "awaiting_confirmation" | "approved" | "rejected" | "cancelled"
  priceUsd: number | null
  note: string | null
  addressCopiedAt: string | null
  userConfirmedAt: string | null
  reviewedAt: string | null
  createdAt: string
  relatedWithdrawalId?: string | null
  username?: string
}

const STABLE = new Set(["USDT", "USDC"])

const COINCAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binance-coin",
  SOL: "solana",
  XRP: "xrp",
  LTC: "litecoin",
  DOGE: "dogecoin",
  ADA: "cardano",
}

function assetDecimals(asset: string) {
  if (STABLE.has(asset.toUpperCase())) return 2
  if (asset.toUpperCase() === "BTC") return 8
  if (asset.toUpperCase() === "ETH" || asset.toUpperCase() === "BNB") return 6
  return 6
}

export async function fetchAssetPriceUsd(asset: string) {
  const symbol = asset.toUpperCase()
  if (STABLE.has(symbol)) return 1
  const id = COINCAP[symbol]
  if (!id) return null
  try {
    const response = await fetch(`https://api.coincap.io/v2/assets/${id}`, {
      next: { revalidate: 30 },
    })
    if (!response.ok) return null
    const data = (await response.json()) as { data?: { priceUsd?: string } }
    const price = Number(data.data?.priceUsd)
    return Number.isFinite(price) && price > 0 ? price : null
  } catch {
    return null
  }
}

/** Unique on-chain amount so admin can match the transfer. */
export function fingerprintCryptoAmount(usd: number, priceUsd: number, asset: string) {
  const decimals = assetDecimals(asset)
  const base = usd / priceUsd
  const noise = Math.random() * Math.pow(10, -Math.min(decimals, 6))
  const value = base + noise
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export function mapDepositMethod(row: Record<string, unknown>): DepositMethod {
  return {
    id: String(row.id),
    asset: String(row.asset),
    network: String(row.network),
    address: String(row.address),
    iconUrl: row.icon_url == null ? null : String(row.icon_url),
    sortOrder: Number(row.sort_order ?? 0),
  }
}

export function mapDepositRequest(row: Record<string, unknown>): DepositRequest {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    methodId: row.method_id == null ? null : String(row.method_id),
    amountUsd: Number(row.amount_usd),
    requestedCrypto: Number(row.requested_crypto),
    asset: String(row.asset),
    network: String(row.network),
    address: String(row.address),
    status: String(row.status) as DepositRequest["status"],
    priceUsd: row.price_usd == null ? null : Number(row.price_usd),
    note: row.note == null ? null : String(row.note),
    addressCopiedAt: row.address_copied_at == null ? null : String(row.address_copied_at),
    userConfirmedAt: row.user_confirmed_at == null ? null : String(row.user_confirmed_at),
    reviewedAt: row.reviewed_at == null ? null : String(row.reviewed_at),
    createdAt: String(row.created_at),
    relatedWithdrawalId: row.related_withdrawal_id == null ? null : String(row.related_withdrawal_id),
  }
}

export async function listDepositMethods() {
  const service = createServiceClient()
  if (!service) throw new ConfigError()
  const { data, error } = await service
    .from("deposit_methods")
    .select("id, asset, network, address, icon_url, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
  if (error) throw new GameDataError(error.message)
  return ((data ?? []) as Record<string, unknown>[]).map(mapDepositMethod)
}

export async function listUserDeposits(userId: string) {
  const service = createServiceClient()
  if (!service) throw new ConfigError()
  const { data, error } = await service
    .from("deposit_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40)
  if (error) throw new GameDataError(error.message)
  return ((data ?? []) as Record<string, unknown>[]).map(mapDepositRequest)
}

export async function listAdminDeposits() {
  const service = createServiceClient()
  if (!service) throw new ConfigError()
  const { data, error } = await service
    .from("deposit_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60)
  if (error) throw new GameDataError(error.message)

  const rows = ((data ?? []) as Record<string, unknown>[]).map(mapDepositRequest)
  const ids = [...new Set(rows.map((row) => row.userId))]
  if (!ids.length) return rows

  const { data: profiles } = await service.from("profiles").select("id, username").in("id", ids)
  const names = new Map(((profiles ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), String(row.username)]))
  return rows.map((row) => ({ ...row, username: names.get(row.userId) ?? "pilot" }))
}
