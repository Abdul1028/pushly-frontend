"use client";

import { useRef, useState } from "react";
import {
  Plus,
  Trash2,
  ClipboardPaste,
  Eye,
  EyeOff,
  AlertCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { btn } from "@/components/project/ui";

/* ─── Constants ──────────────────────────────────────────────────────────── */

export const RESERVED_ENV_KEYS = new Set([
  "GIT_URL",
  "GIT_REF",
  "ENV",
  "PROJECT_ID",
  "DEPLOYMENT_ID",
  "GITHUB_TOKEN",
  "INTERNAL_TOKEN",
  "API_URL",
  "UI_BUILD_COMMAND",
  "UI_INSTALL_COMMAND",
  "UI_OUTPUT_DIR",
]);

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface EnvVar {
  key: string;
  value: string;
}

interface EnvVarsEditorProps {
  value: EnvVar[];
  onChange: (vars: EnvVar[]) => void;
  disabled?: boolean;
}

/* ─── Smart-paste parser ─────────────────────────────────────────────────── */

export function parseEnvFile(raw: string): EnvVar[] {
  const results: EnvVar[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const rawKey = trimmed.slice(0, eqIdx).trim();
    let rawVal = trimmed.slice(eqIdx + 1).trim();

    if (
      (rawVal.startsWith("'") && rawVal.endsWith("'")) ||
      (rawVal.startsWith('"') && rawVal.endsWith('"'))
    ) {
      rawVal = rawVal.slice(1, -1);
    }

    const key = rawKey.toUpperCase().replace(/[-\s]+/g, "_");

    if (key) results.push({ key, value: rawVal });
  }

  return results;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function EnvVarsEditor({ value, onChange, disabled }: EnvVarsEditorProps) {
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [visibleValues, setVisibleValues] = useState<Set<number>>(new Set());
  const firstKeyRef = useRef<HTMLInputElement>(null);

  const toggleValueVisibility = (idx: number) => {
    setVisibleValues((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const update = (idx: number, field: "key" | "value", val: string) => {
    const next = value.map((v, i) =>
      i === idx
        ? {
            ...v,
            [field]: field === "key" ? val.toUpperCase().replace(/[-\s]+/g, "_") : val,
          }
        : v
    );
    onChange(next);
  };

  const addRow = () => {
    onChange([...value, { key: "", value: "" }]);
    setTimeout(() => firstKeyRef.current?.focus(), 50);
  };

  const removeRow = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
    setVisibleValues((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => {
        if (v < idx) next.add(v);
        else if (v > idx) next.add(v - 1);
      });
      return next;
    });
  };

  const applyPaste = () => {
    const parsed = parseEnvFile(pasteText);
    if (!parsed.length) return;

    const existing = value.filter((v) => v.key.trim());
    const map = new Map(existing.map((v) => [v.key, v.value]));
    parsed.forEach((p) => map.set(p.key, p.value));

    onChange(Array.from(map.entries()).map(([key, val]) => ({ key, value: val })));
    setPasteText("");
    setShowPasteArea(false);
  };

  const getKeyError = (key: string, idx: number): string | null => {
    if (!key.trim()) return null;
    if (RESERVED_ENV_KEYS.has(key.toUpperCase())) return "Reserved system variable";
    const dupe = value.findIndex((v, i) => i !== idx && v.key === key);
    if (dupe !== -1) return "Duplicate key";
    return null;
  };

  return (
    <div className="space-y-4">
      {/* ── Paste area toggle & description ── */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-label-2">
          Environment variables are encrypted and provided at build and runtime.
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowPasteArea((v) => !v)}
          className={cn(btn.quiet, "h-8 px-3 text-[13px]")}
        >
          {showPasteArea ? (
            <>
              <X className="size-3.5" aria-hidden /> Close
            </>
          ) : (
            <>
              <ClipboardPaste className="size-3.5" aria-hidden /> Paste .env
            </>
          )}
        </button>
      </div>

      {/* ── Smart paste panel ── */}
      {showPasteArea && (
        <div className="rounded-xl border border-black/10 bg-fill/60 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <ClipboardPaste className="size-4 text-apple-blue mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="text-[14px] font-medium text-label">Import from .env</p>
              <p className="text-[12px] text-label-3 mt-0.5">
                Paste raw key-value pairs. Keys will be automatically converted to UPPER_SNAKE_CASE.
              </p>
            </div>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`NODE_ENV=production\nVITE_API_URL=https://api.example.com\n# Comments and quotes are stripped`}
            rows={4}
            className="w-full rounded-lg border border-black/10 bg-white p-3 font-mono text-[12.5px] text-label outline-none focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)] resize-y"
            disabled={disabled}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!pasteText.trim() || disabled}
              onClick={applyPaste}
              className={btn.primary}
            >
              Import variables
            </button>
            <button
              type="button"
              className={btn.secondary}
              onClick={() => {
                setPasteText("");
                setShowPasteArea(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Variable rows ── */}
      {value.length > 0 && (
        <div className="rounded-xl border border-black/[0.08] divide-y divide-black/[0.06] overflow-hidden bg-white">
          <div className="grid grid-cols-[1.1fr_1.1fr_auto] bg-[#fbfbfd] px-4 py-2 border-b border-black/[0.06] text-[11px] font-semibold tracking-wider text-label-3 uppercase">
            <div>Key</div>
            <div className="pl-3 border-l border-black/[0.06]">Value</div>
            <div className="w-9" />
          </div>

          {value.map((envVar, idx) => {
            const keyError = getKeyError(envVar.key, idx);
            const isVisible = visibleValues.has(idx);

            return (
              <div
                key={idx}
                className={cn(
                  "grid grid-cols-[1.1fr_1.1fr_auto] items-center transition-colors",
                  keyError ? "bg-sys-red/[0.03]" : "hover:bg-fill/40"
                )}
              >
                {/* Key */}
                <div className="px-3 py-2 space-y-1">
                  <input
                    ref={idx === 0 ? firstKeyRef : undefined}
                    value={envVar.key}
                    onChange={(e) => update(idx, "key", e.target.value)}
                    placeholder="VARIABLE_NAME"
                    disabled={disabled}
                    className={cn(
                      "w-full h-8 bg-transparent font-mono text-[13px] text-label outline-none placeholder:text-label-3",
                      keyError && "text-sys-red font-medium"
                    )}
                  />
                  {keyError && (
                    <div className="flex items-center gap-1 text-[11px] text-sys-red">
                      <AlertCircle className="size-3 shrink-0" aria-hidden />
                      <span>{keyError}</span>
                    </div>
                  )}
                </div>

                {/* Value */}
                <div className="px-3 py-2 border-l border-black/[0.06] flex items-center gap-2">
                  <input
                    type={isVisible ? "text" : "password"}
                    value={envVar.value}
                    onChange={(e) => update(idx, "value", e.target.value)}
                    placeholder="Value"
                    disabled={disabled}
                    className="w-full h-8 bg-transparent font-mono text-[13px] text-label outline-none placeholder:text-label-3"
                  />
                  <button
                    type="button"
                    onClick={() => toggleValueVisibility(idx)}
                    className="p-1 rounded-md text-label-3 hover:text-label transition-colors"
                    tabIndex={-1}
                    aria-label={isVisible ? "Hide value" : "Show value"}
                  >
                    {isVisible ? (
                      <EyeOff className="size-3.5" aria-hidden />
                    ) : (
                      <Eye className="size-3.5" aria-hidden />
                    )}
                  </button>
                </div>

                {/* Remove button */}
                <div className="px-2 py-2 flex justify-center">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeRow(idx)}
                    className={cn(btn.icon, "size-8 hover:text-sys-red hover:bg-sys-red/[0.06]")}
                    aria-label="Remove variable"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add variable row button ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={addRow}
        className={cn(btn.secondary, "w-full h-10 border-dashed justify-center text-[13px]")}
      >
        <Plus className="size-4" aria-hidden />
        Add environment variable
      </button>

      {/* ── Protected keys note ── */}
      <div className="rounded-xl bg-fill p-3 text-[12px] text-label-3 flex items-start gap-2">
        <span className="font-semibold text-label-2 shrink-0">Protected keys:</span>
        <span className="leading-relaxed">
          GIT_URL, GIT_REF, ENV, PROJECT_ID, DEPLOYMENT_ID, GITHUB_TOKEN, INTERNAL_TOKEN, API_URL, UI_BUILD_COMMAND, UI_INSTALL_COMMAND, UI_OUTPUT_DIR
        </span>
      </div>
    </div>
  );
}
