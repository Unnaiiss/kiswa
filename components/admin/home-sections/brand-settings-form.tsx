"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/apiClient";
import { ContactBlock } from "@/components/store/contact-block";
import type { SiteSettings } from "@/lib/firestore/types";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Known tracking query params to flag on pasted social/contact URLs — we
// only strip these specific keys (never the whole query string), so a link
// that legitimately needs a query param is left alone.
const TRACKING_PARAM_RE =
  /^(utm_|igshid$|igsh$|fbclid$|gclid$|mc_cid$|mc_eid$|si$|ref$|ref_src$|spm$|_ga$)/i;

function findTrackingParams(url: string): string[] {
  try {
    const parsed = new URL(url);
    return Array.from(parsed.searchParams.keys()).filter((key) => TRACKING_PARAM_RE.test(key));
  } catch {
    return [];
  }
}

function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAM_RE.test(key)) parsed.searchParams.delete(key);
    }
    const query = parsed.searchParams.toString();
    return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return url;
  }
}

interface UrlFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

function UrlField({ label, placeholder, value, onChange }: UrlFieldProps) {
  const trackingParams = findTrackingParams(value);
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
        {label} <span className="text-zinc-600">(optional)</span>
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder={placeholder} />
      {trackingParams.length > 0 && (
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-amber-400">
          Contains tracking parameters ({trackingParams.join(", ")}).
          <button
            type="button"
            onClick={() => onChange(stripTrackingParams(value))}
            className="cursor-pointer rounded-full border border-amber-400/40 px-2 py-0.5 text-amber-300 hover:border-amber-400"
          >
            Strip them
          </button>
        </p>
      )}
    </div>
  );
}

export function BrandSettingsForm({ siteSettings }: { siteSettings: SiteSettings | null }) {
  const [brandName, setBrandName] = useState(siteSettings?.brandName ?? "");
  const [tagline, setTagline] = useState(siteSettings?.tagline ?? "");
  const [shortDescription, setShortDescription] = useState(siteSettings?.shortDescription ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(siteSettings?.whatsappNumber ?? "");
  const [instagramUrl, setInstagramUrl] = useState(siteSettings?.instagramUrl ?? "");
  const [facebookUrl, setFacebookUrl] = useState(siteSettings?.facebookUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(siteSettings?.youtubeUrl ?? "");
  const [email, setEmail] = useState(siteSettings?.email ?? "");
  const [phone, setPhone] = useState(siteSettings?.phone ?? "");
  const [addressLine, setAddressLine] = useState(siteSettings?.addressLine ?? "");
  const [mapUrl, setMapUrl] = useState(siteSettings?.mapUrl ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBrandName(siteSettings?.brandName ?? "");
    setTagline(siteSettings?.tagline ?? "");
    setShortDescription(siteSettings?.shortDescription ?? "");
    setWhatsappNumber(siteSettings?.whatsappNumber ?? "");
    setInstagramUrl(siteSettings?.instagramUrl ?? "");
    setFacebookUrl(siteSettings?.facebookUrl ?? "");
    setYoutubeUrl(siteSettings?.youtubeUrl ?? "");
    setEmail(siteSettings?.email ?? "");
    setPhone(siteSettings?.phone ?? "");
    setAddressLine(siteSettings?.addressLine ?? "");
    setMapUrl(siteSettings?.mapUrl ?? "");
  }, [siteSettings]);

  const previewSettings = {
    brandName: brandName || "KISWA",
    tagline,
    shortDescription,
    whatsappNumber: whatsappNumber || "919995778963",
    instagramUrl: instagramUrl.trim() || null,
    facebookUrl: facebookUrl.trim() || null,
    youtubeUrl: youtubeUrl.trim() || null,
    email: email.trim() || null,
    phone: phone.trim() || null,
    addressLine: addressLine.trim() || null,
    mapUrl: mapUrl.trim() || null,
  };

  function isValidHttpsUrl(value: string) {
    return value === "" || /^https:\/\//i.test(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!brandName.trim()) {
      setError("Brand name is required.");
      return;
    }
    if (!tagline.trim()) {
      setError("Tagline is required.");
      return;
    }
    if (!shortDescription.trim()) {
      setError("Short description is required.");
      return;
    }
    if (!/^\d{10,15}$/.test(whatsappNumber.trim())) {
      setError("WhatsApp number must be digits only, with country code and no +, e.g. 919995778963.");
      return;
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    for (const [label, value] of [
      ["Instagram URL", instagramUrl],
      ["Facebook URL", facebookUrl],
      ["YouTube URL", youtubeUrl],
      ["Map URL", mapUrl],
    ] as const) {
      if (!isValidHttpsUrl(value.trim())) {
        setError(`${label} must be a full https:// URL.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await adminFetch("/api/admin/site-content/site-settings", {
        method: "PATCH",
        body: JSON.stringify({
          brandName: brandName.trim(),
          tagline: tagline.trim(),
          shortDescription: shortDescription.trim(),
          whatsappNumber: whatsappNumber.trim(),
          instagramUrl: instagramUrl.trim(),
          facebookUrl: facebookUrl.trim(),
          youtubeUrl: youtubeUrl.trim(),
          mapUrl: mapUrl.trim(),
          email: email.trim(),
          phone: phone.trim(),
          addressLine: addressLine.trim(),
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-2xl flex-col gap-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">Brand Settings</h2>
        <p className="mt-1 text-sm text-zinc-500">
          The single source of truth for brand identity and every social/contact link on the
          site — footer, mobile menu, floating WhatsApp button, page metadata, and structured
          data.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Brand name
          </label>
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} className={inputClass} placeholder="KISWA" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Tagline
          </label>
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} placeholder="Pure Attar · Fine Perfume Sprays" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
          Short description
        </label>
        <textarea
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="Handcrafted attar oils and the fine perfume sprays distilled from them."
        />
        <p className="mt-1 text-xs text-zinc-500">
          Used for the site&apos;s meta description and social share previews.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
          WhatsApp number
        </label>
        <input
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          className={inputClass}
          placeholder="919995778963"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Digits only, with country code, no +. Powers every WhatsApp link on the site.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <UrlField label="Instagram URL" placeholder="https://www.instagram.com/kiswaprfms" value={instagramUrl} onChange={setInstagramUrl} />
        <UrlField label="Facebook URL" placeholder="https://facebook.com/…" value={facebookUrl} onChange={setFacebookUrl} />
        <UrlField label="YouTube URL" placeholder="https://youtube.com/@…" value={youtubeUrl} onChange={setYoutubeUrl} />
        <UrlField label="Map URL" placeholder="https://maps.google.com/…" value={mapUrl} onChange={setMapUrl} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Email <span className="text-zinc-600">(optional)</span>
          </label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="kiswaprfms@gmail.com" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Phone <span className="text-zinc-600">(optional)</span>
          </label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+91…" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
          Address <span className="text-zinc-600">(optional)</span>
        </label>
        <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} className={inputClass} placeholder="Ponoor, Kerala" />
        <p className="mt-1 text-xs text-zinc-500">
          Becomes a clickable link to the Map URL above when both are set.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
          Live preview — footer contact block
        </label>
        <div className="rounded-lg border border-kiswa-border bg-kiswa-void p-6">
          <ContactBlock settings={previewSettings} />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-green-400">Saved.</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
