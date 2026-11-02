"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AnimatePresence, motion } from "motion/react";
import { Rocket } from "lucide-react";
import { apiFetchAuth } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { type EnvVar } from "@/components/env-vars-editor";
import { EnvRowsList, useEnvRows } from "@/components/project/env-rows";
import { useProject } from "@/components/project/project-context";
import { btn, errorMessage, PageHeader, Panel, Spinner } from "@/components/project/ui";

export default function EnvVarsPage() {
  const { id, token, project, deploy } = useProject();
  const { toast } = useToast();
  const router = useRouter();
  const [redeployPrompt, setRedeployPrompt] = useState(false);
  const [redeploying, setRedeploying] = useState<"STAGING" | "PRODUCTION" | null>(null);

  // Same endpoint the old settings dialog read
  const { data, error, mutate } = useSWR(token ? ["env-vars", id, token] : null, () =>
    apiFetchAuth<{ key: string; value: string }[]>(`/api/projects/${id}/env-vars`, token!).then((r) =>
      Array.isArray(r) ? r.map((e) => ({ key: e.key, value: e.value })) : []
    )
  );

  const onSave = async (clean: EnvVar[]) => {
    await apiFetchAuth(`/api/projects/${id}/env-vars`, token!, { method: "PUT", body: JSON.stringify(clean) });
    await mutate(clean, { revalidate: true });
    toast({ title: "Environment variables saved" });
    setRedeployPrompt(true);
  };

  const redeploy = async (env: "STAGING" | "PRODUCTION") => {
    setRedeploying(env);
    try {
      const created = await deploy(env, project?.gitBranch || "main");
      router.push(`/logs?projectId=${id}&deploymentId=${created.id}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Redeploy failed", description: errorMessage(e) });
      setRedeploying(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Environment Variables" subtitle="Available to your build. Changes apply on the next deployment." />

      {/* After saving: offer to rebuild so the new values take effect */}
      <AnimatePresence initial={false}>
        {redeployPrompt && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl bg-white border border-black/[0.06] px-5 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-medium text-label">Redeploy to use the new values.</p>
                <p className="text-[13px] text-label-2">Builds the latest commit on {project?.gitBranch ?? "main"}.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className={btn.quiet} onClick={() => setRedeployPrompt(false)} disabled={!!redeploying}>
                  Later
                </button>
                <button type="button" className={btn.secondary} onClick={() => redeploy("STAGING")} disabled={!!redeploying}>
                  {redeploying === "STAGING" ? <Spinner /> : <Rocket className="size-4" aria-hidden />}
                  Staging
                </button>
                <button type="button" className={btn.primary} onClick={() => redeploy("PRODUCTION")} disabled={!!redeploying}>
                  {redeploying === "PRODUCTION" ? <Spinner /> : <Rocket className="size-4" aria-hidden />}
                  Production
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error ? (
        <Panel title="Variables">
          <p className="text-[14px] text-sys-red">{errorMessage(error, "Couldn’t load environment variables.")}</p>
        </Panel>
      ) : !data ? (
        <Panel title="Variables">
          <div className="space-y-2" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-fill animate-pulse" />
            ))}
          </div>
        </Panel>
      ) : (
        // Remounts with fresh rows whenever the saved set changes
        <EnvEditor key={JSON.stringify(data)} initial={data} onSave={onSave} />
      )}
    </div>
  );
}

function EnvEditor({ initial, onSave }: { initial: EnvVar[]; onSave: (clean: EnvVar[]) => Promise<void> }) {
  const { toast } = useToast();
  const env = useEnvRows(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(env.clean) !== JSON.stringify(initial);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(env.clean); // success remounts this editor with the saved set
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn’t save", description: errorMessage(e) });
      setSaving(false);
    }
  };

  return (
    <Panel
      title="Variables"
      description="Tip: paste the contents of a .env file into any key field to add them all at once."
      footer={
        <>
          <p className="text-[13px] text-label-3 tabular-nums">
            {env.clean.length} variable{env.clean.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            {dirty && (
              <button type="button" className={btn.quiet} onClick={() => env.reset(initial)} disabled={saving}>
                Reset
              </button>
            )}
            <button type="button" className={btn.primary} onClick={save} disabled={!dirty || env.hasProblems || saving}>
              {saving && <Spinner />}
              Save
            </button>
          </div>
        </>
      }
    >
      <EnvRowsList env={env} />
    </Panel>
  );
}
