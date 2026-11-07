"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PlaneIcon } from "@/components/ui/plane-icon"
import { cn } from "@/lib/cn"

const items = [
  { href: "/", label: "Home", id: "home" },
  { href: "/sports", label: "Sports", id: "sports" },
  { href: "/games", label: "Games", id: "games" },
  { href: "/account", label: "Bets", id: "bets" },
  { href: "/account", label: "Me", id: "me" },
] as const

function activeId(path: string) {
  if (path === "/") return "home"
  if (path.startsWith("/sports")) return "sports"
  if (path === "/games" || path === "/fairness") return "games"
  if (path.startsWith("/aviator")) return "games"
  if (path === "/account") return "bets"
  if (path === "/login" || path === "/signup") return "me"
  return ""
}

export function BottomNav() {
  const path = usePathname() ?? ""
  if (path.startsWith("/aviator")) return null

  const current = activeId(path)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0b0d10] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-[62px] max-w-lg grid-cols-5">
        {items.map((item) => {
          const active = current === item.id
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn("relative grid place-items-center gap-0.5 text-[10px]", active ? "text-white" : "text-[#8b93a7]")}
            >
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#e31b23]" />}
              <NavIcon id={item.id} active={active} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function NavIcon({ id, active }: { id: (typeof items)[number]["id"]; active: boolean }) {
  if (id === "home") {
    return (
      <span className={cn("grid h-6 w-6 place-items-center rounded-md text-[10px] font-black", active ? "bg-[#e31b23] text-white" : "bg-white/10")}>
        S
      </span>
    )
  }
  if (id === "sports") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
    )
  }
  if (id === "games") {
    return <PlaneIcon className={cn("h-5 w-5", active ? "text-[#e31b23]" : "")} />
  }
  if (id === "bets") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v8M9.2 10.4c.7-.9 5-.9 5.7 1.1s-3.8 3.1-4.8 2.2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.8-3.2 4-4.8 7-4.8S17.2 15.8 19 19" />
    </svg>
  )
}
