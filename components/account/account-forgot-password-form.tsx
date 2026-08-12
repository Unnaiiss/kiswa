"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { AccountAuthShell } from "./account-auth-shell";

const inputClass =
  "w-full rounded-md border border-kiswa-border bg-kiswa-surface-2 px-4 py-3 text-sm text-kiswa-ink placeholder:text-kiswa-ink-muted/50 outline-none transition-colors focus:border-kiswa-gold";

// Same generic message regardless of outcome — never reveals whether the
// email exists. See app/api/account/forgot-password/route.ts's own comment
// for the full rationale.
const GENERIC_MESSAGE =
  "If an account exists for that email, we've sent password reset instructions.";

export function AccountForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many attempts. Please try again in a few minutes.");
          setSubmitting(false);
          return;
        }
        setError("Please enter a valid email address.");
        setSubmitting(false);
        return;
      }

      // Fire the actual Firebase-hosted email send, but never let its
      // result (including a user-not-found error) change what we show.
      await sendPasswordResetEmail(auth, email.trim()).catch(() => {});
      setDone(true);
    } catch {
      // Network error reaching our own rate-limit route — still show the
      // generic message rather than leak anything via a differing error.
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountAuthShell
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one"
      footer={
        <p>
          <Link href="/account/login" className="text-kiswa-gold hover:text-kiswa-gold-soft">
            Back to sign in
          </Link>
        </p>
      }
    >
      {done ? (
        <p className="rounded-md border border-kiswa-gold/30 bg-kiswa-gold/5 px-4 py-4 text-sm text-kiswa-ink">
          {GENERIC_MESSAGE}
        </p>
      ) : (
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

          {error && (
            <p className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !email}
            className="mt-1 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Send reset link
          </button>
        </form>
      )}
    </AccountAuthShell>
  );
}
