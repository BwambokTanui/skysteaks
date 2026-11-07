"use client"

import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/layout/bottom-nav"
import { SiteHeader } from "@/components/layout/site-header"
import { BetslipDock } from "@/components/sports/betslip"
import { cn } from "@/lib/cn"

export function AppShell({
  configured,
  email,
  username,
  children,
}: {
  configured: boolean
  email: string | null
  username: string | null
  children: React.ReactNode
}) {
  const path = usePathname() ?? ""
  const aviator = path.startsWith("/aviator")

  return (
    <>
      <SiteHeader configured={configured} email={email} username={username} />
      <main className={cn("flex-1", !aviator && "pb-[calc(62px+env(safe-area-inset-bottom))]")}>{children}</main>
      <BottomNav />
      {!aviator && <BetslipDock />}
    </>
  )
}
