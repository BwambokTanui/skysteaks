"use client"

import { AppShell } from "@/components/layout/app-shell"
import { BalanceProvider } from "@/components/layout/balance"
import { BetslipProvider } from "@/components/sports/betslip-context"
import type { ReactNode } from "react"

export function Providers({
  configured,
  email,
  username,
  balance,
  children,
}: {
  configured: boolean
  email: string | null
  username: string | null
  balance: number | null
  children: ReactNode
}) {
  return (
    <BalanceProvider initial={balance}>
      <BetslipProvider>
        <AppShell configured={configured} email={email} username={username}>
          {children}
        </AppShell>
      </BetslipProvider>
    </BalanceProvider>
  )
}
