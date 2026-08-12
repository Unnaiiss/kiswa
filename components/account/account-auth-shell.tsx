import Link from "next/link";

export function AccountAuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-kiswa-void px-6 py-16 text-kiswa-ink">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link
            href="/"
            className="font-display text-xl tracking-[0.3em] text-kiswa-ink transition-colors hover:text-kiswa-gold"
          >
            KISWA
          </Link>
          <div>
            <h1 className="font-display text-2xl text-kiswa-ink sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-kiswa-ink-muted">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-kiswa-border bg-kiswa-surface p-6 sm:p-8">
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-kiswa-ink-muted">{footer}</div>}
      </div>
    </main>
  );
}
