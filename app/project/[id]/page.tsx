"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { ArrowUp, ChevronRight, ExternalLink, GitBranch, GitCommitHorizontal, Lock, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PRODUCT_DOMAIN } from "@/lib/config";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { projectUrls, useProject, type Deployment } from "@/components/project/project-context";
import { DeploymentRow } from "@/components/project/deployment-row";
import { NewDeploymentButton } from "@/components/project/new-deployment";
import { btn, ConfirmDialog, errorMessage, formatDate, formatRelative, PageHeader, Panel, StatusDot } from "@/components/project/ui";

const isLive = (s?: string) => ["RUNNING", "SUCCESS"].includes((s ?? "").toUpperCase());

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-label-3">{label}</p>
      <div className="mt-1 text-[14px] text-label min-w-0">{children}</div>
    </div>
  );
}

/** Live, scaled-down view of the site in a Safari-style frame */
function SitePreview({ url }: { url?: string }) {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white overflow-hidden shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)]">
      <div className="relative flex items-center h-7 px-3 bg-[#f6f6f6] border-b border-black/[0.06]">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2 rounded-full bg-[#ff5f57]" />
          <span className="size-2 rounded-full bg-[#febc2e]" />
          <span className="size-2 rounded-full bg-[#28c840]" />
        </div>
        {url && (
          <span className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] text-label-3 truncate max-w-[70%]">
            <Lock className="size-2.5" aria-hidden />
            {url}
          </span>
        )}
      </div>
      <div className="relative aspect-[16/10] bg-fill overflow-hidden">
        {url ? (
          // Rendered at desktop size, then scaled down, so the site lays out as it would for a visitor
          <iframe
            src={`https://${url}`}
            title="Live preview"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
            tabIndex={-1}
            className="absolute left-0 top-0 w-[400%] h-[400%] origin-top-left scale-25 pointer-events-none border-0 bg-white"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[13px] text-label-3">No production deployment yet</div>
        )}
      </div>
    </div>
  );
}

