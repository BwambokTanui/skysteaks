"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useBalance } from "@/components/layout/balance"
import { cn } from "@/lib/cn"
import { ksh } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"

export function SiteHeader({
  configured,
  email,
  username,
}: {
  configured: boolean
  email: string | null
  username: string | null
}) {
  const path = usePathname()
  const router = useRouter()
  const { balance, setBalance } = useBalance()
  const [pending, setPending] = useState(false)
  const signedIn = Boolean(email || username)
  const hide = path.startsWith("/aviator")

  if (hide) return null

  async function signOut() {
    if (!configured) return
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    setBalance(null)
    setPending(false)
    router.replace("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 bg-[#e31b23] text-white">
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between gap-3 px-3">
        <Link href="/" className="text-base font-bold tracking-tight">
          SkySteaks
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/sports" className="grid h-8 w-8 place-items-center rounded-full bg-black/15" aria-label="Search sports">
            <SearchIcon />
          </Link>
          {signedIn ? (
            <Link href="/account" className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 text-sm font-semibold">
              {balance == null ? "KSh —" : ksh(balance)}
            </Link>
          ) : (
            <Link href="/login" className="rounded-full bg-black/20 px-3 py-1.5 text-sm font-semibold">
              Log in
            </Link>
          )}
          {signedIn && (
            <button type="button" onClick={signOut} disabled={pending} className="text-xs text-white/80 disabled:opacity-50">
              Out
            </button>
          )}
        </div>
      </div>
      <div className="border-t border-black/10 bg-[#c8161d]">
        <div className="mx-auto flex max-w-lg gap-1 overflow-x-auto px-2 py-1.5 text-xs">
          {[
            { href: "/", label: "Home" },
            { href: "/sports", label: "Sports" },
            { href: "/sports?live=1", label: "Live" },
            { href: "/games", label: "Games" },
            { href: "/aviator", label: "Aviator" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1",
                path === link.href || (link.href !== "/" && path.startsWith(link.href.split("?")[0]))
                  ? "bg-white text-[#e31b23]"
                  : "bg-black/15 text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}
