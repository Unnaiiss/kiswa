"use client";

import { motion, type Variants } from "framer-motion";

const word: Variants = {
  hidden: { opacity: 0, y: "0.7em" },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
};

function containerVariants(delay: number): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: delay } },
  };
}

interface RevealTextProps {
  text: string;
  className?: string;
  /** Extra delay (seconds) before this instance's words start revealing —
   * lets multiple RevealText lines cascade in sequence. */
  delay?: number;
  as?: "h1" | "h2";
}

// Reveals a heading word-by-word (masked slide-up) the first time it scrolls
// into view. Each word sits in its own overflow-hidden span so the motion
// span can translate from below without the whole line jumping.
export function RevealText({
  text,
  className = "",
  delay = 0,
  as = "h2",
}: RevealTextProps) {
  const words = text.split(" ");
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={containerVariants(delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
          <motion.span variants={word} className="inline-block">
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}