function ProductionPanel() {
  const { project, production, sorted, rollback } = useProject();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const urls = projectUrls(project, PRODUCT_DOMAIN);

  // Instant rollback goes to the previous good production build
  const previous: Deployment | undefined = sorted.find(
    (d) => d.environment === "PRODUCTION" && d.id !== production?.id && isLive(d.status)
  );

  const doRollback = async () => {
    if (!previous) return;
    setBusy(true);
    try {
      await rollback(previous.id);
      toast({ title: "Production rolled back", description: `Now serving deployment #${previous.id}.` });
      setConfirm(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Rollback failed", description: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const commit = production?.gitCommitHash && production.gitCommitHash !== "pending" ? production.gitCommitHash.slice(0, 7) : null;

  return (
    <Panel
      title="Production deployment"
      action={
        <div className="flex items-center gap-2">
          {previous && production && (
            <button type="button" className={btn.secondary} onClick={() => setConfirm(true)}>
              <RotateCcw className="size-4" aria-hidden />
              <span className="hidden sm:inline">Instant rollback</span>
            </button>
          )}
          {urls.primary && (
            <a href={`https://${urls.primary}`} target="_blank" rel="noopener noreferrer" className={btn.primary}>
              Visit
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
      }
      footer={
        <p className="text-[13px] text-label-2">
          Production builds from <span className="font-mono text-label">{project?.gitBranch ?? "main"}</span>. Promote a staging build or start a new deployment to update it.
        </p>
      }
    >
      <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 md:gap-8 items-start">
        <SitePreview url={production ? urls.primary : undefined} />

        {production ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div className="col-span-2">
              <Detail label="Deployment">
                {production.deployedUrl ? (
                  <a href={production.deployedUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline break-all">
                    {production.deployedUrl.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <span>#{production.id}</span>
                )}
              </Detail>
            </div>
            <div className="col-span-2">
              <Detail label="Domains">
                <div className="space-y-1">
                  {urls.custom && <p className="truncate">{urls.custom}</p>}
                  {urls.subdomain && <p className="truncate text-label-2">{urls.subdomain}</p>}
                </div>
              </Detail>
            </div>
            <Detail label="Status">
              <StatusDot status={production.status} className="text-[14px] text-label" />
            </Detail>
            <Detail label="Created">
              <span title={formatDate(production.deployedAt ?? production.createdAt)}>{formatRelative(production.deployedAt ?? production.createdAt)}</span>
            </Detail>
            <div className="col-span-2">
              <Detail label="Source">
                <p className="flex items-center gap-1.5 font-mono text-[13px]">
                  <GitBranch className="size-3.5 text-label-3" aria-hidden />
                  {production.gitBranch ?? "—"}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] min-w-0">
                  <GitCommitHorizontal className="size-3.5 text-label-3 shrink-0" aria-hidden />
                  {commit && <span className="font-mono">{commit}</span>}
                  <span className="truncate text-label-2">{production.gitCommitMessage}</span>
                </p>
              </Detail>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-[17px] font-semibold tracking-[-0.022em]">Nothing live yet.</p>
            <p className="mt-1 text-[15px] text-label-2">Deploy to Production, or promote a staging build when it looks right.</p>
            <div className="mt-5">
              <NewDeploymentButton />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={(o) => !busy && setConfirm(o)}
        title="Roll back Production?"
        description={
          previous
            ? `Production will go back to deployment #${previous.id}${previous.gitCommitMessage ? ` — “${previous.gitCommitMessage}”` : ""}.`
            : ""
        }
        confirmLabel="Roll back"
        busy={busy}
        onConfirm={doRollback}
      />
    </Panel>
  );
}

function StagingPanel() {
  const { staging, promote } = useProject();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const doPromote = async () => {
    if (!staging) return;
    setBusy(true);
    try {
      await promote(staging.id);
      toast({ title: "Promoted to Production" });
      setConfirm(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Promotion failed", description: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Staging"
      description="Check changes here before they reach Production."
      action={
        staging && isLive(staging.status) ? (
          <button type="button" className={btn.secondary} onClick={() => setConfirm(true)}>
            <ArrowUp className="size-4" aria-hidden />
            Promote
          </button>
        ) : undefined
      }
    >
      {staging ? (
        <div className="space-y-3">
          <StatusDot status={staging.status} className="text-[14px] text-label" />
          <p className="text-[14px] text-label truncate">{staging.gitCommitMessage || `Deployment #${staging.id}`}</p>
          <p className="flex items-center gap-1.5 text-[12px] text-label-3">
            <GitBranch className="size-3" aria-hidden /> {staging.gitBranch} · {formatRelative(staging.deployedAt ?? staging.createdAt)}
          </p>
          {staging.deployedUrl && (
            <a href={staging.deployedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] text-link hover:underline">
              Open staging <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>
      ) : (
        <p className="text-[14px] text-label-2">No staging deployment is live.</p>
      )}

      <ConfirmDialog
        open={confirm}
        onOpenChange={(o) => !busy && setConfirm(o)}
        title="Promote to Production?"
        description="This staging build will replace what’s live on Production."
        confirmLabel="Promote"
        busy={busy}
        onConfirm={doPromote}
      />
    </Panel>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="h-8 w-56 rounded-lg bg-fill-2 animate-pulse" />
      <div className="h-[340px] rounded-2xl bg-white border border-black/[0.06]" />
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-5">
        <div className="h-40 rounded-2xl bg-white border border-black/[0.06]" />
        <div className="h-40 rounded-2xl bg-white border border-black/[0.06]" />
      </div>
    </div>
  );
}

export default function ProjectOverviewPage() {
  const { project, projectError, deployments, sorted, id } = useProject();
  const loading = !project && !projectError;
  const showSkeleton = useDelayedFlag(loading);

  if (projectError) {
    return (
      <Panel title="We couldn’t load this project.">
        <p className="text-[15px] text-label-2">It may have been deleted, or you may not have access to it.</p>
        <Link href="/dashboard" className="btn-link mt-2">
          Back to projects <ChevronRight className="size-4" aria-hidden />
        </Link>
      </Panel>
    );
  }
  if (loading) return showSkeleton ? <OverviewSkeleton /> : null;

  const recent = sorted.slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader title={project!.name} subtitle={project!.description || "Overview"} actions={<NewDeploymentButton />} />

      <ProductionPanel />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-5 items-start">
        <StagingPanel />

        <Panel
          title="Recent deployments"
          action={
            <Link href={`/project/${id}/deployments`} className="inline-flex items-center gap-0.5 text-[13px] text-link hover:underline">
              View all <ChevronRight className="size-3.5" aria-hidden />
            </Link>
          }
          bodyClassName="p-0 md:p-0 pt-3 md:pt-3"
        >
          {!deployments ? (
            <div className="px-6 pb-6 text-[14px] text-label-3">Loading…</div>
          ) : recent.length === 0 ? (
            <div className="px-6 pb-6 text-[14px] text-label-2">No deployments yet.</div>
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              <AnimatePresence initial={false}>
                {recent.map((d) => (
                  <DeploymentRow key={d.id} d={d} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
