"use client"

import { AppShell } from "@/components/layout/app-shell"
import { BalanceProvider } from "@/components/layout/balance"
import { SessionProvider } from "@/components/layout/session"
import { BetslipProvider } from "@/components/sports/betslip-context"
import type { ReactNode } from "react"

export function Providers({
  configured,
  email,
  username,
  balance,
  isAdmin = false,
  children,
}: {
  configured: boolean
  email: string | null
  username: string | null
  balance: number | null
  isAdmin?: boolean
  children: ReactNode
}) {
  return (
    <SessionProvider configured={configured} email={email} username={username}>
      <BalanceProvider initial={balance}>
        <BetslipProvider>
          <AppShell configured={configured} email={email} username={username} isAdmin={isAdmin}>
            {children}
          </AppShell>
        </BetslipProvider>
      </BalanceProvider>
    </SessionProvider>
  )
}
