"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { establishCustomerSession } from "@/lib/auth/customerSession";
import { sanitizeRedirect } from "@/lib/auth/safeRedirect";
import { GoogleSignInButton } from "./google-signin-button";
import { AccountAuthShell } from "./account-auth-shell";

const inputClass =
  "w-full rounded-md border border-kiswa-border bg-kiswa-surface-2 px-4 py-3 text-sm text-kiswa-ink placeholder:text-kiswa-ink-muted/50 outline-none transition-colors focus:border-kiswa-gold";

function signupHref(redirectParam?: string) {
  return redirectParam
    ? `/account/signup?redirect=${encodeURIComponent(redirectParam)}`
    : "/account/signup";
}

export function AccountLoginForm({ redirectParam }: { redirectParam?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken();
      await establishCustomerSession(idToken);
      router.push(sanitizeRedirect(redirectParam, "/"));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("This account is for staff")
          ? err.message
          : "Incorrect email or password.",
      );
      setSubmitting(false);
    }
  }

  return (
    <AccountAuthShell
      title="Welcome back"
      subtitle="Sign in to your KISWA account"
      footer={
        <p>
          New here?{" "}
          <Link href={signupHref(redirectParam)} className="text-kiswa-gold hover:text-kiswa-gold-soft">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            Email
          </label>
          <input
            type="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs uppercase tracking-wide text-kiswa-ink-muted">
              Password
            </label>
            <Link
              href="/account/forgot-password"
              className="text-xs text-kiswa-gold hover:text-kiswa-gold-soft"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !email || !password}
          className="mt-1 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Sign in
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-kiswa-border" />
        <span className="text-xs uppercase tracking-wide text-kiswa-ink-muted">or</span>
        <div className="h-px flex-1 bg-kiswa-border" />
      </div>

      <GoogleSignInButton redirectParam={redirectParam} />
    </AccountAuthShell>
  );
}
