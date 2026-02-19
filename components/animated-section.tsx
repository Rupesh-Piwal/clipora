"use client";

import { useSmoothReveal } from "@/hooks/use-smooth-reveal";
import { cn } from "@/lib/utils";
import { CSSProperties, ReactNode, ElementType } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType; // ✅ FIXED
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
  as: Component = "div",
}: AnimatedSectionProps) {
  const { ref, isVisible } = useSmoothReveal({ threshold: 0.1 });

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.8s ease-out ${delay}s, transform 0.8s ease-out ${delay}s`,
  };

  return (
    <Component ref={ref as any} className={className} style={style}>
      {children}
    </Component>
  );
}
