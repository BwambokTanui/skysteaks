import type { Metadata, Viewport } from "next"
import { JetBrains_Mono, Outfit } from "next/font/google"
import { Providers } from "@/components/layout/providers"
import { getSessionContext } from "@/lib/auth"
import "./globals.css"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })

export const metadata: Metadata = {
  title: { default: "SkySteaks", template: "%s · SkySteaks" },
  description: "SkySteaks sportsbook and Aviator with shared play credits, live matches, and provably fair crash rounds.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#e31b23",
}

export const dynamic = "force-dynamic"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext()
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${mono.variable} flex min-h-dvh flex-col bg-[var(--bg)] font-sans text-[var(--text)] antialiased`}>
        <Providers
          configured={session.configured}
          email={session.user?.email ?? null}
          username={session.profile?.username ?? null}
          balance={session.profile?.balance ?? null}
        >
          {children}
        </Providers>
      </body>
    </html>
  )
}
