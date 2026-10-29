"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// The footer sits fixed underneath the page; the content above scrolls away to uncover it.
// clip-path on the slot confines the fixed footer to the slot's box, so it only shows there.
export function FooterReveal({ children }: { children: React.ReactNode }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const [height, setHeight] = useState(320);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Footer drifts up into place as it's uncovered
  const { scrollYProgress } = useScroll({ target: slotRef, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-35%", "0%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0.3, 1]);

  return (
    <div
      ref={slotRef}
      className="relative"
      // Tucked 32px up under the raised section above, so its rounded corners show the footer
      style={{ height: height + 32, marginTop: -32, clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
    >
      {/* pt-8 fills the tucked-under strip; only the footer content itself is measured */}
      <div className="fixed bottom-0 left-0 w-full bg-fill pt-8">
        <motion.div ref={innerRef} style={reduce ? { opacity, y: 0 } : { y, opacity }}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
