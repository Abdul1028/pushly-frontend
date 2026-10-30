"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, Plus, Rocket, Trash2 } from "lucide-react";
import { apiFetchAuth } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { parseEnvFile, RESERVED_ENV_KEYS, type EnvVar } from "@/components/env-vars-editor";
import { useProject } from "@/components/project/project-context";
import { btn, errorMessage, PageHeader, Panel, Spinner } from "@/components/project/ui";

type Row = EnvVar & { uid: number; shown: boolean };

let uid = 0;
const toRows = (vars: EnvVar[]): Row[] => vars.map((v) => ({ ...v, uid: ++uid, shown: false }));
const KEY_RE = /^[A-Z_][A-Z0-9_]*$/;

const cell =
  "block w-full h-10 rounded-lg border border-black/10 bg-white px-3 font-mono text-[13px] text-label placeholder:text-label-3 outline-none transition-[border-color,box-shadow] focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)] aria-[invalid=true]:border-sys-red";

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
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [saving, setSaving] = useState(false);

  const clean = useMemo(() => rows.filter((r) => r.key.trim()).map(({ key, value }) => ({ key: key.trim(), value })), [rows]);
  const dirty = JSON.stringify(clean) !== JSON.stringify(initial);

  const problems = useMemo(() => {
    const seen = new Map<string, number>();
    rows.forEach((r) => r.key && seen.set(r.key, (seen.get(r.key) ?? 0) + 1));
    const out: Record<number, string> = {};
    rows.forEach((r) => {
      if (!r.key) return;
      if (RESERVED_ENV_KEYS.has(r.key)) out[r.uid] = `${r.key} is reserved by Pushly.`;
      else if (!KEY_RE.test(r.key)) out[r.uid] = "Use letters, numbers and underscores, not starting with a number.";
      else if ((seen.get(r.key) ?? 0) > 1) out[r.uid] = "This key is listed twice.";
    });
    return out;
  }, [rows]);
  const hasProblems = Object.keys(problems).length > 0;

  const update = (u: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.uid === u ? { ...r, ...patch } : r)));
  const add = () => setRows((rs) => [...rs, ...toRows([{ key: "", value: "" }])]);
  const removeRow = (u: number) => setRows((rs) => rs.filter((r) => r.uid !== u));

  // Paste a whole .env file into any key field and every variable is filled in
  const onKeyPaste = (u: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("=")) return;
    const parsed = parseEnvFile(text);
    if (parsed.length === 0) return;
    e.preventDefault();
    setRows((rs) => {
      // Copies, so existing rows are updated without mutating state
      const merged = rs.filter((r) => r.uid !== u || r.key || r.value).map((r) => ({ ...r }));
      for (const p of parsed) {
        const existing = merged.find((r) => r.key === p.key);
        if (existing) existing.value = p.value;
        else merged.push(...toRows([p]));
      }
      return merged;
    });
    toast({ title: `${parsed.length} variable${parsed.length === 1 ? "" : "s"} pasted` });
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(clean); // success remounts this editor with the saved set
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
            {clean.length} variable{clean.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            {dirty && (
              <button type="button" className={btn.quiet} onClick={() => setRows(toRows(initial))} disabled={saving}>
                Reset
              </button>
            )}
            <button type="button" className={btn.primary} onClick={save} disabled={!dirty || hasProblems || saving}>
              {saving && <Spinner />}
              Save
            </button>
          </div>
        </>
      }
    >
      {rows.length > 0 && (
        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_2.25rem] gap-2 pb-2 text-[12px] font-medium text-label-3">
          <span>Key</span>
          <span>Value</span>
        </div>
      )}
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.li
              key={r.uid}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_2.25rem] gap-2 items-center">
                <input
                  aria-label="Key"
                  value={r.key}
                  onChange={(e) => update(r.uid, { key: e.target.value.toUpperCase().replace(/[-\s]+/g, "_") })}
                  onPaste={(e) => onKeyPaste(r.uid, e)}
                  placeholder="API_KEY"
                  aria-invalid={!!problems[r.uid]}
                  className={cell}
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="relative">
                  <input
                    aria-label={`Value for ${r.key || "new variable"}`}
                    type={r.shown ? "text" : "password"}
                    value={r.value}
                    onChange={(e) => update(r.uid, { value: e.target.value })}
                    placeholder="value"
                    className={cn(cell, "pr-10")}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => update(r.uid, { shown: !r.shown })}
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-8 rounded-md grid place-items-center text-label-3 hover:text-label"
                    aria-label={r.shown ? "Hide value" : "Show value"}
                  >
                    {r.shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <button type="button" onClick={() => removeRow(r.uid)} className={btn.icon} aria-label={`Remove ${r.key || "variable"}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              {problems[r.uid] && <p className="mt-1 text-[12px] text-sys-red">{problems[r.uid]}</p>}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {rows.length === 0 && <p className="text-[15px] text-label-2 pb-2">No variables yet. Add one, or paste a .env file.</p>}

      <button type="button" onClick={add} className={cn(btn.quiet, "mt-3 -ml-3 text-link hover:text-link")}>
        <Plus className="size-4" aria-hidden />
        Add variable
      </button>
    </Panel>
  );
}
