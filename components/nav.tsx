

"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, type PanInfo } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Moon, Sun, LayoutDashboard, Settings, PlusCircle, Menu, X } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { PRODUCT_NAME } from "@/lib/config"
import { Separator } from "@/components/ui/separator"
import { Brand } from "./brand"
import { Skeleton } from "@/components/ui/skeleton"
import { useDelayedFlag } from "@/hooks/useDelayedFlag"
import { GrowLink } from "@/components/page-morph"


const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new", label: "New Project", icon: PlusCircle },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Nav() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { status } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const showSkeleton = useDelayedFlag(status === "loading")

  // Escape closes the mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileMenuOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mobileMenuOpen])

  // The sheet drops from the nav, so dismissing means throwing it back up:
  // far enough, or a quick upward flick, closes it; anything else springs back.
  const onSheetDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y < -80 || info.velocity.y < -500) setMobileMenuOpen(false)
  }

  if (status === "loading") {
    // Same bar as the resolved state so the page doesn't jump when auth settles
    const publicPage = pathname === "/" || pathname === "/login" || pathname === "/register"
      || pathname?.startsWith("/dashboard") || pathname?.startsWith("/project")
    return (
      <nav aria-busy="true" className={cn(
        "sticky top-0 z-50 pt-[env(safe-area-inset-top)]",
        publicPage ? "material-light border-b border-black/10" : "border-b bg-background/70 backdrop-blur-xl"
      )}>
        <div className={cn("flex items-center w-full px-4 md:px-6 max-w-[1024px] mx-auto", publicPage ? "h-12" : "h-14")}>
          {showSkeleton && (
            <>
              <Skeleton className="h-4 w-16" />
              <div className="flex-1" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </>
          )}
        </div>
      </nav>
    )
  }

  if (status !== "authenticated") {
    const publicLinks = [
      { href: "/#highlights", label: "Overview" },
      { href: "/#features", label: "Features" },
      { href: "/#workflow", label: "Workflow" },
      { href: "https://developers.wareality.tech", label: "Docs", external: true },
    ]

    // Public pages (landing, sign in, sign up) are light like apple.com
    const light = pathname === "/" || pathname === "/login" || pathname === "/register"
    const t = light
      ? {
          // Over the dark chapter (html[data-nav=dark]) the bar turns into dark material
          bar: "material-light border-b border-black/10 transition-colors duration-500 [html[data-nav=dark]_&]:bg-[rgb(22_22_23/0.8)] [html[data-nav=dark]_&]:border-white/10",
          logo: "text-label transition-colors duration-500 [html[data-nav=dark]_&]:text-ink",
          link: "text-label/80 hover:text-label [html[data-nav=dark]_&]:text-ink/80 [html[data-nav=dark]_&]:hover:text-ink",
          toggle: "text-label/80 hover:text-label [html[data-nav=dark]_&]:text-ink/80 [html[data-nav=dark]_&]:hover:text-ink",
          scrim: "bg-black/20",
          sheet: "bg-white/95 shadow-black/10",
          sheetLink: "text-label hover:text-label-2",
          separator: "bg-separator",
          signIn: "btn-link",
          grabber: "bg-black/15",
        }
      : {
          bar: "material-chrome border-b border-hairline",
          logo: "text-ink",
          link: "text-ink/80 hover:text-ink",
          toggle: "text-ink/80 hover:text-ink",
          scrim: "bg-black/50",
          sheet: "bg-surface/95 shadow-black/60",
          sheetLink: "text-ink/90 hover:text-ink",
          separator: "bg-hairline",
          signIn: "btn-apple-link",
          grabber: "bg-white/25",
        }

    return (
      <nav className={cn(t.bar, "sticky top-0 z-50 pt-[env(safe-area-inset-top)]")}>
        <div className="flex h-12 items-center w-full px-4 md:px-6 max-w-[1024px] mx-auto">
          <Link href="/" className={cn("text-[19px] font-semibold tracking-[-0.035em]", t.logo)}>
            {PRODUCT_NAME}
          </Link>

          {/* Center links (desktop) */}
          <div className="hidden md:flex flex-1 justify-center items-center gap-8">
            {publicLinks.map(link => (
              <Link
                key={link.label}
                href={link.href}
                {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn("text-xs transition-colors", t.link)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex-1 md:hidden" />

          {/* Right (desktop) */}
          <div className="hidden md:flex items-center gap-5">
            <Link href="/login" className={cn("text-xs transition-colors", t.link)}>
              Sign in
            </Link>
            <GrowLink
              href="/register"
              className="inline-flex items-center h-7 px-3 rounded-full bg-apple-blue hover:bg-apple-blue-hover text-white text-xs transition-colors active:scale-[0.97] motion-reduce:active:scale-100"
            >
              Get started
            </GrowLink>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-menu"
              className={cn("size-11 -mr-2.5 hover:bg-transparent", t.toggle)}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              <span className="sr-only">{mobileMenuOpen ? "Close menu" : "Open menu"}</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu — a sheet that drops from the nav and can be swiped back up */}
        {/* Clip layer starts at the nav's bottom edge, so the sheet slides out from under the bar */}
        {/* Once closed, nothing in here takes taps — even while the exit animation finishes */}
        <div className={cn(
          "md:hidden absolute left-0 top-full w-full h-[100dvh] overflow-hidden pointer-events-none",
          !mobileMenuOpen && "[&_*]:pointer-events-none!"
        )}>
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                key="scrim"
                aria-hidden
                onClick={() => setMobileMenuOpen(false)}
                className={cn("absolute inset-0 pointer-events-auto", t.scrim)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                key="sheet"
                id="public-mobile-menu"
                className={cn("backdrop-blur-2xl absolute w-full left-0 top-0 rounded-b-2xl shadow-2xl touch-pan-x pointer-events-auto", t.sheet)}
                initial={{ y: "-100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-100%" }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.9, bottom: 0.08 }}
                onDragEnd={onSheetDragEnd}
              >
            <div className="px-8 pt-6 pb-5 flex flex-col">
              {publicLinks.map(link => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={cn("py-2 text-[28px] font-semibold tracking-[-0.015em] transition-colors", t.sheetLink)}
                >
                  {link.label}
                </Link>
              ))}

              <Separator className={cn("my-5", t.separator)} />

              <div className="flex items-center justify-between gap-4">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className={t.signIn}>
                  Sign in
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="btn-apple">
                  Get started
                </Link>
              </div>
            </div>
            {/* Grabber: hints that the sheet can be swiped up */}
            <div aria-hidden className={cn("mx-auto mb-3 h-1 w-9 rounded-full", t.grabber)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
        </div>
      </nav>
    )
  }

  // Redesigned app pages (pushly-ui light appearance) get the light bar; the rest keep the old one for now
  const appLight = pathname?.startsWith("/dashboard") || pathname?.startsWith("/project")
  if (appLight) {
    return (
      <nav className="material-light border-b border-black/10 sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="flex h-12 items-center gap-4 sm:gap-6 w-full max-w-[1200px] mx-auto px-4 sm:px-6">
          <Link href="/dashboard" className="text-[17px] font-semibold tracking-[-0.035em] text-label shrink-0">
            {PRODUCT_NAME}
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map(item => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                || (item.href === "/dashboard" && pathname?.startsWith("/project"))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center h-8 px-3 rounded-full text-[13px] whitespace-nowrap transition-colors",
                    isActive ? "bg-black/[0.06] text-label font-medium" : "text-label-2 hover:text-label"
                  )}
                >
                  {item.label === "Dashboard" ? "Projects" : item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="border-b bg-background/70 backdrop-blur-xl sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center w-full px-4 md:px-6">
        <Link href="/dashboard" className="md:ml-6">
          <Brand incomingText={PRODUCT_NAME} />
        </Link>

        <div className="flex-1" />

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4 mr-6">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              pathname?.startsWith(item.href + "/")

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 relative rounded-full border hover:bg-accent transition"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
            <Moon className="h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 relative rounded-full border hover:bg-accent transition"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
            <Moon className="h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="px-4 py-4 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive =
                pathname === item.href ||
                pathname?.startsWith(item.href + "/")

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}