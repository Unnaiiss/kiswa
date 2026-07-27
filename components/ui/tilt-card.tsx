"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
}

// 3D pointer-tilt wrapper. Only listens to pointer movement on devices that
// report a fine pointer + real hover (i.e. not touchscreens), so mobile
// scrolling never fights a tilt gesture and taps still hit the child link
// untouched — this component never intercepts clicks.
export function TiltCard({ children, className = "" }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tiltEnabled, setTiltEnabled] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    setTiltEnabled(query.matches);
    const handleChange = (e: MediaQueryListEvent) => setTiltEnabled(e.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const springConfig = { stiffness: 300, damping: 28 };
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), springConfig);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), springConfig);
  const scale = useSpring(1, springConfig);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!tiltEnabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handlePointerEnter() {
    if (!tiltEnabled) return;
    scale.set(1.04);
  }

  function handlePointerLeave() {
    px.set(0);
    py.set(0);
    scale.set(1);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{
        rotateX,
        rotateY,
        scale,
        transformPerspective: 800,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
