"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendEmailVerification } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { signupCustomer } from "@/lib/auth/customerSession";
import { sanitizeRedirect } from "@/lib/auth/safeRedirect";
import { passwordPolicyError } from "@/lib/auth/customerValidation";
import { GoogleSignInButton } from "./google-signin-button";
import { AccountAuthShell } from "./account-auth-shell";

const inputClass =
  "w-full rounded-md border border-kiswa-border bg-kiswa-surface-2 px-4 py-3 text-sm text-kiswa-ink placeholder:text-kiswa-ink-muted/50 outline-none transition-colors focus:border-kiswa-gold";

function loginHref(redirectParam?: string) {
  return redirectParam
    ? `/account/login?redirect=${encodeURIComponent(redirectParam)}`
    : "/account/login";
}

export function AccountSignupForm({ redirectParam }: { redirectParam?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    const passwordError = passwordPolicyError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setSubmitting(true);
    try {
      await signupCustomer({
        email: email.trim(),
        password,
        name: name.trim(),
        phone: phone.trim() || null,
        marketingOptIn,
      });
      if (auth.currentUser) void sendEmailVerification(auth.currentUser).catch(() => {});
      router.push(sanitizeRedirect(redirectParam, "/"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your account. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <AccountAuthShell
      title="Create your account"
      subtitle="Join KISWA for a faster, saved checkout"
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href={loginHref(redirectParam)}
            className="text-kiswa-gold underline underline-offset-2 hover:text-kiswa-gold-soft"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            Full name
          </label>
          <input
            autoComplete="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            Email
          </label>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            Phone <span className="text-kiswa-ink-muted/90">(optional)</span>
          </label>
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="98765 43210"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            Password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="At least 8 characters"
          />
          <p className="mt-1.5 text-xs text-kiswa-ink-muted">
            At least 8 characters, with a letter and a number.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-kiswa-ink-muted">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="mt-0.5 size-4 rounded border-kiswa-border bg-kiswa-surface-2 accent-kiswa-gold"
          />
          Send me offers and new-arrival updates
        </label>

        {error && (
          <p className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !name || !email || !password}
          className="mt-1 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Create account
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
