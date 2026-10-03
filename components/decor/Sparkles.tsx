"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Faint drifting motes around the central stage. Positions are a fixed table
 * rather than `Math.random()`, so the server and client render the same thing
 * and hydration stays quiet.
 */
const MOTES = [
  { x: 8, y: 22, r: 2.1, delay: 0 },
  { x: 17, y: 62, r: 1.4, delay: 1.4 },
  { x: 26, y: 12, r: 1.7, delay: 2.6 },
  { x: 34, y: 78, r: 1.2, delay: 0.7 },
  { x: 44, y: 30, r: 1.9, delay: 3.1 },
  { x: 52, y: 8, r: 1.3, delay: 1.9 },
  { x: 61, y: 70, r: 2.2, delay: 0.3 },
  { x: 70, y: 26, r: 1.5, delay: 2.2 },
  { x: 78, y: 56, r: 1.8, delay: 1.1 },
  { x: 86, y: 16, r: 1.3, delay: 3.4 },
  { x: 92, y: 74, r: 1.6, delay: 2.0 },
];

export function Sparkles({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className={`pointer-events-none absolute ${className ?? ""}`}>
      {MOTES.map((mote, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-gold"
          style={{
            left: `${mote.x}%`,
            top: `${mote.y}%`,
            width: mote.r * 2,
            height: mote.r * 2,
          }}
          initial={{ opacity: 0.25 }}
          animate={reduceMotion ? { opacity: 0.3 } : { opacity: [0.15, 0.7, 0.15], y: [0, -7, 0] }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: mote.delay }
          }
        />
      ))}
    </div>
  );
}
