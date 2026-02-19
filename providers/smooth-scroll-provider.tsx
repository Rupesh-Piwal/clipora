"use client";

import { useEffect, useRef, ReactNode } from "react";
import Lenis from "lenis";

interface SmoothScrollProviderProps {
  children: ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      return; // Skip smooth scroll if user prefers reduced motion
    }

    // Disable on mobile for performance
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      return; // Use native scroll on mobile
    }

    // Initialize Lenis
    lenisRef.current = new Lenis({
      duration: 1.2, // Smooth scroll duration
      easing: (t) => {
        // Cinematic cubic-bezier(.22,1,.36,1) easing
        const x1 = 0.22;
        const y1 = 1;
        const x2 = 0.36;
        const y2 = 1;
        
        // Simple approximation of cubic bezier
        return t * (2 - t);
      },
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    // Animation frame loop
    function raf(time: number) {
      lenisRef.current?.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Cleanup
    return () => {
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
