"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { INDIAN_STATES } from "@/lib/store/indian-states";
import { addressFieldErrors } from "@/lib/auth/customerValidation";
import type { PlainAddress } from "./address-list";

const inputClass =
  "w-full rounded-md border border-kiswa-border bg-kiswa-surface-2 px-4 py-2.5 text-sm text-kiswa-ink placeholder:text-kiswa-ink-muted/50 outline-none transition-colors focus:border-kiswa-gold";

interface FormState {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark: string;
  isDefault: boolean;
}

function toFormState(address?: PlainAddress): FormState {
  return {
    label: address?.label ?? "",
    fullName: address?.fullName ?? "",
    phone: address?.phone ?? "",
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? "",
    city: address?.city ?? "",
    district: address?.district ?? "",
    state: address?.state ?? "",
    pincode: address?.pincode ?? "",
    landmark: address?.landmark ?? "",
    isDefault: address?.isDefault ?? false,
  };
}

function fieldError(errors: Record<string, string>, key: string) {
  return errors[key] ? <p className="mt-1 text-xs text-red-400">{errors[key]}</p> : null;
}

export function AddressForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing?: PlainAddress;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(toFormState(editing));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const nextErrors = addressFieldErrors(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const body = {
        label: form.label.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim() || null,
        city: form.city.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        landmark: form.landmark.trim() || null,
        isDefault: form.isDefault,
      };
      const res = await fetch(editing ? `/api/account/addresses/${editing.id}` : "/api/account/addresses", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setServerError(data.error ?? "Couldn't save this address. Please try again.");
        return;
      }
      onSaved();
    } catch {
      setServerError("Couldn't save this address. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-kiswa-border bg-kiswa-surface p-5 sm:p-6"
      noValidate
    >
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">Label</label>
        <div className="mb-2 flex gap-2">
          {["Home", "Office"].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => set("label", preset)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                form.label === preset
                  ? "border-kiswa-gold bg-kiswa-gold/10 text-kiswa-gold"
                  : "border-kiswa-border text-kiswa-ink-muted hover:text-kiswa-ink"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <input
          className={inputClass}
          value={form.label}
          onChange={(e) => set("label", e.target.value)}
          placeholder="Home, Office, or a custom label"
        />
        {fieldError(errors, "label")}
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">Full name</label>
        <input
          className={inputClass}
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          placeholder="Recipient's name"
          autoComplete="name"
        />
        {fieldError(errors, "fullName")}
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
          Mobile number
        </label>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-kiswa-border bg-kiswa-surface-2 px-3 py-2.5 text-sm text-kiswa-ink-muted">
            +91
          </span>
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="98765 43210"
            inputMode="numeric"
            autoComplete="tel-national"
          />
        </div>
        {fieldError(errors, "phone")}
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
          Address line 1
        </label>
        <input
          className={inputClass}
          value={form.line1}
          onChange={(e) => set("line1", e.target.value)}
          placeholder="Flat / house no., building, street"
          autoComplete="address-line1"
        />
        {fieldError(errors, "line1")}
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
          Address line 2 <span className="text-kiswa-ink-muted/60">(optional)</span>
        </label>
        <input
          className={inputClass}
          value={form.line2}
          onChange={(e) => set("line2", e.target.value)}
          placeholder="Area"
          autoComplete="address-line2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">City</label>
          <input
            className={inputClass}
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="City"
            autoComplete="address-level2"
          />
          {fieldError(errors, "city")}
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">District</label>
          <input
            className={inputClass}
            value={form.district}
            onChange={(e) => set("district", e.target.value)}
            placeholder="District"
          />
          {fieldError(errors, "district")}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            PIN code
          </label>
          <input
            className={inputClass}
            value={form.pincode}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="400001"
            inputMode="numeric"
            autoComplete="postal-code"
          />
          {fieldError(errors, "pincode")}
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">State</label>
          <select
            className={inputClass}
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            autoComplete="address-level1"
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {fieldError(errors, "state")}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
          Landmark <span className="text-kiswa-ink-muted/60">(optional)</span>
        </label>
        <input
          className={inputClass}
          value={form.landmark}
          onChange={(e) => set("landmark", e.target.value)}
          placeholder="Nearby landmark"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-kiswa-ink-muted">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => set("isDefault", e.target.checked)}
          className="mt-0.5 size-4 rounded border-kiswa-border bg-kiswa-surface-2 accent-kiswa-gold"
        />
        Set as default address
      </label>

      {serverError && (
        <p className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {serverError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-8"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {editing ? "Save changes" : "Add address"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex h-11 cursor-pointer items-center justify-center rounded-full border border-kiswa-border px-6 text-sm font-medium text-kiswa-ink-muted transition-colors hover:text-kiswa-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
