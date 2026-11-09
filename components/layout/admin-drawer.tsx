"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { cn } from "@/lib/cn"

const links = [
  { href: "/admin", label: "Control center", hint: "Crash foresight & ops" },
  { href: "/aviator", label: "Aviator table", hint: "Live crash game" },
  { href: "/", label: "Sportsbook", hint: "Home markets" },
  { href: "/?live=1", label: "Live sports", hint: "In-play matches" },
  { href: "/games", label: "Games lobby", hint: "Aviator entry" },
  { href: "/wallet", label: "Wallet", hint: "Deposit & withdraw" },
  { href: "/wallet/history", label: "Ledger", hint: "Deposit history" },
  { href: "/account", label: "My account", hint: "Profile & wallet" },
  { href: "/bets", label: "Bet history", hint: "Won & lost tickets" },
  { href: "/fairness", label: "Fairness", hint: "Seed verifier" },
] as const

export function AdminDrawer({
  open,
  onClose,
  username,
}: {
  open: boolean
  onClose: () => void
  username: string | null
}) {
  const path = usePathname() ?? ""

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-slate-900/45 transition",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[110] flex w-[min(86vw,320px)] flex-col bg-white shadow-[12px_0_40px_rgba(15,23,42,0.18)] transition duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="border-b border-[var(--line)] bg-[linear-gradient(135deg,#111827,#1f2937)] px-4 pb-5 pt-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-white/70">ADMIN MENU</p>
              <p className="mt-1 text-lg font-bold">{username ?? "Admin"}</p>
              <p className="mt-0.5 text-xs text-white/65">Full control access</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xl leading-none"
              aria-label="Close admin menu"
            >
              ×
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {links.map((link) => {
            const active =
              link.href === "/admin"
                ? path.startsWith("/admin")
                : link.href === "/"
                  ? path === "/"
                  : path === link.href || path.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  "mb-1 flex items-center justify-between rounded-2xl px-3 py-3 transition",
                  active ? "bg-[#ffe8ea] text-[var(--sporty)]" : "text-[var(--text)] hover:bg-[var(--bg-elevated)]",
                )}
              >
                <span>
                  <span className="block text-sm font-semibold">{link.label}</span>
                  <span className={cn("block text-xs", active ? "text-[var(--sporty)]/80" : "text-[var(--muted)]")}>{link.hint}</span>
                </span>
                <span className="text-lg text-[var(--muted)]">›</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[var(--line)] p-3">
          <Link
            href="/admin"
            onClick={onClose}
            className="grid h-12 place-items-center rounded-2xl bg-[var(--sporty)] text-sm font-bold text-white shadow-[0_8px_18px_rgba(227,27,35,0.28)]"
          >
            Open control center
          </Link>
        </div>
      </aside>
    </>
  )
}
