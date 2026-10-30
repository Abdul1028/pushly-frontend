"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronLeft, ExternalLink, Globe, KeyRound, LayoutGrid, Layers, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { PRODUCT_DOMAIN } from "@/lib/config";
import { ProjectProvider, projectUrls, useProject } from "@/components/project/project-context";
import { StatusDot } from "@/components/project/ui";

// Project workspace: one place for everything about a project, split into sections
// in a sidebar (like Vercel's project view), in the pushly-ui light appearance.

const SECTIONS = [
  { href: "", label: "Overview", Icon: LayoutGrid },
  { href: "/deployments", label: "Deployments", Icon: Layers },
  { href: "/env", label: "Environment Variables", Icon: KeyRound },
  { href: "/domain", label: "Domains", Icon: Globe },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function Sidebar({ id }: { id: string }) {
  const pathname = usePathname();
  const { project, production } = useProject();
  const base = `/project/${id}`;
  const { primary } = projectUrls(project, PRODUCT_DOMAIN);
  const isActive = (href: string) => (href === "" ? pathname === base : pathname?.startsWith(base + href));

  return (
    <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
      <Link href="/dashboard" className="inline-flex items-center gap-1 h-8 -ml-1 pr-2 text-[13px] text-label-2 hover:text-label transition-colors">
        <ChevronLeft className="size-4" aria-hidden />
        All projects
      </Link>

      {/* Identity */}
      <div className="mt-3 flex items-center gap-3 min-w-0">
        <span className="size-10 shrink-0 rounded-xl bg-white border border-black/[0.06] grid place-items-center text-[15px] font-semibold text-label uppercase">
          {project?.name?.[0] ?? "·"}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-[-0.022em] text-label truncate">
            {project?.name ?? <span className="inline-block h-4 w-28 rounded bg-fill-2 animate-pulse align-middle" />}
          </p>
          {primary ? (
            <a href={`https://${primary}`} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 text-[12px] text-label-3 hover:text-link truncate max-w-full">
              <span className="truncate">{primary}</span>
              <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
            </a>
          ) : (
            <span className="block h-3 w-24 mt-1 rounded bg-fill-2" />
          )}
        </div>
      </div>
      {production && <StatusDot status={production.status} className="mt-3 text-[12px]" />}

      {/* Sections: vertical on desktop, a scrollable row on small screens */}
      <nav
        aria-label="Project sections"
        className="mt-5 -mx-4 px-4 lg:mx-0 lg:px-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={label}
              href={`${base}${href}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2.5 h-9 px-3 rounded-lg text-[14px] whitespace-nowrap transition-colors shrink-0",
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
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 lg:py-10 grid gap-6 lg:gap-10 lg:grid-cols-[232px_minmax(0,1fr)]">
          <Sidebar id={id} />
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
