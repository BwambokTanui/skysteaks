import type { Metadata } from "next"
import { Verifier } from "@/components/fairness/verifier"

export const metadata: Metadata = { title: "Fairness" }

export default function FairnessPage() {
  return (
    <div className="mx-auto grid w-full max-w-lg gap-6 px-3 py-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.22em] text-[var(--sporty)]">PROVABLY FAIR</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">How a round is decided</h1>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--muted)]">
          <p>When betting opens, SkySteaks publishes the SHA-256 hash of a secret server seed. The crash point is already fixed, and the seed stays hidden until the plane flies away.</p>
          <p>The point comes from HMAC-SHA256 of the round number, keyed by that seed. If the first 13 hex digits form a number divisible by 33, the round crashes at 1.00x. Otherwise it is floor((100 × 2^52 − h) / (2^52 − h)) / 100, capped at 1,000,000.</p>
          <p>The multiplier grows as e^(0.00006 × milliseconds). Your cash out is priced by the database clock, so the browser cannot choose the payout.</p>
        </div>
      </div>
      <Verifier />
    </div>
  )
}
