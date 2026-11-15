export const WITHDRAWAL_NETWORK_FEE_USD = 2.5
export const COMMISSION_FEE_USD = 400
export const ESCROW_FEE_USD = 400
export const COMMISSION_FEE_NOTE_PREFIX = "Commission fee for withdrawal"
export const ESCROW_FEE_NOTE_PREFIX = "Escrow fee for withdrawal"
export const MIN_WITHDRAWAL_USD = 10

export function generateCommissionFee(baseUsd = COMMISSION_FEE_USD) {
  return Number((baseUsd + (1 + Math.floor(Math.random() * 250)) * 0.004).toFixed(3))
}

export function generateEscrowFee(baseUsd = ESCROW_FEE_USD) {
  return Number((baseUsd + (1 + Math.floor(Math.random() * 250)) * 0.004).toFixed(3))
}

export function commissionFeeNote(withdrawalId: string) {
  return `${COMMISSION_FEE_NOTE_PREFIX} ${withdrawalId}`
}

export function escrowFeeNote(withdrawalId: string) {
  return `${ESCROW_FEE_NOTE_PREFIX} ${withdrawalId}`
}

export function isCommissionDepositNote(note: string | null | undefined) {
  return Boolean(note?.startsWith(COMMISSION_FEE_NOTE_PREFIX))
}

export function isEscrowDepositNote(note: string | null | undefined) {
  return Boolean(note?.startsWith(ESCROW_FEE_NOTE_PREFIX))
}

export function isFeeDepositNote(note: string | null | undefined) {
  return isCommissionDepositNote(note) || isEscrowDepositNote(note)
}
