"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { AddressForm } from "./address-form";
import type { Address } from "@/lib/firestore/types";

export type PlainAddress = Omit<Address, "createdAt" | "updatedAt">;

type FormMode = "closed" | "add" | { edit: PlainAddress };

export function AddressList({ initialAddresses }: { initialAddresses: PlainAddress[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [mode, setMode] = useState<FormMode>("closed");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // The list owns its own data and re-fetches after every mutation rather
  // than depending on router.refresh() to repropagate fresh server-component
  // props back down into this client tree — simpler to reason about and
  // doesn't depend on RSC-refresh timing.
  async function refetch() {
    const res = await fetch("/api/account/addresses");
    if (res.ok) {
      const data = await res.json();
      setAddresses(data.addresses ?? []);
    }
  }

  async function closeAndRefresh() {
    setMode("closed");
    await refetch();
  }

  async function handleDelete(address: PlainAddress) {
    if (!window.confirm(`Delete the "${address.label}" address?`)) return;
    setDeletingId(address.id);
    try {
      await fetch(`/api/account/addresses/${address.id}`, { method: "DELETE" });
      await refetch();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(address: PlainAddress) {
    await fetch(`/api/account/addresses/${address.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    await refetch();
  }

  if (mode === "add") {
    return <AddressForm onSaved={closeAndRefresh} onCancel={() => setMode("closed")} />;
  }
  if (typeof mode === "object") {
    return <AddressForm editing={mode.edit} onSaved={closeAndRefresh} onCancel={() => setMode("closed")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-kiswa-border bg-kiswa-surface px-6 py-16 text-center">
          <MapPin className="text-kiswa-ink-muted" size={40} />
          <div>
            <p className="text-kiswa-ink">No saved addresses yet</p>
            <p className="mt-1 text-sm text-kiswa-ink-muted">
              Save a delivery address to check out faster next time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMode("add")}
            className="mt-2 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold px-6 text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft"
          >
            <Plus size={16} />
            Add your first address
          </button>
        </div>
      ) : (
        <>
          {addresses.map((address) => (
            <div
              key={address.id}
              className="flex flex-col gap-3 rounded-lg border border-kiswa-border bg-kiswa-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-kiswa-ink">{address.label}</p>
                  {address.isDefault && (
                    <span className="flex items-center gap-1 rounded-full bg-kiswa-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kiswa-gold">
                      <Star size={10} fill="currentColor" />
                      Default
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setMode({ edit: address })}
                    aria-label={`Edit ${address.label}`}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full text-kiswa-ink-muted transition-colors hover:bg-kiswa-surface-2 hover:text-kiswa-ink"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(address)}
                    disabled={deletingId === address.id}
                    aria-label={`Delete ${address.label}`}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full text-kiswa-ink-muted transition-colors hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="text-sm text-kiswa-ink-muted">
                <p className="text-kiswa-ink">{address.fullName}</p>
                <p>{address.line1}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>
                  {address.city}, {address.district}, {address.state} — {address.pincode}
                </p>
                {address.landmark && <p>Landmark: {address.landmark}</p>}
                <p className="mt-1">+91 {address.phone}</p>
              </div>

              {!address.isDefault && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(address)}
                  className="w-fit cursor-pointer text-xs font-medium text-kiswa-gold underline underline-offset-4 hover:text-kiswa-gold-soft"
                >
                  Set as default
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setMode("add")}
            className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-kiswa-border text-sm font-medium text-kiswa-ink-muted transition-colors hover:border-kiswa-gold/50 hover:text-kiswa-ink"
          >
            <Plus size={16} />
            Add a new address
          </button>
        </>
      )}
    </div>
  );
}
