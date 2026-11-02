"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { parseEnvFile, RESERVED_ENV_KEYS, type EnvVar } from "@/components/env-vars-editor";
import { btn } from "./ui";

// Environment variable rows, shared by the project's Environment Variables section and New project.
// Paste a .env file into any key field to fill every variable at once.

export type EnvRow = EnvVar & { uid: number; shown: boolean };

let uid = 0;
export const toEnvRows = (vars: EnvVar[]): EnvRow[] => vars.map((v) => ({ ...v, uid: ++uid, shown: false }));
const KEY_RE = /^[A-Z_][A-Z0-9_]*$/;

const cell =
  "block w-full h-10 rounded-lg border border-black/10 bg-white px-3 font-mono text-[13px] text-label placeholder:text-label-3 outline-none transition-[border-color,box-shadow] focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)] aria-[invalid=true]:border-sys-red";

export function useEnvRows(initial: EnvVar[] = []) {
  const { toast } = useToast();
  const [rows, setRows] = useState<EnvRow[]>(() => toEnvRows(initial));

  const clean = useMemo(() => rows.filter((r) => r.key.trim()).map(({ key, value }) => ({ key: key.trim(), value })), [rows]);

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

  const update = (u: number, patch: Partial<EnvRow>) => setRows((rs) => rs.map((r) => (r.uid === u ? { ...r, ...patch } : r)));
  const add = () => setRows((rs) => [...rs, ...toEnvRows([{ key: "", value: "" }])]);
  const remove = (u: number) => setRows((rs) => rs.filter((r) => r.uid !== u));
  const reset = (vars: EnvVar[]) => setRows(toEnvRows(vars));

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
        else merged.push(...toEnvRows([p]));
      }
      return merged;
    });
    toast({ title: `${parsed.length} variable${parsed.length === 1 ? "" : "s"} pasted` });
  };

  return { rows, clean, problems, hasProblems: Object.keys(problems).length > 0, update, add, remove, reset, onKeyPaste };
}

export function EnvRowsList({ env, disabled, emptyText = "No variables yet. Add one, or paste a .env file." }: { env: ReturnType<typeof useEnvRows>; disabled?: boolean; emptyText?: string }) {
  const { rows, problems, update, add, remove, onKeyPaste } = env;
  return (
    <div>
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
              <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_2.25rem] gap-2 items-center">
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
                  disabled={disabled}
                />
                <div className="relative col-start-1 sm:col-start-auto row-start-2 sm:row-start-auto">
                  <input
                    aria-label={`Value for ${r.key || "new variable"}`}
                    type={r.shown ? "text" : "password"}
                    value={r.value}
                    onChange={(e) => update(r.uid, { value: e.target.value })}
                    placeholder="value"
                    className={cn(cell, "pr-10")}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={disabled}
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
                <button
                  type="button"
                  onClick={() => remove(r.uid)}
                  className={cn(btn.icon, "col-start-2 sm:col-start-auto row-start-1 sm:row-start-auto")}
                  aria-label={`Remove ${r.key || "variable"}`}
                  disabled={disabled}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {problems[r.uid] && <p className="mt-1 text-[12px] text-sys-red">{problems[r.uid]}</p>}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {rows.length === 0 && <p className="text-[15px] text-label-2 pb-2">{emptyText}</p>}

      <button type="button" onClick={add} className={cn(btn.quiet, "mt-3 -ml-3 text-link hover:text-link")} disabled={disabled}>
        <Plus className="size-4" aria-hidden />
        Add variable
      </button>
    </div>
  );
}
