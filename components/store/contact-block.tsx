import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { buildGenericInquiryMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import type { StoreSiteSettings } from "@/lib/store/queries";
import { InstagramIcon } from "./instagram-icon";
import { FacebookIcon } from "./facebook-icon";
import { YoutubeIcon } from "./youtube-icon";

const ICON_BUTTON_CLASS =
  "cursor-pointer rounded-full border border-kiswa-border p-2.5 text-kiswa-ink-muted transition-colors hover:border-kiswa-gold/50 hover:text-kiswa-gold";

/** Just the WhatsApp/Instagram/Facebook/YouTube icon buttons — used inside
 * ContactBlock below and standalone by the mobile nav drawer, which doesn't
 * have room for the full address/email/phone block. */
export function SocialIconsRow({
  settings,
  size = "size-9",
}: {
  settings: StoreSiteSettings;
  size?: string;
}) {
  const buttonClass = `${ICON_BUTTON_CLASS} flex ${size} items-center justify-center`;
  return (
    <div className="flex items-center gap-3">
      <a
        href={buildWhatsAppUrl(buildGenericInquiryMessage(), settings.whatsappNumber)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className={buttonClass}
      >
        <MessageCircle size={18} />
      </a>
      {settings.instagramUrl && (
        <a
          href={settings.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow us on Instagram"
          className={buttonClass}
        >
          <InstagramIcon />
        </a>
      )}
      {settings.facebookUrl && (
        <a
          href={settings.facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow us on Facebook"
          className={buttonClass}
        >
          <FacebookIcon />
        </a>
      )}
      {settings.youtubeUrl && (
        <a
          href={settings.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Subscribe on YouTube"
          className={buttonClass}
        >
          <YoutubeIcon />
        </a>
      )}
    </div>
  );
}

/**
 * The address/social-icons/email-phone block shared verbatim by the real
 * footer and the admin Brand Settings form's live preview (same "single
 * source of truth for what it actually looks like" pattern as
 * AnnouncementBarVisual) — every field is independently optional and
 * renders nothing at all (no icon, no blank line, no href="#") when unset,
 * except WhatsApp, which always has a usable number (see getSiteSettings).
 */
export function ContactBlock({ settings }: { settings: StoreSiteSettings }) {
  const hasEmailOrPhone = settings.email || settings.phone;

  return (
    <div className="flex flex-col items-center gap-4">
      {settings.addressLine && (
        <p className="flex items-center gap-1.5 text-sm text-kiswa-ink-muted">
          <MapPin size={14} className="shrink-0 text-kiswa-gold-soft" />
          {settings.mapUrl ? (
            <a
              href={settings.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-kiswa-gold"
            >
              {settings.addressLine}
            </a>
          ) : (
            settings.addressLine
          )}
        </p>
      )}

      <SocialIconsRow settings={settings} />

      {hasEmailOrPhone && (
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm text-kiswa-ink-muted">
          {settings.email && (
            <a
              href={`mailto:${settings.email}`}
              className="flex items-center gap-1.5 transition-colors hover:text-kiswa-gold"
            >
              <Mail size={14} className="text-kiswa-gold-soft" />
              {settings.email}
            </a>
          )}
          {settings.phone && (
            <a
              href={`tel:${settings.phone}`}
              className="flex items-center gap-1.5 transition-colors hover:text-kiswa-gold"
            >
              <Phone size={14} className="text-kiswa-gold-soft" />
              {settings.phone}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
