import Link from "next/link";
import { PRODUCT_NAME, STATUS_PAGE_URL } from "@/lib/config";
import { SystemStatus } from "@/components/system-status";

const DOCS_URL = "https://developers.wareality.tech";

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/#highlights" },
      { label: "Features", href: "/#features" },
      { label: "Workflow", href: "/#workflow" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: DOCS_URL, external: true },
      { label: "CI/CD pipeline builder", href: DOCS_URL, external: true },
      { label: "System status", href: STATUS_PAGE_URL, external: true },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create an account", href: "/register" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-fill text-[12px] leading-[1.33] text-label-2">
      <div className="mx-auto max-w-[980px] px-4 sm:px-6 pt-10 pb-6">
        <p className="pb-6 border-b border-separator">
          {PRODUCT_NAME} builds and hosts web applications from Git repositories. Edge delivery is
          provided through Cloudflare.
        </p>

        <nav aria-label="Footer" className="grid grid-cols-2 sm:grid-cols-3 gap-8 py-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-semibold text-label mb-2.5">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-label">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="hover:underline hover:text-label">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-separator">
          <p>Copyright © {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved.</p>
          <SystemStatus />
        </div>
      </div>
    </footer>
  );
}
