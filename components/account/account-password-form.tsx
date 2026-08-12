"use client";

import { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { passwordPolicyError } from "@/lib/auth/customerValidation";

const inputClass =
  "w-full rounded-md border border-kiswa-border bg-kiswa-surface-2 px-4 py-2.5 text-sm text-kiswa-ink placeholder:text-kiswa-ink-muted/50 outline-none transition-colors focus:border-kiswa-gold";

/** Only rendered meaningfully once Firebase Auth has restored the current
 * user client-side (useAuthReady) — auth.currentUser is null synchronously
 * on first paint even for an already-logged-in customer, and this decides
 * its entire UI (password form vs. Google-account message) from
 * currentUser.providerData, so it must wait rather than flash the wrong
 * state. */
export function AccountPasswordForm() {
  const ready = useAuthReady();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!ready) return null;

  const user = auth.currentUser;
  const hasPasswordProvider = user?.providerData.some((p) => p.providerId === "password") ?? false;

  if (!hasPasswordProvider) {
    return (
      <div className="rounded-lg border border-kiswa-border bg-kiswa-surface p-6 sm:p-8">
        <h2 className="font-display text-xl text-kiswa-ink">Password</h2>
        <p className="mt-2 text-sm text-kiswa-ink-muted">
          You signed in with Google, so there&apos;s no separate KISWA password — manage your
          sign-in through your Google Account instead.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (!user?.email) return;

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      const code = err instanceof Error && "code" in err ? (err as { code: string }).code : "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Current password is incorrect.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Couldn't update your password. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-kiswa-border bg-kiswa-surface p-6 sm:p-8">
      <h2 className="font-display text-xl text-kiswa-ink">Password</h2>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            Current password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            New password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            placeholder="At least 8 characters"
          />
          <p className="mt-1.5 text-xs text-kiswa-ink-muted">
            At least 8 characters, with a letter and a number.
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {success && !error && (
          <p className="rounded-md border border-kiswa-gold/30 bg-kiswa-gold/5 px-4 py-3 text-sm text-kiswa-ink">
            Password updated.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !currentPassword || !newPassword}
          className="mt-1 flex h-11 w-fit cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold px-6 text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Update password
        </button>
      </form>
    </div>
  );
}
