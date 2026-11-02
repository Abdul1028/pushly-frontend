"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronLeft, ExternalLink, Github, Globe, KeyRound, LayoutGrid, Layers, Menu, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { PRODUCT_DOMAIN } from "@/lib/config";
import { ProjectProvider, projectUrls, useProject } from "@/components/project/project-context";
import { btn, repoInfo, StatusDot } from "@/components/project/ui";

// Project workspace: one place for everything about a project, split into sections
// in a sidebar (like Vercel's project view), in the pushly-ui light appearance.
// On phones and tablets the sidebar becomes a floating menu pill and a bottom sheet.

const SECTIONS = [
  { href: "", label: "Overview", Icon: LayoutGrid },
  { href: "/deployments", label: "Deployments", Icon: Layers },
  { href: "/env", label: "Environment Variables", Icon: KeyRound },
  { href: "/domain", label: "Domains", Icon: Globe },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function useSections(id: string) {
  const pathname = usePathname();
  const base = `/project/${id}`;
  const isActive = (href: string) => (href === "" ? pathname === base : !!pathname?.startsWith(base + href));
  const current = SECTIONS.find((s) => isActive(s.href)) ?? SECTIONS[0];
  return { base, isActive, current };
}

/** Project name, live URL and GitHub repository */
function Identity({ compact = false }: { compact?: boolean }) {
  const { project, production } = useProject();
  const { primary } = projectUrls(project, PRODUCT_DOMAIN);
  const repo = repoInfo(project?.gitURL);

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn("shrink-0 rounded-xl bg-white border border-black/[0.06] grid place-items-center font-semibold text-label uppercase", compact ? "size-9 text-[14px]" : "size-10 text-[15px]")}>
          {project?.name?.[0] ?? "·"}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-[-0.022em] text-label truncate">
            {project?.name ?? <span className="inline-block h-4 w-28 rounded bg-fill-2 animate-pulse align-middle" />}
          </p>
          {primary ? (
            <a href={`https://${primary}`} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 text-[12px] text-label-3 hover:text-link max-w-full">
              <span className="truncate">{primary}</span>
              <ExternalLink className="size-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden />
            </a>
          ) : (
            <span className="block h-3 w-24 mt-1 rounded bg-fill-2" />
          )}
        </div>
      </div>
      {!compact && (
        <div className="mt-3 space-y-1.5">
          {production && <StatusDot status={production.status} className="text-[12px]" />}
          {repo &&
            (repo.href ? (
              <a href={repo.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] text-label-2 hover:text-link min-w-0" title="Open repository on GitHub">
                <Github className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{repo.label}</span>
              </a>
            ) : (
              <p className="flex items-center gap-1.5 text-[12px] text-label-2 min-w-0">
                <Github className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{repo.label}</span>
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

/* ── Desktop: sticky sidebar ── */

function Sidebar({ id }: { id: string }) {
  const { base, isActive } = useSections(id);
  return (
    <aside className="hidden lg:block lg:sticky lg:top-[4.5rem] lg:self-start">
      <Link href="/dashboard" className="inline-flex items-center gap-1 h-8 -ml-1 pr-2 text-[13px] text-label-2 hover:text-label transition-colors">
        <ChevronLeft className="size-4" aria-hidden />
        All projects
      </Link>
      <div className="mt-3">
        <Identity />
      </div>
      <nav aria-label="Project sections" className="mt-5 flex flex-col gap-1">
        {SECTIONS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={label}
              href={`${base}${href}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2.5 h-9 px-3 rounded-lg text-[14px] whitespace-nowrap transition-colors",
                active ? "text-label font-medium" : "text-label-2 hover:text-label hover:bg-black/[0.04]"
              )}
            >
              {/* The selection pill slides between items */}
              {active && (
                <motion.span
                  layoutId="project-section"
                  className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-black/[0.04]"
                  transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                />
              )}
              <Icon className="relative size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/* ── Phones and tablets: header, floating menu pill, bottom sheet ── */

function MobileNav({ id }: { id: string }) {
  const { base, isActive, current } = useSections(id);
  const { project } = useProject();
  const repo = repoInfo(project?.gitURL);
  const { primary } = projectUrls(project, PRODUCT_DOMAIN);
  const [open, setOpen] = useState(false);

  // Escape closes the sheet
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Swipe down far enough, or flick, to dismiss; otherwise it springs back
  const onDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 500) setOpen(false);
  };

  const CurrentIcon = current.Icon;

  return (
    <div className="lg:hidden">
      {/* Compact header */}
      <Link href="/dashboard" className="inline-flex items-center gap-1 h-8 -ml-1 pr-2 text-[13px] text-label-2">
        <ChevronLeft className="size-4" aria-hidden />
        All projects
      </Link>
      <div className="mt-2 flex items-center justify-between gap-3">
        <Identity compact />
        {repo?.href && (
          <a href={repo.href} target="_blank" rel="noopener noreferrer" className={cn(btn.secondary, "h-9 px-3 shrink-0")} aria-label={`Open ${repo.label} on GitHub`}>
            <Github className="size-4" aria-hidden />
            <span className="hidden sm:inline max-w-[180px] truncate">{repo.label}</span>
          </a>
        )}
      </div>

      {/* Floating menu pill */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed z-40 left-1/2 -translate-x-1/2 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex items-center gap-3 h-12 pl-4 pr-1.5 rounded-full bg-label/90 text-white backdrop-blur-xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)] active:scale-[0.97] motion-reduce:active:scale-100 transition-transform"
      >
        <CurrentIcon className="size-4" strokeWidth={1.75} aria-hidden />
        <span className="text-[14px] font-medium max-w-[50vw] truncate">{current.label}</span>
        <span className="h-6 w-px bg-white/20" aria-hidden />
        <span className="size-9 rounded-full grid place-items-center">
          <Menu className="size-5" aria-hidden />
        </span>
        <span className="sr-only">Open project menu</span>
      </button>

      {/* Bottom sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              aria-hidden
              className="fixed inset-0 z-50 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Project menu"
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.35)] pb-[calc(1rem+env(safe-area-inset-bottom))] touch-pan-x"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.9 }}
              onDragEnd={onDragEnd}
            >
              <div aria-hidden className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-black/15" />
              <div className="px-5 pt-4 flex items-start justify-between gap-3">
                <Identity />
                <button type="button" onClick={() => setOpen(false)} className={cn(btn.icon, "size-11 -mr-2 -mt-1 shrink-0")} aria-label="Close menu">
                  <X className="size-5" />
                </button>
              </div>

              <nav aria-label="Project sections" className="mt-4 px-3">
                {SECTIONS.map(({ href, label, Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={label}
                      href={`${base}${href}`}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 h-12 px-3 rounded-xl text-[17px] transition-colors",
                        active ? "bg-fill text-label font-medium" : "text-label hover:bg-fill"
                      )}
                    >
                      <Icon className="size-5 text-label-2" strokeWidth={1.75} aria-hidden />
                      {label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-3 mx-5 pt-3 border-t border-black/[0.06] flex flex-wrap gap-2">
                {primary && (
                  <a href={`https://${primary}`} target="_blank" rel="noopener noreferrer" className={cn(btn.primary, "flex-1 min-w-[140px]")}>
                    Visit site
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
                {repo?.href && (
                  <a href={repo.href} target="_blank" rel="noopener noreferrer" className={cn(btn.secondary, "flex-1 min-w-[140px]")}>
                    <Github className="size-4" aria-hidden />
                    GitHub
                  </a>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  return (
    <ProjectProvider id={id}>
      <div className="appearance-light bg-fill text-label min-h-[calc(100svh-3rem)]">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-4 sm:pt-6 lg:pt-10 pb-28 lg:pb-10 grid gap-5 lg:gap-10 lg:grid-cols-[232px_minmax(0,1fr)]">
          <Sidebar id={id} />
          <MobileNav id={id} />
          {/* Each section fades in as you switch to it */}
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="min-w-0"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </ProjectProvider>
  );
}
