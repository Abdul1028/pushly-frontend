"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAnimate } from "motion/react";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { PRODUCT_NAME } from "@/lib/config";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { AuthShell, Field, FormError, PasswordField, SubmitButton } from "@/components/auth/auth-shell";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const reduce = usePrefersReducedMotion();
  const [panel, animate] = useAnimate<HTMLFormElement>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Sign in failed. Check your email and password.");
      // A short shake, like a wrong macOS password; skipped with reduced motion (the message says it)
      if (!reduce && panel.current) animate(panel.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.45, ease: "easeOut" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={`Sign in to ${PRODUCT_NAME}.`}
      subtitle="Pick up where your last deploy left off."
      footer={
        <>
          New to {PRODUCT_NAME}?{" "}
          <Link href="/register" className="inline-flex items-center py-3 text-link hover:underline underline-offset-2">
            Create an account
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </>
      }
    >
      <form ref={panel} onSubmit={onSubmit} className="rounded-2xl bg-white border border-black/[0.06] p-6 sm:p-8 space-y-3 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.12)]">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          required
          disabled={loading}
          autoFocus
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!error}
          required
          disabled={loading}
        />
        <FormError message={error} />
        <div className="pt-3">
          <SubmitButton loading={loading} loadingText="Signing in…">
            Sign in
          </SubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}
