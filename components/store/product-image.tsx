import Image from "next/image";

interface ProductImageProps {
  name: string;
  imageUrls: string[];
  index?: number;
  className?: string;
  /** Passed straight through to next/image's `sizes` — tune per call site
   * to the image's actual rendered width (a 40px admin-table thumbnail and
   * a full-width gallery hero shouldn't share a default). */
  sizes?: string;
}

// No real photography yet (imageUrls is empty for the seeded catalog), so we
// fall back to a monogram treatment instead of a broken/generic placeholder
// icon. Swapping in real photos later just means populating imageUrls.
export function ProductImage({
  name,
  imageUrls,
  index = 0,
  className = "",
  sizes = "(max-width: 768px) 50vw, 25vw",
}: ProductImageProps) {
  const src = imageUrls[index];

  if (src) {
    // Only our own uploaded images go through next/image's optimizer — same-
    // origin "/products/..." paths (legacy local-filesystem uploads, if any
    // remain) or our own Firebase Storage bucket's download-URL prefix (see
    // lib/server/imageStorage.ts), which is the only external host
    // allowlisted in next.config.ts's images.remotePatterns. A supplier-
    // pasted external URL is never allowlisted — that would let the image
    // optimizer fetch any URL an admin pastes in, an SSRF-adjacent surface
    // with no real benefit over just linking the original file directly.
    // This caller (parent has position:relative and a defined size — see
    // each call site) makes `fill` mode correct.
    if (src.startsWith("/") || src.startsWith("https://firebasestorage.googleapis.com/")) {
      return (
        <Image
          src={src}
          alt={name}
          fill
          sizes={sizes}
          className={`object-cover ${className}`}
        />
      );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`object-cover ${className}`} />;
  }

  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,var(--color-kiswa-surface-2),var(--color-kiswa-void))] ${className}`}
    >
      <div className="absolute inset-4 rounded-full border border-kiswa-gold/20" />
      <span className="font-display text-6xl text-kiswa-gold/70">
        {initial}
      </span>
    </div>
  );
}
