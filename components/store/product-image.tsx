interface ProductImageProps {
  name: string;
  imageUrls: string[];
  index?: number;
  className?: string;
}

// No real photography yet (imageUrls is empty for the seeded catalog), so we
// fall back to a monogram treatment instead of a broken/generic placeholder
// icon. Swapping in real photos later just means populating imageUrls.
export function ProductImage({
  name,
  imageUrls,
  index = 0,
  className = "",
}: ProductImageProps) {
  const src = imageUrls[index];

  if (src) {
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
