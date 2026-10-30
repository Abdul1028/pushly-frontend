"use client";

import { forwardRef, useId, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// Shared frame for sign-in and sign-up: a centred, two-tone title and one white panel
// on the light fill, in the pushly-ui style.

// Rise out of a soft blur; springs can't animate blur, so it gets an eased tween
const rise = (delay: number, reduce: boolean) =>
  reduce
    ? // Mount straight into the final state (the server rendered the start state)
      { initial: false as const, animate: { opacity: 1, y: 0, filter: "blur(0px)" } }
    : {
        initial: { opacity: 0, y: 24, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        transition: {
          default: { type: "spring" as const, bounce: 0, duration: 0.9, delay },
          filter: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const, delay },
        },
      };

export function AuthShell({
  title,
  subtitle,
  footer,
  alwaysAnimate = false,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  /** Sign-up arrives through the "Get started" transition, so its entrance always plays */
  alwaysAnimate?: boolean;
  children: React.ReactNode;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const reduce = prefersReduced && !alwaysAnimate;

  return (
    <MotionConfig reducedMotion={alwaysAnimate ? "never" : "user"}>
      <div className="appearance-light min-h-[calc(100svh-3rem)] bg-fill text-label flex items-center justify-center px-4 sm:px-6 py-14">
        <div className="w-full max-w-[440px]">
          <motion.div key={`head-${reduce}`} {...rise(0.05, reduce)} className="text-center">
            <h1 className="text-title text-label">{title}</h1>
            <p className="mt-2 text-[17px] leading-[1.47] text-label-2">{subtitle}</p>
          </motion.div>

          <motion.div key={`panel-${reduce}`} {...rise(0.15, reduce)} className="mt-8">
            {children}
          </motion.div>

          <motion.div key={`foot-${reduce}`} {...rise(0.25, reduce)} className="mt-6 text-center text-[15px] text-label-2">
            {footer}
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}

/* ── Fields: Apple-style floating labels ── */

type FieldProps = Omit<React.ComponentProps<"input">, "placeholder"> & { label: string };

// The label sits inside the field and floats up once the field is focused or filled.
// `placeholder=" "` lets CSS (:placeholder-shown) know whether there's a value.
export const Field = forwardRef<HTMLInputElement, FieldProps & { trailing?: React.ReactNode }>(
  ({ label, id, className, trailing, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          placeholder=" "
          className={cn(
            "peer block w-full h-14 rounded-xl border border-black/10 bg-white px-4 pt-[22px] pb-1 text-[17px] leading-[22px] text-label",
            "outline-none transition-[border-color,box-shadow] duration-150",
            "focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)]",
            "aria-[invalid=true]:border-sys-red aria-[invalid=true]:focus:shadow-[0_0_0_4px_rgba(255,59,48,0.12)]",
            "disabled:opacity-60",
            trailing && "pr-14",
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-4 top-[7px] text-[12px] leading-4 text-label-3 transition-all duration-150",
            "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[17px]",
            "peer-focus:top-[7px] peer-focus:translate-y-0 peer-focus:text-[12px] peer-focus:text-apple-blue"
          )}
        >
          {label}
        </label>
        {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    );
  }
);
Field.displayName = "Field";

export function PasswordField(props: FieldProps) {
  const [shown, setShown] = useState(false);
  return (
    <Field
      {...props}
      type={shown ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="size-11 rounded-full grid place-items-center text-label-3 hover:text-label transition-colors"
        >
          {shown ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
        </button>
      }
    />
  );
}

/* ── Error and submit ── */

export function FormError({ message }: { message: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key="error"
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          className="overflow-hidden"
        >
          <p className="flex items-start gap-2 pt-1 text-[13px] text-sys-red">
            <AlertCircle className="size-4 shrink-0 mt-px" aria-hidden />
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SubmitButton({ loading, children, loadingText }: { loading: boolean; children: React.ReactNode; loadingText: string }) {
  return (
    <button type="submit" disabled={loading} className="btn-apple w-full h-12 disabled:opacity-70 disabled:pointer-events-none">
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
