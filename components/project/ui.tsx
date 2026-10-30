"use client";

import { forwardRef, useId } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Building blocks for the logged-in app, in the pushly-ui style (light appearance):
// white panels on the fill, dot + word statuses, compact pill buttons, labelled fields.

/* ── Helpers ── */

// apiFetch throws { status, data } — the message lives in data.message (or data itself if text)
export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again.") {
  const err = e as { data?: unknown; message?: string } | null;
  const data = err?.data;
  if (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string") {
    return (data as { message: string }).message;
  }
  if (typeof data === "string" && data.trim()) return data;
  if (err?.message) return err.message;
  return fallback;
}

export function formatRelative(dateString?: string | null) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const m = 60_000, h = 60 * m, d = 24 * h;
  if (diff < m) return "just now";
  if (diff < h) return `${Math.floor(diff / m)}m ago`;
  if (diff < d) return `${Math.floor(diff / h)}h ago`;
  if (diff < 2 * d) return "yesterday";
  if (diff < 7 * d) return `${Math.floor(diff / d)}d ago`;
  if (diff < 30 * d) return `${Math.floor(diff / (7 * d))}w ago`;
  if (diff < 365 * d) return `${Math.floor(diff / (30 * d))}mo ago`;
  return `${Math.floor(diff / (365 * d))}y ago`;
}

export function formatDate(dateString?: string | null) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/* ── Status ── */

type Tone = "green" | "orange" | "red" | "gray";

const STATUS: Record<string, { label: string; tone: Tone; live?: boolean }> = {
  SUCCESS: { label: "Ready", tone: "green" },
  RUNNING: { label: "Ready", tone: "green" },
  QUEUED: { label: "Queued", tone: "gray", live: true },
  BUILDING: { label: "Building", tone: "orange", live: true },
  DEPLOYING: { label: "Deploying", tone: "orange", live: true },
  ROLLING_BACK: { label: "Rolling back", tone: "orange", live: true },
  FAILED: { label: "Failed", tone: "red" },
  STOPPED: { label: "Stopped", tone: "gray" },
};

export function statusInfo(status?: string) {
  return STATUS[(status ?? "").toUpperCase()] ?? { label: status ? status.charAt(0) + status.slice(1).toLowerCase() : "Unknown", tone: "gray" as Tone };
}

/** Statuses that will change on their own — worth polling for */
export const isInProgress = (status?: string) => !!statusInfo(status).live;

const DOT: Record<Tone, string> = {
  green: "bg-sys-green",
  orange: "bg-sys-orange",
  red: "bg-sys-red",
  gray: "bg-label-3",
};

export function StatusDot({ status, showLabel = true, className }: { status?: string; showLabel?: boolean; className?: string }) {
  const info = statusInfo(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] text-label-2", className)}>
      <span className="relative flex size-2">
        {info.live && <span className={cn("absolute inset-0 rounded-full animate-ping opacity-60", DOT[info.tone])} />}
        <span className={cn("relative size-2 rounded-full", DOT[info.tone])} />
      </span>
      {showLabel && info.label}
    </span>
  );
}

export function EnvPill({ environment }: { environment?: string }) {
  const prod = environment === "PRODUCTION";
  return (
    <span
      className={cn(
        "inline-flex items-center h-5 px-2 rounded-md text-[11px] font-medium",
        prod ? "bg-label text-white" : "bg-fill-2 text-label-2"
      )}
    >
      {prod ? "Production" : environment === "STAGING" ? "Staging" : environment ?? "—"}
    </span>
  );
}

/* ── Layout ── */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-title text-label truncate">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-label-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  footer,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl bg-white border border-black/[0.06] overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-5 md:px-6 pt-5 md:pt-6">
          <div className="min-w-0">
            {title && <h2 className="text-[17px] font-semibold tracking-[-0.022em] text-label">{title}</h2>}
            {description && <p className="mt-1 text-[13px] text-label-2">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children && <div className={cn("px-5 md:px-6 py-5 md:py-6", bodyClassName)}>{children}</div>}
      {footer && (
        <div className="flex items-center justify-between gap-4 px-5 md:px-6 py-3.5 bg-[#fbfbfd] border-t border-black/[0.06]">
          {footer}
        </div>
      )}
    </section>
  );
}

/* ── Buttons (compact app variants of btn-apple) ── */

const base =
  "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-[14px] font-medium whitespace-nowrap transition-[background-color,transform,color] duration-150 active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apple-blue";

export const btn = {
  primary: cn(base, "bg-apple-blue text-white hover:bg-apple-blue-hover"),
  secondary: cn(base, "bg-white text-label border border-black/10 hover:bg-fill"),
  quiet: cn(base, "text-label-2 hover:text-label hover:bg-black/[0.05]"),
  danger: cn(base, "bg-sys-red text-white hover:bg-[#e0352b]"),
  dangerQuiet: cn(base, "bg-white text-sys-red border border-black/10 hover:bg-sys-red/[0.06]"),
  icon: "inline-flex items-center justify-center size-9 rounded-full text-label-2 hover:text-label hover:bg-black/[0.05] transition-colors focus-visible:outline-2 focus-visible:outline-apple-blue",
};

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}

/* ── Fields ── */

const inputClass =
  "block w-full h-11 rounded-xl border border-black/10 bg-white px-3.5 text-[15px] text-label placeholder:text-label-3 outline-none transition-[border-color,box-shadow] duration-150 focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)] aria-[invalid=true]:border-sys-red disabled:opacity-60 disabled:bg-fill";

export const TextField = forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { label: string; hint?: React.ReactNode; mono?: boolean; trailing?: React.ReactNode }
>(({ label, hint, mono, trailing, id, className, ...props }, ref) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-[13px] font-medium text-label">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={cn(inputClass, mono && "font-mono text-[14px]", trailing && "pr-10", className)}
          {...props}
        />
        {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {hint && <div className="text-[12px] text-label-3">{hint}</div>}
    </div>
  );
});
TextField.displayName = "TextField";

export function TextAreaField({
  label,
  hint,
  id,
  className,
  ...props
}: React.ComponentProps<"textarea"> & { label: string; hint?: React.ReactNode }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-[13px] font-medium text-label">
        {label}
      </label>
      <textarea id={inputId} className={cn(inputClass, "h-auto min-h-24 py-2.5 resize-y", className)} {...props} />
      {hint && <div className="text-[12px] text-label-3">{hint}</div>}
    </div>
  );
}

/** Segmented control (Apple style) for a small set of choices */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-0.5 rounded-full bg-fill-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors",
            value === o.value ? "bg-white text-label shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-label-2 hover:text-label"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Confirm dialog (light) ── */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "default",
  busy,
  confirmDisabled,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
  busy?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[61] w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 text-label shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <AlertDialog.Title className="text-[19px] font-semibold tracking-[-0.022em]">{title}</AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-2 text-[15px] leading-[1.47] text-label-2">{description}</AlertDialog.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel className={btn.secondary} disabled={busy}>
              Cancel
            </AlertDialog.Cancel>
            <button
              type="button"
              className={tone === "danger" ? btn.danger : btn.primary}
              onClick={onConfirm}
              disabled={busy || confirmDisabled}
            >
              {busy && <Spinner />}
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
