"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";
import { formatInr } from "@/lib/pricing";
import { INDIAN_STATES } from "@/lib/store/indian-states";
import {
  loadRazorpayCheckout,
  type RazorpayHandlerResponse,
} from "@/lib/store/razorpay-checkout";

const PHONE_RE = /^[6-9][0-9]{9}$/;
const PINCODE_RE = /^[1-9][0-9]{5}$/;

interface FormState {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};

const inputClass =
  "w-full rounded-md border border-kiswa-border bg-kiswa-surface-2 px-4 py-2.5 text-sm text-kiswa-ink placeholder:text-kiswa-ink-muted/50 outline-none transition-colors focus:border-kiswa-gold";

function fieldError(errors: Partial<Record<keyof FormState, string>>, key: keyof FormState) {
  return errors[key] ? (
    <p className="mt-1 text-xs text-red-400">{errors[key]}</p>
  ) : null;
}

export function CheckoutForm() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"idle" | "creating" | "paying" | "confirming">("idle");

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!PHONE_RE.test(form.phone.trim()))
      next.phone = "Enter a valid 10-digit Indian mobile number";
    if (!form.line1.trim()) next.line1 = "Address line 1 is required";
    if (!form.city.trim()) next.city = "City is required";
    if (!form.state.trim()) next.state = "State is required";
    if (!PINCODE_RE.test(form.pincode.trim()))
      next.pincode = "Enter a valid 6-digit PIN code";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function verifyPayment(
    response: RazorpayHandlerResponse,
    orderId: string,
    attempt = 0,
  ) {
    setStage("confirming");
    try {
      const res = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 202 && data.retry && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return verifyPayment(response, orderId, attempt + 1);
      }

      if (!res.ok || !data.ok) {
        setServerError(
          `We received your payment but couldn't confirm it automatically. Please contact support with order ID ${orderId} — we'll sort it out.`,
        );
        setSubmitting(false);
        setStage("idle");
        return;
      }

      clear();
      const params = new URLSearchParams({ orderId });
      router.push(`/checkout/success?${params.toString()}`);
    } catch {
      setServerError(
        `Network error while confirming your payment. Please contact support with order ID ${orderId}.`,
      );
      setSubmitting(false);
      setStage("idle");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate() || items.length === 0) return;

    setSubmitting(true);
    setStage("creating");

    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            qty: i.qty,
          })),
          customerName: form.name.trim(),
          customerPhone: form.phone.trim(),
          shippingAddress: {
            line1: form.line1.trim(),
            line2: form.line2.trim() || null,
            city: form.city.trim(),
            state: form.state.trim(),
            pincode: form.pincode.trim(),
            country: "India",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        setStage("idle");
        return;
      }

      const loaded = await loadRazorpayCheckout();
      if (!loaded || !window.Razorpay) {
        setServerError(
          "Couldn't load the payment gateway. Check your connection and try again.",
        );
        setSubmitting(false);
        setStage("idle");
        return;
      }

      setStage("paying");
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "KISWA",
        description: "Order payment",
        prefill: { name: form.name.trim(), contact: form.phone.trim() },
        theme: { color: "#d4af37" },
        handler: (response) => {
          void verifyPayment(response, data.orderId);
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setStage("idle");
          },
        },
      });
      rzp.on("payment.failed", () => {
        setServerError("Payment failed. Please try again.");
        setSubmitting(false);
        setStage("idle");
      });
      rzp.open();
    } catch {
      setServerError("Something went wrong. Please try again.");
      setSubmitting(false);
      setStage("idle");
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-32 text-center">
        <ShoppingBag className="text-kiswa-ink-muted" size={40} />
        <p className="text-kiswa-ink-muted">Your bag is empty.</p>
        <Link
          href="/shop"
          className="cursor-pointer text-sm font-medium tracking-wide text-kiswa-gold underline underline-offset-4 hover:text-kiswa-gold-soft"
        >
          Explore the collection
        </Link>
      </div>
    );
  }

  const buttonLabel =
    stage === "creating"
      ? "Preparing your order…"
      : stage === "paying"
        ? "Waiting for payment…"
        : stage === "confirming"
          ? "Confirming payment…"
          : `Pay ${formatInr(subtotal)}`;

  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
            Checkout
          </p>
          <h1 className="mt-3 font-display text-3xl text-kiswa-ink sm:text-4xl">
            Delivery details
          </h1>
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            Full name
          </label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
          {fieldError(errors, "name")}
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
            placeholder="Landmark, area"
            autoComplete="address-line2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
              City
            </label>
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
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            State
          </label>
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

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
            Country
          </label>
          <input
            className={`${inputClass} cursor-not-allowed opacity-60`}
            value="India"
            disabled
            readOnly
          />
        </div>

        {serverError && (
          <p className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {serverError}
          </p>
        )}

        <motion.button
          type="submit"
          disabled={submitting}
          whileTap={{ scale: 0.98 }}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold py-3.5 text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {buttonLabel}
        </motion.button>
        <p className="text-center text-xs text-kiswa-ink-muted">
          Payments are securely processed by Razorpay.
        </p>
      </form>

      <div className="h-fit rounded-lg border border-kiswa-border bg-kiswa-surface p-6">
        <h2 className="font-display text-xl text-kiswa-ink">Order summary</h2>
        <ul className="mt-5 flex flex-col gap-4">
          {items.map((line) => (
            <li
              key={`${line.productId}-${line.variantId}`}
              className="flex justify-between gap-4 text-sm"
            >
              <div>
                <p className="text-kiswa-ink">{line.productName}</p>
                <p className="text-kiswa-ink-muted">
                  {line.variantLabel} × {line.qty}
                </p>
              </div>
              <p className="shrink-0 text-kiswa-ink">
                {formatInr(line.unitPrice * line.qty)}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-between border-t border-kiswa-border pt-4">
          <span className="text-sm text-kiswa-ink-muted">Subtotal</span>
          <span className="text-sm text-kiswa-ink">{formatInr(subtotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display text-lg text-kiswa-ink">Total</span>
          <span className="font-display text-lg text-kiswa-gold">
            {formatInr(subtotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
