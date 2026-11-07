import { NextResponse } from "next/server"

export class ConfigError extends Error {
  constructor() {
    super("config")
  }
}

export class GameDataError extends Error {}

const known: Record<string, string> = {
  "insufficient balance": "Not enough play credits for that stake.",
  "betting closed": "Betting is closed for this round.",
  "slot taken": "That bet slot is already used this round.",
  "invalid amount": "Stake must be between 1 and 5,000.",
  "invalid auto cashout": "Auto cash out must be between 1.10 and 1,000.",
  "invalid slot": "Choose bet A or bet B.",
  "too late": "The round ended before the cash out landed.",
  "round not flying": "Cash out opens once the round is in flight.",
  "not authenticated": "Sign in to bet.",
  "profile missing": "Your profile is missing. Run the database schema, then sign up again.",
  "wait before topping up": "Wait a few seconds before adding more play credits.",
  "balance cap reached": "Play credit balance is at the 50,000 cap.",
  "bet not found": "That bet is no longer available.",
  "bet not open": "That bet can no longer be changed.",
  "empty ticket": "Add at least one selection to the betslip.",
  "too many selections": "A ticket can hold at most 12 selections.",
  "event settled": "One of those matches is already settled.",
  "same event twice": "You can only pick one market from each match.",
  "selection missing": "A selection on the betslip is no longer available.",
}

export function cleanMessage(message: string) {
  const trimmed = message.trim()
  if (known[trimmed]) return known[trimmed]
  if (/does not exist|schema cache|could not find the function|permission denied|relation/i.test(trimmed)) {
    return "Run supabase/schema.sql in the Supabase SQL editor, then refresh."
  }
  if (/check constraint/i.test(trimmed)) return "That stake is not allowed."
  return "Something went wrong. Try again."
}

export function isSchemaMessage(message: string) {
  return /does not exist|schema cache|could not find the function|permission denied|relation/i.test(message)
}

export function fail(message: string, status = 400, code: "config" | "schema" | "error" = "error") {
  return NextResponse.json({ message, code }, { status })
}

export function fromError(error: unknown) {
  if (error instanceof ConfigError) {
    return fail("Add the Supabase URL, anon key, and service role key to .env.local.", 503, "config")
  }
  if (error instanceof GameDataError) {
    console.error(error.message)
    if (isSchemaMessage(error.message)) return fail(cleanMessage(error.message), 503, "schema")
    const message = cleanMessage(error.message)
    return fail(message, message === "Something went wrong. Try again." ? 500 : 400)
  }
  console.error(error)
  return fail("Something went wrong. Try again.", 500)
}
