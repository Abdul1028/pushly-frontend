"use client";

import { useState } from "react";
import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { motion } from "motion/react";
import { ArrowUp, ExternalLink, GitBranch, GitCommitHorizontal, MoreHorizontal, Play, RotateCcw, ScrollText, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useProject, type Deployment } from "./project-context";
import { btn, ConfirmDialog, EnvPill, errorMessage, formatDate, formatRelative, isInProgress, StatusDot } from "./ui";

type Action = "deploy" | "promote" | "rollback" | "delete";

const isLive = (s?: string) => ["RUNNING", "SUCCESS"].includes((s ?? "").toUpperCase());

const itemClass =
  "flex items-center gap-2.5 h-9 px-3 rounded-lg text-[14px] text-label outline-none cursor-default select-none data-[highlighted]:bg-black/[0.05] data-[disabled]:opacity-40";

// One deployment: status, environment, source and time, with the actions that apply to it.
export function DeploymentRow({ d }: { d: Deployment }) {
  const { id, active, deployExisting, promote, rollback, remove } = useProject();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);

  const isCurrent = active?.PRODUCTION === d.id || active?.STAGING === d.id;
  const env = d.environment ?? "";
  const commit = d.gitCommitHash && d.gitCommitHash !== "pending" ? d.gitCommitHash.slice(0, 7) : null;

  // What this deployment can do, mirroring the old project page's rules
  const can = {
    deploy: !isLive(d.status) && !isInProgress(d.status),
    promote: env === "STAGING" && isLive(d.status),
    rollback: env === "PRODUCTION" && !isCurrent && isLive(d.status),
    delete: !isCurrent,
  };

  const run = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm === "deploy") await deployExisting(d.id, env || "STAGING");
      if (confirm === "promote") await promote(d.id);
      if (confirm === "rollback") await rollback(d.id);
      if (confirm === "delete") await remove(d.id);
      toast({
        title: { deploy: "Deployment started", promote: "Promoted to Production", rollback: "Production rolled back", delete: "Deployment deleted" }[confirm],
      });
      setConfirm(null);
    } catch (e) {
      toast({ variant: "destructive", title: "That didn’t work", description: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const copy: Record<Action, { title: string; body: string; cta: string; danger?: boolean }> = {
    deploy: { title: "Deploy this build?", body: `Starts deployment #${d.id} on ${env === "PRODUCTION" ? "Production" : "Staging"}.`, cta: "Deploy" },
    promote: { title: "Promote to Production?", body: `${d.gitBranch ?? "This build"}${commit ? ` · ${commit}` : ""} will replace what’s live on Production.`, cta: "Promote" },
    rollback: { title: "Roll back Production?", body: `Production will serve deployment #${d.id}${commit ? ` (${commit})` : ""} again.`, cta: "Roll back" },
    delete: { title: "Delete this deployment?", body: `Deployment #${d.id} and its build will be removed. This can’t be undone.`, cta: "Delete", danger: true },
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.35 }}
      className="flex items-center gap-4 px-5 md:px-6 py-4"
    >
      <div className="w-24 shrink-0">
        <StatusDot status={d.status} />
        <p className="mt-1 text-[12px] text-label-3 tabular-nums" title={formatDate(d.deployedAt ?? d.createdAt)}>
          {formatRelative(d.deployedAt ?? d.createdAt)}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <EnvPill environment={env} />
          {isCurrent && (
            <span className="inline-flex items-center h-5 px-2 rounded-md text-[11px] font-medium bg-sys-green/12 text-[#248a3d]">Current</span>
          )}
          {d.lastAction === "PROMOTED" && <span className="text-[12px] text-label-3">Promoted</span>}
          {d.lastAction === "ROLLBACKED" && <span className="text-[12px] text-label-3">Rolled back</span>}
        </div>
        <p className="mt-1.5 text-[14px] text-label truncate">{d.gitCommitMessage || `Deployment #${d.id}`}</p>
        <p className="mt-0.5 flex items-center gap-3 text-[12px] text-label-3">
          <span className="inline-flex items-center gap-1">
            <GitBranch className="size-3" aria-hidden />
            {d.gitBranch ?? "—"}
          </span>
          {commit && (
            <span className="inline-flex items-center gap-1 font-mono">
              <GitCommitHorizontal className="size-3" aria-hidden />
              {commit}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Link href={`/logs?projectId=${id}&deploymentId=${d.id}`} className={cn(btn.quiet, "hidden sm:inline-flex px-3")}>
          <ScrollText className="size-4" aria-hidden />
          Logs
        </Link>
        <Menu.Root>
          <Menu.Trigger className={btn.icon} aria-label={`Actions for deployment ${d.id}`}>
            <MoreHorizontal className="size-4" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[210px] rounded-xl bg-white/95 backdrop-blur-xl p-1.5 border border-black/[0.08] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.3)] text-label"
            >
              <Menu.Item asChild className={itemClass}>
                <Link href={`/logs?projectId=${id}&deploymentId=${d.id}`}>
                  <ScrollText className="size-4 text-label-2" /> View logs
                </Link>
              </Menu.Item>
              {d.deployedUrl && (
                <Menu.Item asChild className={itemClass}>
                  <a href={d.deployedUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4 text-label-2" /> Visit
                  </a>
                </Menu.Item>
              )}
              {(can.deploy || can.promote || can.rollback) && <Menu.Separator className="my-1 h-px bg-black/[0.06]" />}
              {can.deploy && (
                <Menu.Item className={itemClass} onSelect={() => setConfirm("deploy")}>
                  <Play className="size-4 text-label-2" /> Deploy
                </Menu.Item>
              )}
              {can.promote && (
                <Menu.Item className={itemClass} onSelect={() => setConfirm("promote")}>
                  <ArrowUp className="size-4 text-label-2" /> Promote to Production
                </Menu.Item>
              )}
              {can.rollback && (
                <Menu.Item className={itemClass} onSelect={() => setConfirm("rollback")}>
                  <RotateCcw className="size-4 text-label-2" /> Roll back to this
                </Menu.Item>
              )}
              <Menu.Separator className="my-1 h-px bg-black/[0.06]" />
              <Menu.Item className={cn(itemClass, "text-sys-red")} disabled={!can.delete} onSelect={() => setConfirm("delete")}>
                <Trash2 className="size-4" /> {can.delete ? "Delete" : "Live — can’t delete"}
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </div>

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && !busy && setConfirm(null)}
          title={copy[confirm].title}
          description={copy[confirm].body}
          confirmLabel={copy[confirm].cta}
          tone={copy[confirm].danger ? "danger" : "default"}
          busy={busy}
          onConfirm={run}
        />
      )}
    </motion.li>
  );
}
