"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { AdminDrawer } from "@/components/layout/admin-drawer"
import { useBalance } from "@/components/layout/balance"
import { cn } from "@/lib/cn"
import { usd } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"

export function SiteHeader({
  configured,
  email,
  username,
  isAdmin = false,
}: {
  configured: boolean
  email: string | null
  username: string | null
  isAdmin?: boolean
}) {
  const path = usePathname() ?? ""
  const search = useSearchParams()
  const router = useRouter()
  const { balance, setBalance } = useBalance()
  const [pending, setPending] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
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

  const categories = [
    { href: "/games", label: "Games", active: path === "/games" },
    { href: "/?sport=football", label: "Football", active: path === "/" && search.get("sport") === "football" && search.get("live") !== "1" },
    { href: "/?live=1", label: "Live", active: path === "/" && search.get("live") === "1" },
  ]

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#111827] text-white"
                aria-label="Open admin menu"
              >
                <MenuIcon />
              </button>
            )}
            <div className="min-w-0">
              <Link href="/" className="block text-lg font-bold tracking-tight text-[var(--text)]">
                SkySteaks
              </Link>
              <p className="truncate text-xs text-[var(--muted)]">
                {signedIn ? `Welcome back${username ? `, ${username}` : ""}!` : "Welcome back!"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bg-elevated)] text-[var(--muted)]"
              aria-label="Home sportsbook"
            >
              <SearchIcon />
            </Link>
            {signedIn ? (
              <Link
                href="/account"
                className="inline-flex items-center rounded-full bg-[var(--bg-elevated)] px-3 py-1.5 text-sm font-semibold text-[var(--text)]"
              >
                {balance == null ? "USD —" : usd(balance)}
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-[var(--sporty)] px-3.5 py-1.5 text-sm font-semibold text-[var(--sporty)]"
              >
                Log in
              </Link>
            )}
            {signedIn && (
              <button type="button" onClick={signOut} disabled={pending} className="text-xs text-[var(--muted)] disabled:opacity-50">
                Out
              </button>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-lg px-3 pb-3">
          <div className="scroll-thin flex gap-2 overflow-x-auto">
            {categories.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                  link.active ? "bg-[var(--sporty)] text-white shadow-[0_8px_18px_rgba(227,27,35,0.28)]" : "bg-[var(--bg-elevated)] text-[var(--text)]",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {isAdmin && <AdminDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} username={username} />}
    </>
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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}
