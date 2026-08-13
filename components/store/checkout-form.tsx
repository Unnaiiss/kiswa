"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin, Plus, ShoppingBag, Star, Truck } from "lucide-react";
import { useCart } from "./cart-provider";
import { formatInr } from "@/lib/pricing";
import { INDIAN_STATES } from "@/lib/store/indian-states";
import {
  loadRazorpayCheckout,
  type RazorpayHandlerResponse,
  type RazorpayPaymentFailedResponse,
} from "@/lib/store/razorpay-checkout";
import { AddressForm } from "@/components/account/address-form";
import type { PlainAddress } from "@/components/account/address-list";

const PHONE_RE = /^[6-9][0-9]{9}$/;
const PINCODE_RE = /^[1-9][0-9]{5}$/;

interface GiftFormState {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

const EMPTY_GIFT_FORM: GiftFormState = {
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

function fieldError(errors: Partial<Record<keyof GiftFormState, string>>, key: keyof GiftFormState) {
  return errors[key] ? <p className="mt-1 text-xs text-red-400">{errors[key]}</p> : null;
}

function validateGiftAddress(form: GiftFormState): Partial<Record<keyof GiftFormState, string>> {
  const next: Partial<Record<keyof GiftFormState, string>> = {};
  if (!form.name.trim()) next.name = "Recipient name is required";
  if (!PHONE_RE.test(form.phone.trim())) next.phone = "Enter a valid 10-digit Indian mobile number";
  if (!form.line1.trim()) next.line1 = "Address line 1 is required";
  if (!form.city.trim()) next.city = "City is required";
  if (!form.state.trim()) next.state = "State is required";
  if (!PINCODE_RE.test(form.pincode.trim())) next.pincode = "Enter a valid 6-digit PIN code";
  return next;
}

/** Delivery-address section: pick one of the customer's saved addresses, or
 * add a new one inline (reusing the exact same AddressForm the account
 * pages use, so it's never a second, divergent implementation of "add an
 * address"). */
function AddressPicker({
  addresses,
  selectedId,
  onSelect,
  onAddressesChange,
}: {
  addresses: PlainAddress[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddressesChange: (addresses: PlainAddress[]) => void;
}) {
  const [adding, setAdding] = useState(addresses.length === 0);

  async function refetchAndSelectNewest() {
    const res = await fetch("/api/account/addresses");
    if (!res.ok) return;
    const data = await res.json();
    const next: PlainAddress[] = data.addresses ?? [];
    const previousIds = new Set(addresses.map((a) => a.id));
    const created = next.find((a) => !previousIds.has(a.id));
    onAddressesChange(next);
    onSelect(created?.id ?? next.find((a) => a.isDefault)?.id ?? next[0]?.id ?? "");
    setAdding(false);
  }

  if (adding) {
    return (
      <div className="flex flex-col gap-3">
        <AddressForm onSaved={refetchAndSelectNewest} onCancel={() => setAdding(false)} />
        {addresses.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="cursor-pointer self-start text-xs text-kiswa-ink-muted underline underline-offset-2 hover:text-kiswa-ink"
          >
            Choose a saved address instead
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {addresses.map((address) => {
        const active = address.id === selectedId;
        return (
          <button
            key={address.id}
            type="button"
            onClick={() => onSelect(address.id)}
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 text-left transition-colors ${
              active
                ? "border-kiswa-gold bg-kiswa-gold/5"
                : "border-kiswa-border bg-kiswa-surface hover:border-kiswa-gold/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <p className="font-medium text-kiswa-ink">{address.label}</p>
              {address.isDefault && (
                <span className="flex items-center gap-1 rounded-full bg-kiswa-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kiswa-gold">
                  <Star size={10} fill="currentColor" />
                  Default
                </span>
              )}
            </div>
            <p className="text-sm text-kiswa-ink-muted">
              {address.fullName} · +91 {address.phone}
            </p>
            <p className="text-sm text-kiswa-ink-muted">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.district},{" "}
              {address.state} — {address.pincode}
            </p>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-kiswa-border text-sm font-medium text-kiswa-ink-muted transition-colors hover:border-kiswa-gold/50 hover:text-kiswa-ink"
      >
        <Plus size={16} />
        Add a new address
      </button>
    </div>
  );
}

export function CheckoutForm({
  initialAddresses,
  codEnabled,
}: {
  initialAddresses: PlainAddress[];
  codEnabled: boolean;
}) {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();

  const [addresses, setAddresses] = useState(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    () => addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null,
  );
  const [addressError, setAddressError] = useState<string | null>(null);

  const hasGiftItems = useMemo(() => items.some((i) => i.gift), [items]);
  const [deliverToDifferentAddress, setDeliverToDifferentAddress] = useState(false);
  const [giftAddress, setGiftAddress] = useState<GiftFormState>(EMPTY_GIFT_FORM);
  const [giftErrors, setGiftErrors] = useState<Partial<Record<keyof GiftFormState, string>>>({});
  const [hidePrices, setHidePrices] = useState(true);

  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"idle" | "creating" | "paying" | "confirming">("idle");
  const [payingWith, setPayingWith] = useState<"razorpay" | "cod" | null>(null);

  function setGift<K extends keyof GiftFormState>(key: K, value: GiftFormState[K]) {
    setGiftAddress((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    let ok = true;
    if (!selectedAddressId) {
      setAddressError("Choose or add a delivery address");
      ok = false;
    } else {
      setAddressError(null);
    }

    if (hasGiftItems && deliverToDifferentAddress) {
      const giftNext = validateGiftAddress(giftAddress);
      setGiftErrors(giftNext);
      if (Object.keys(giftNext).length > 0) ok = false;
    } else {
      setGiftErrors({});
    }

    return ok;
  }

  function buildRequestBody() {
    return {
      items: items.map((i) =>
        i.combo
          ? {
              kind: "combo" as const,
              comboId: i.combo.comboId,
              qty: i.qty,
              selections: i.combo.selections,
            }
          : {
              kind: "product" as const,
              productId: i.productId,
              variantId: i.variantId,
              qty: i.qty,
              isGift: !!i.gift,
              giftRecipientName: i.gift?.recipientName || null,
              giftMessage: i.gift?.message || null,
              giftSenderName: i.gift?.senderName || null,
              giftWrap: i.gift?.giftWrap ?? false,
            },
      ),
      addressId: selectedAddressId,
      hidePrices: hasGiftItems ? hidePrices : false,
      giftShippingAddress:
        hasGiftItems && deliverToDifferentAddress
          ? {
              name: giftAddress.name.trim(),
              phone: giftAddress.phone.trim(),
              line1: giftAddress.line1.trim(),
              line2: giftAddress.line2.trim() || null,
              city: giftAddress.city.trim(),
              state: giftAddress.state.trim(),
              pincode: giftAddress.pincode.trim(),
              country: "India",
            }
          : null,
    };
  }

  async function reportPaymentEvent(orderId: string, event: "failed", response: RazorpayPaymentFailedResponse) {
    try {
      await fetch("/api/checkout/payment-failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: orderId,
          razorpayPaymentId: response.error?.metadata?.payment_id ?? null,
          reason: response.error?.description ?? event,
        }),
      });
    } catch {
      // Best-effort telemetry only — never blocks the customer's own retry.
    }
  }

  async function verifyPayment(response: RazorpayHandlerResponse, orderId: string, attempt = 0) {
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

  async function handlePayRazorpay() {
    setServerError(null);
    if (!validate() || items.length === 0) return;

    setSubmitting(true);
    setPayingWith("razorpay");
    setStage("creating");

    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
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
        setServerError("Couldn't load the payment gateway. Check your connection and try again.");
        setSubmitting(false);
        setStage("idle");
        return;
      }

      const selected = addresses.find((a) => a.id === selectedAddressId);
      setStage("paying");
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "KISWA",
        description: "Order payment",
        prefill: { name: selected?.fullName, contact: selected?.phone },
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
      rzp.on("payment.failed", (response) => {
        void reportPaymentEvent(data.orderId, "failed", response);
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

  async function handleCod() {
    setServerError(null);
    if (!validate() || items.length === 0) return;

    setSubmitting(true);
    setPayingWith("cod");
    try {
      const res = await fetch("/api/checkout/cod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      clear();
      router.push(`/checkout/success?saleId=${data.saleId}`);
    } catch {
      setServerError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (selectedAddressId && !addresses.some((a) => a.id === selectedAddressId)) {
      setSelectedAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null);
    }
  }, [addresses, selectedAddressId]);

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

  const razorpayLabel =
    payingWith === "razorpay" && stage === "creating"
      ? "Preparing your order…"
      : payingWith === "razorpay" && stage === "paying"
        ? "Waiting for payment…"
        : payingWith === "razorpay" && stage === "confirming"
          ? "Confirming payment…"
          : `Pay ${formatInr(subtotal)}`;

  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
      <div className="flex flex-col gap-8">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">Checkout</p>
          <h1 className="mt-3 font-display text-3xl text-kiswa-ink sm:text-4xl">
            Delivery address
          </h1>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-kiswa-ink-muted">
              <MapPin size={13} />
              Deliver to
            </p>
            <Link
              href="/account/addresses"
              target="_blank"
              className="text-xs text-kiswa-gold underline underline-offset-2 hover:text-kiswa-gold-soft"
            >
              Manage addresses
            </Link>
          </div>
          <AddressPicker
            addresses={addresses}
            selectedId={selectedAddressId}
            onSelect={setSelectedAddressId}
            onAddressesChange={setAddresses}
          />
          {addressError && <p className="mt-2 text-xs text-red-400">{addressError}</p>}
        </div>

        {hasGiftItems && (
          <div className="flex flex-col gap-4 rounded-lg border border-kiswa-gold/30 bg-kiswa-gold/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-kiswa-gold-soft">Gift options</p>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-kiswa-ink">
              <input
                type="checkbox"
                checked={deliverToDifferentAddress}
                onChange={(e) => setDeliverToDifferentAddress(e.target.checked)}
                className="mt-0.5 size-4 rounded border-kiswa-border bg-kiswa-surface-2 accent-kiswa-gold"
              />
              Deliver to a different address
            </label>

            {deliverToDifferentAddress && (
              <div className="flex flex-col gap-4 border-t border-kiswa-gold/20 pt-4">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
                    Full name
                  </label>
                  <input
                    className={inputClass}
                    value={giftAddress.name}
                    onChange={(e) => setGift("name", e.target.value)}
                    placeholder="Recipient's name"
                    autoComplete="name"
                  />
                  {fieldError(giftErrors, "name")}
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
                      value={giftAddress.phone}
                      onChange={(e) => setGift("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      inputMode="numeric"
                    />
                  </div>
                  {fieldError(giftErrors, "phone")}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
                    Address line 1
                  </label>
                  <input
                    className={inputClass}
                    value={giftAddress.line1}
                    onChange={(e) => setGift("line1", e.target.value)}
                    placeholder="Flat / house no., building, street"
                  />
                  {fieldError(giftErrors, "line1")}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
                    Address line 2 <span className="text-kiswa-ink-muted/90">(optional)</span>
                  </label>
                  <input
                    className={inputClass}
                    value={giftAddress.line2}
                    onChange={(e) => setGift("line2", e.target.value)}
                    placeholder="Landmark, area"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
                      City
                    </label>
                    <input
                      className={inputClass}
                      value={giftAddress.city}
                      onChange={(e) => setGift("city", e.target.value)}
                      placeholder="City"
                    />
                    {fieldError(giftErrors, "city")}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
                      PIN code
                    </label>
                    <input
                      className={inputClass}
                      value={giftAddress.pincode}
                      onChange={(e) => setGift("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="400001"
                      inputMode="numeric"
                    />
                    {fieldError(giftErrors, "pincode")}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
                    State
                  </label>
                  <select
                    className={inputClass}
                    value={giftAddress.state}
                    onChange={(e) => setGift("state", e.target.value)}
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {fieldError(giftErrors, "state")}
                </div>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-kiswa-ink">
              <input
                type="checkbox"
                checked={hidePrices}
                onChange={(e) => setHidePrices(e.target.checked)}
                className="mt-0.5 size-4 rounded border-kiswa-border bg-kiswa-surface-2 accent-kiswa-gold"
              />
              Hide prices in the package
            </label>
          </div>
        )}

        {serverError && (
          <p className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {serverError}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <motion.button
            type="button"
            onClick={handlePayRazorpay}
            disabled={submitting}
            whileTap={{ scale: 0.98 }}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold py-3.5 text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting && payingWith === "razorpay" && <Loader2 size={16} className="animate-spin" />}
            {razorpayLabel}
          </motion.button>
          <p className="text-center text-xs text-kiswa-ink-muted">
            UPI, cards, netbanking and wallets — securely processed by Razorpay.
          </p>

          {codEnabled && (
            <>
              <motion.button
                type="button"
                onClick={handleCod}
                disabled={submitting}
                whileTap={{ scale: 0.98 }}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-kiswa-border py-3.5 text-sm font-medium tracking-wide text-kiswa-ink transition-colors hover:border-kiswa-gold/50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting && payingWith === "cod" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Truck size={16} />
                )}
                Cash on Delivery
              </motion.button>
              <p className="text-center text-xs text-kiswa-ink-muted">
                Pay in cash (or UPI/card, if your courier supports it) when your order arrives.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="h-fit rounded-lg border border-kiswa-border bg-kiswa-surface p-6">
        <h2 className="font-display text-xl text-kiswa-ink">Order summary</h2>
        <ul className="mt-5 flex flex-col gap-4">
          {items.map((line) => (
            <li key={line.lineId} className="flex justify-between gap-4 text-sm">
              <div>
                <p className="text-kiswa-ink">
                  {line.productName}
                  {line.gift && (
                    <span className="ml-2 rounded-full bg-kiswa-gold/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-kiswa-gold uppercase">
                      Gift
                    </span>
                  )}
                </p>
                {line.combo ? (
                  <p className="text-kiswa-ink-muted">
                    {line.combo.components.map((c) => c.variantLabel).join(", ")} × {line.qty}
                  </p>
                ) : (
                  <p className="text-kiswa-ink-muted">
                    {line.variantLabel} × {line.qty}
                  </p>
                )}
                {line.gift && <p className="text-kiswa-ink-muted">For {line.gift.recipientName}</p>}
              </div>
              <p className="shrink-0 text-kiswa-ink">{formatInr(line.unitPrice * line.qty)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-between border-t border-kiswa-border pt-4">
          <span className="text-sm text-kiswa-ink-muted">Subtotal</span>
          <span className="text-sm text-kiswa-ink">{formatInr(subtotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display text-lg text-kiswa-ink">Total</span>
          <span className="font-display text-lg text-kiswa-gold">{formatInr(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}
