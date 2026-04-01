

"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Moon, Sun, LayoutDashboard, Settings, PlusCircle, Menu, X } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { PRODUCT_NAME } from "@/lib/config"
import { Separator } from "@/components/ui/separator"
import { Brand } from "./brand"


const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new", label: "New Project", icon: PlusCircle },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Nav() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { status } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (status === "loading") return null

  if (status !== "authenticated") {
    return (
      <nav className="border-b border-white/5 bg-background/60 backdrop-blur-2xl sticky top-0 z-50">
        <div className="flex h-16 items-center w-full px-4 md:px-8 max-w-7xl mx-auto">
          {/* Extreme Left */}

          <Link href="/" className="md:ml-6">
            GITWAY
          </Link>

          {/* Center Links (Desktop only) */}
          <div className="hidden md:flex flex-1 justify-center items-center gap-10">
            <Link href="#deploy" className="group relative text-[15px] font-medium text-zinc-400 hover:text-emerald-400 transition-colors py-1">
              Deploy
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-emerald-400 transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link href="#cicd" className="group relative text-[15px] font-medium text-zinc-400 hover:text-cyan-400 transition-colors py-1">
              CI/CD
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-cyan-400 transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link href="https://developers.wareality.tech" target="_blank" className="group relative text-[15px] font-medium text-zinc-400 hover:text-blue-400 transition-colors py-1">
              Docs
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-blue-400 transition-all duration-300 group-hover:w-full" />
            </Link>
          </div>

          <div className="flex-1 md:hidden" />

          {/* Extreme Right (Desktop only) */}
          <div className="hidden md:flex items-center gap-8 md:mr-2">
            <Link href="/login" className="group relative text-[15px] font-medium text-zinc-400 hover:text-white transition-colors py-1">
              Login
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white transition-all duration-300 group-hover:w-full" />
            </Link>
            <Button size="sm" onClick={() => router.push("/register")} className="rounded-full px-6 bg-white text-black hover:bg-zinc-200 font-semibold shadow-xl shadow-white/5 hover:-translate-y-0.5 transition-all">
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-background/95 backdrop-blur-xl absolute w-full left-0 shadow-2xl">
            <div className="px-6 py-8 flex flex-col gap-5">
              <Link href="#deploy" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-white/5 transition-colors">Deploy</Link>
              <Link href="#cicd" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-white/5 transition-colors">CI/CD</Link>
              <Link href="https://developers.wareality.tech" onClick={() => setMobileMenuOpen(false)} target="_blank" className="text-lg font-medium text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-white/5 transition-colors">Docs</Link>

              <Separator className="my-4 bg-white/10" />

              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-center text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-white/5 transition-colors">
                Login
              </Link>
              <Button size="lg" onClick={() => { setMobileMenuOpen(false); router.push("/register"); }} className="w-full mt-2 rounded-xl font-bold shadow-md bg-white text-black hover:bg-zinc-200 py-6 text-lg">
                Get Started
              </Button>
            </div>
          </div>
        )}
      </nav>
    )
  }

  return (
    <nav className="border-b bg-background/70 backdrop-blur-xl sticky top-0 z-50">
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