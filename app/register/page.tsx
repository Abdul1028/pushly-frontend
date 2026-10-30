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

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const reduce = usePrefersReducedMotion();
  const [panel, animate] = useAnimate<HTMLFormElement>();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({ firstName, lastName, email, password });
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "We couldn’t create your account. Please try again.");
      if (!reduce && panel.current) animate(panel.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.45, ease: "easeOut" });
    } finally {
      setLoading(false);
    }
  }

  return (
    // Arrives through the "Get started" liquid transition, so its entrance always plays
    <AuthShell
      alwaysAnimate
      title="Create your account."
      subtitle={`Connect a repository and go live on ${PRODUCT_NAME} in minutes.`}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="inline-flex items-center py-3 text-link hover:underline underline-offset-2">
            Sign in
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </>
      }
    >
      <form ref={panel} onSubmit={onSubmit} className="rounded-2xl bg-white border border-black/[0.06] p-6 sm:p-8 space-y-3 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.12)]">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First name"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={loading}
            autoFocus
          />
          <Field
            label="Last name"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
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
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
        <FormError message={error} />
        <div className="pt-3">
          <SubmitButton loading={loading} loadingText="Creating account…">
            Create account
          </SubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}
