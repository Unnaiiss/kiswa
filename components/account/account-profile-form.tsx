"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { customerLogout } from "@/lib/auth/customerSession";

const inputClass =
  "w-full rounded-md border border-kiswa-border bg-kiswa-surface-2 px-4 py-2.5 text-sm text-kiswa-ink placeholder:text-kiswa-ink-muted/50 outline-none transition-colors focus:border-kiswa-gold";

export function AccountProfileForm({
  email,
  initialName,
  initialPhone,
  initialMarketingOptIn,
}: {
  email: string;
  initialName: string;
  initialPhone: string;
  initialMarketingOptIn: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          marketingOptIn,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't save your changes. Please try again.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await customerLogout();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            Email
          </label>
          <input
            className={`${inputClass} cursor-not-allowed opacity-60`}
            value={email}
            disabled
            readOnly
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            Full name
          </label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            Phone
          </label>
          <input
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="98765 43210"
          />
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
        {saved && !error && (
          <p className="rounded-md border border-kiswa-gold/30 bg-kiswa-gold/5 px-4 py-3 text-sm text-kiswa-ink">
            Changes saved.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="mt-1 flex h-11 w-fit cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold px-6 text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Save changes
        </button>
      </form>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex h-11 w-fit cursor-pointer items-center justify-center gap-2 rounded-full border border-kiswa-border px-6 text-sm font-medium text-kiswa-ink-muted transition-colors hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
        Log out
      </button>
    </div>
  );
}
