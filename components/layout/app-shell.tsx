"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/layout/bottom-nav"
import { SiteHeader } from "@/components/layout/site-header"
import { BetslipDock } from "@/components/sports/betslip"
import { cn } from "@/lib/cn"

export function AppShell({
  configured,
  email,
  username,
  isAdmin = false,
  children,
}: {
  configured: boolean
  email: string | null
  username: string | null
  isAdmin?: boolean
  children: React.ReactNode
}) {
  const path = usePathname() ?? ""
  const aviator = path.startsWith("/aviator")
  const admin = path.startsWith("/admin")

  return (
    <>
      <Suspense fallback={null}>
        <SiteHeader configured={configured} email={email} username={username} isAdmin={isAdmin} />
      </Suspense>
      <main className={cn("flex-1", !aviator && !admin && "pb-[calc(56px+env(safe-area-inset-bottom))]")}>{children}</main>
      {!admin && <BottomNav />}
      {!aviator && !admin && <BetslipDock />}
    </>
  )
}
