"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { Loader2, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { establishSession } from "@/lib/auth/session";

function destinationForRole(role: string, redirectParam?: string): string {
  if (role === "admin") {
    return redirectParam?.startsWith("/admin") ? redirectParam : "/admin";
  }
  return redirectParam?.startsWith("/pos") ? redirectParam : "/pos";
}

export function LoginForm({ redirectParam }: { redirectParam?: string }) {
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
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const tokenResult = await credential.user.getIdTokenResult(true);
      const role = tokenResult.claims.role;
      if (role !== "admin" && role !== "staff") {
        await signOut(auth);
        setError("This account isn't authorized for staff or admin access.");
        setSubmitting(false);
        return;
      }

      const idToken = await credential.user.getIdToken();
      await establishSession(idToken);
      router.push(destinationForRole(role, redirectParam));
      router.refresh();
    } catch {
      setError("Incorrect email or password.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-zinc-900">
            <ShieldCheck className="text-amber-400" size={24} />
          </div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-400">
            Kiswa
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Email
            </label>
            <input
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-lg text-zinc-50 outline-none focus:border-amber-400"
              placeholder="you@kiswa.in"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-lg text-zinc-50 outline-none focus:border-amber-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="mt-2 flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 text-base font-semibold text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
