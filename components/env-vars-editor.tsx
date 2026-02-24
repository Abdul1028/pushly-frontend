"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus,
    Trash2,
    ClipboardPaste,
    Eye,
    EyeOff,
    AlertCircle,
    X,
} from "lucide-react";

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

function parseEnvFile(raw: string): EnvVar[] {
    const results: EnvVar[] = [];

    for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        // Skip blank lines and comments
        if (!trimmed || trimmed.startsWith("#")) continue;

        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;

        const rawKey = trimmed.slice(0, eqIdx).trim();
        let rawVal = trimmed.slice(eqIdx + 1).trim();

        // Strip surrounding quotes (single or double), handle escaped inner quotes
        if (
            (rawVal.startsWith("'") && rawVal.endsWith("'")) ||
            (rawVal.startsWith('"') && rawVal.endsWith('"'))
        ) {
            rawVal = rawVal.slice(1, -1);
        }

        // Normalise key: uppercase + replace hyphens & spaces with underscore
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

    /* helpers */

    const toggleValueVisibility = (idx: number) => {
        setVisibleValues((prev) => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    const update = (idx: number, field: "key" | "value", val: string) => {
        const next = value.map((v, i) =>
            i === idx ? { ...v, [field]: field === "key" ? val.toUpperCase().replace(/[-\s]+/g, "_") : val } : v
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
            prev.forEach((v) => { if (v < idx) next.add(v); else if (v > idx) next.add(v - 1); });
            return next;
        });
    };

    const applyPaste = () => {
        const parsed = parseEnvFile(pasteText);
        if (!parsed.length) return;

        // Merge with existing (paste wins on key collision)
        const existing = value.filter((v) => v.key.trim());
        const map = new Map(existing.map((v) => [v.key, v.value]));
        parsed.forEach((p) => map.set(p.key, p.value));

        onChange(Array.from(map.entries()).map(([key, val]) => ({ key, value: val })));
        setPasteText("");
        setShowPasteArea(false);
    };

    const getKeyError = (key: string, idx: number): string | null => {
        if (!key.trim()) return null;
        if (RESERVED_ENV_KEYS.has(key.toUpperCase())) return "Reserved — cannot use";
        const dupe = value.findIndex((v, i) => i !== idx && v.key === key);
        if (dupe !== -1) return "Duplicate key";
        return null;
    };

    return (
        <div className="space-y-3">
            {/* ── Paste area toggle ── */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Add variables your app needs at build/runtime.{" "}
                    <span className="text-amber-500 font-medium">System variables are protected.</span>
                </p>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => setShowPasteArea((v) => !v)}
                    className="flex items-center gap-1.5 text-xs h-7"
                >
                    {showPasteArea ? (
                        <><X className="h-3 w-3" /> Close</>
                    ) : (
                        <><ClipboardPaste className="h-3 w-3" /> Paste .env</>
                    )}
                </Button>
            </div>

            {/* ── Smart paste area ── */}
            {showPasteArea && (
                <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                        <ClipboardPaste className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-medium">Paste .env file content</p>
                            <p className="text-xs text-muted-foreground">
                                Paste your .env file and all variables will be automatically imported. Keys are normalised to UPPER_SNAKE_CASE.
                            </p>
                        </div>
                    </div>
                    <Textarea
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder={`NODE_ENV=production\nVITE_API_URL='https://api.example.com'\n# comments are ignored`}
                        rows={5}
                        className="font-mono text-xs resize-none"
                        disabled={disabled}
                    />
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            disabled={!pasteText.trim() || disabled}
                            onClick={applyPaste}
                            className="h-8 text-xs"
                        >
                            Import Variables
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => { setPasteText(""); setShowPasteArea(false); }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Variable rows ── */}
            {value.length > 0 && (
                <div className="rounded-lg border overflow-hidden">
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-0 bg-muted/50 border-b">
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Key
                        </div>
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l">
                            Value
                        </div>
                        <div className="w-20" />
                    </div>

                    {/* Variable rows */}
                    {value.map((envVar, idx) => {
                        const keyError = getKeyError(envVar.key, idx);
                        const isReserved = RESERVED_ENV_KEYS.has(envVar.key.toUpperCase());
                        const isVisible = visibleValues.has(idx);

                        return (
                            <div
                                key={idx}
                                className={`grid grid-cols-[1fr_1fr_auto] gap-0 border-b last:border-b-0 transition-colors ${keyError ? "bg-destructive/5" : "bg-background hover:bg-muted/30"
                                    }`}
                            >
                                {/* Key */}
                                <div className="px-2 py-1.5 space-y-1">
                                    <Input
                                        ref={idx === 0 ? firstKeyRef : undefined}
                                        value={envVar.key}
                                        onChange={(e) => update(idx, "key", e.target.value)}
                                        placeholder="VARIABLE_NAME"
                                        disabled={disabled}
                                        className={`h-8 font-mono text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 ${keyError ? "text-destructive" : ""
                                            }`}
                                    />
                                    {keyError && (
                                        <div className="flex items-center gap-1 px-1">
                                            <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                                            <span className="text-[10px] text-destructive">{keyError}</span>
                                            {isReserved && (
                                                <Badge variant="destructive" className="text-[9px] h-4 px-1 ml-1">
                                                    Reserved
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Value */}
                                <div className="px-2 py-1.5 border-l relative">
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type={isVisible ? "text" : "password"}
                                            value={envVar.value}
                                            onChange={(e) => update(idx, "value", e.target.value)}
                                            placeholder="value"
                                            disabled={disabled}
                                            className="h-8 font-mono text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 pr-7"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleValueVisibility(idx)}
                                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                            tabIndex={-1}
                                        >
                                            {isVisible ? (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            ) : (
                                                <Eye className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Delete */}
                                <div className="flex items-center justify-center w-20 border-l">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={disabled}
                                        onClick={() => removeRow(idx)}
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Add variable row ── */}
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={addRow}
                className="w-full h-8 text-xs border-dashed flex items-center gap-1.5"
            >
                <Plus className="h-3.5 w-3.5" />
                Add Variable
            </Button>

            {/* ── Reserved keys info ── */}
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    <span className="font-semibold">Protected keys:</span>{" "}
                    GIT_URL, GIT_REF, ENV, PROJECT_ID, DEPLOYMENT_ID, GITHUB_TOKEN, INTERNAL_TOKEN, API_URL, UI_BUILD_COMMAND, UI_INSTALL_COMMAND, UI_OUTPUT_DIR
                </p>
            </div>
        </div>
    );
}
