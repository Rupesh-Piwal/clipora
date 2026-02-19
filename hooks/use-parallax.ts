"use client";

import { useEffect, useRef, useState } from "react";

interface UseParallaxOptions {
  speed?: number; // 0-1, lower is slower
  maxOffset?: number; // Maximum pixels to move
}

export function useParallax(options: UseParallaxOptions = {}) {
  const { speed = 0.5, maxOffset = 20 } = options;
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      return; // Skip parallax if user prefers reduced motion
    }

    // Disable on mobile for performance
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      return;
    }

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const distance = elementCenter - viewportCenter;

      // Calculate offset based on distance from viewport center
      const calculatedOffset = Math.max(
        -maxOffset,
        Math.min(maxOffset, distance * speed * 0.1)
      );

      setOffset(calculatedOffset);
    };

    // Throttle scroll for performance
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll(); // Initial calculation
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [speed, maxOffset]);

  return { ref, offset };
}
