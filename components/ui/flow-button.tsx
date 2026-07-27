"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface FlowButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function FlowButton({ href, children, className = "" }: FlowButtonProps) {
  return (
    <Link
      href={href}
      className={`group relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-full border border-kiswa-gold/50 px-8 py-3 text-sm tracking-wide text-kiswa-gold transition-colors duration-300 hover:text-kiswa-void ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-[110%] bg-gradient-to-r from-kiswa-gold-dim via-kiswa-gold to-kiswa-gold-soft transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0"
      />
      <span className="relative">{children}</span>
      <ArrowRight
        size={16}
        className="relative transition-transform duration-300 ease-out group-hover:translate-x-1"
      />
    </Link>
  );
}
