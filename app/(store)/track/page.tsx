import type { Metadata } from "next";
import { TrackForm } from "@/components/store/track-form";

export const metadata: Metadata = {
  title: "Track your order",
};

export default function TrackPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 py-16 sm:py-20">
      <p className="text-xs tracking-[0.4em] text-kiswa-gold-soft uppercase">Track order</p>
      <h1 className="mt-3 text-center font-display text-3xl text-kiswa-ink sm:text-4xl">
        Where&apos;s my order?
      </h1>
      <p className="mt-3 mb-10 text-center text-sm text-kiswa-ink-muted">
        Enter your invoice number and the phone number used to place the order to see its
        delivery status.
      </p>
      <TrackForm />
    </main>
  );
}
