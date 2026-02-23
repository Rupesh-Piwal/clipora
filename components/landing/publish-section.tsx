"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  VideoCameraIcon,
  FileVideoIcon,
  LinkBreakIcon,
} from "@phosphor-icons/react";
import { useParallax } from "@/hooks/use-parallax";

const features1 = [
  {
    icon: (props: any) => <VideoCameraIcon weight="duotone" {...props} />,
    title: "Instant Record",
    description:
      "Start recording your screen in one click. No installs, no setup — just capture what matters instantly.",
  },
  {
    icon: (props: any) => (
      <FileVideoIcon size={32} weight="duotone" {...props} />
    ),
    title: "Add Context with Description",
    description:
      "Give your recording clarity with a title and description so viewers understand the purpose right away.",
  },
  {
    icon: (props: any) => (
      <LinkBreakIcon size={32} weight="duotone" {...props} />
    ),
    title: "Share via Links",
    description:
      "Generate a secure link instantly and share your recording anywhere — no downloads required.",
  },
];

const CYCLE_DURATION = 4000;

function FeatureColumn({
  icon: Icon,
  title,
  description,
  isActive,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-start text-left p-6 transition-all duration-500 cursor-pointer w-full ${
        isActive
          ? "border border-white/6 bg-white/2"
          : "opacity-50 border border-transparent"
      }`}
    >
      {/* ── Corner accents (active only) ── */}
      {isActive && (
        <>
          {/* Top-left corner */}
          <span className="pointer-events-none absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#5d33bf]  shadow-[0_0_8px_rgba(139,92,246,0.5)] transition-opacity duration-500" />
          {/* Top-right corner */}
          <span className="pointer-events-none absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#5d33bf]  shadow-[0_0_8px_rgba(139,92,246,0.5)] transition-opacity duration-500" />
          {/* Bottom-left corner */}
          <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#5d33bf]  shadow-[0_0_8px_rgba(139,92,246,0.5)] transition-opacity duration-500" />
          {/* Bottom-right corner */}
          <span className="pointer-events-none absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#5d33bf]  shadow-[0_0_8px_rgba(139,92,246,0.5)] transition-opacity duration-500" />
        </>
      )}

      {/* Icon */}
      <div
        className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors duration-300 ${
          isActive
            ? "bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6]"
            : "bg-white/5 border-white/10 text-white/60"
        }`}
      >
        <Icon size={22} weight="duotone" />
      </div>

      <h3
        className={`text-xs md:text-base font-semibold mb-2 transition-colors duration-300 ${
          isActive ? "text-white" : "text-white/60"
        }`}
      >
        {title}
      </h3>
      <p
        className={`hidden md:flex text-sm leading-relaxed font-light transition-colors duration-300 ${
          isActive ? "text-white/50" : "text-white/30"
        }`}
      >
        {description}
      </p>

      {/* Progress bar */}
      <div className="mt-5 w-12 h-[3px] rounded-full bg-white/10 overflow-hidden">
        {isActive && (
          <div
            className="h-full bg-white/50 rounded-full"
            style={{
              animation: `progressFill ${CYCLE_DURATION}ms linear forwards`,
            }}
          />
        )}
      </div>
    </button>
  );
}

/* ─── Keyframes injected once via style tag (SSR-safe) ──────── */
const progressKeyframes = `
@keyframes progressFill {
  from { width: 0%; }
  to   { width: 100%; }
}
`;

/* ─── Slideshow images ──────────────────────────────────────── */
const SLIDE_IMAGES = [
  "/how-it-works/Instant_Record.png",
  "/how-it-works/Add Context.png",
  "/how-it-works/Share Links.png",
];
const SLIDE_INTERVAL = 3000; // 3 seconds per image

/* ─── Export Preview Card (mock UI) ─────────────────────────── */
function ExportPreviewCard() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { ref, offset } = useParallax({ speed: 0.3, maxOffset: 15 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_IMAGES.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      ref={ref as any}
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
      viewport={{ once: true, amount: 0.3 }}
      className="relative w-full max-w-5xl mx-auto"
      style={{
        transform: `translateY(${offset}px)`,
        willChange: offset !== 0 ? "transform" : "auto",
      }}
    >
      {/* Outer gradient glow */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-[#8B5CF6]/40 via-[#6366F1]/20 to-[#8B5CF6]/40 blur-[2px]" />

      {/* Card body */}
      <div className="relative rounded-2xl bg-[#0d1117]/90 backdrop-blur-xl border border-white/10 overflow-hidden">
        {/* ── Video preview area with image slideshow ── */}
        <div className="relative h-56 sm:h-72 md:h-150 bg-[#0a0a0a] overflow-hidden">
          {/* Slideshow images with crossfade */}
          {SLIDE_IMAGES.map((src, index) => (
            <img
              key={src}
              src={src}
              alt={`SnapCut demo ${index + 1}`}
              className="absolute inset-0 w-full h-full aspect-video transition-opacity duration-700 ease-in-out"
              style={{ opacity: index === currentSlide ? 1 : 0 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Feature row with auto-rotate ──────────────────────────── */
function FeatureRow() {
  const [activeIndex, setActiveIndex] = useState(0);

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  // Auto-cycle every CYCLE_DURATION ms
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features1.length);
    }, CYCLE_DURATION);
    return () => clearInterval(timer);
  }, [activeIndex]); // restart timer when user clicks a card

  return (
    <>
      {/* Inject keyframes */}
      <style>{progressKeyframes}</style>

      <div className="grid grid-cols-3 gap-2 md:gap-6">
        {features1.map((f, i) => (
          <FeatureColumn
            key={f.title}
            {...f}
            isActive={i === activeIndex}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </>
  );
}

/* ─── PublishSection (root) ──────────────────────────────────── */
export function PublishSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.15 }}
      id="publish"
      className="bg-[#0A0A0A] py-12 md:py-20 relative overflow-hidden scroll-mt-20"
    >
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto max-w-5xl px-4 relative z-10">
        {/* ── Header ─────────────────────── */}
        <div className="text-center mb-14 md:mb-20">
          {/* Tag pill */}
          <div className="relative inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 text-xs font-mono font-thin text-white/70 mb-10 uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-60"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8B5CF6]"></span>
            </span>
            How it Works?
            {/* Top Left */}
            <span className="absolute top-[-1px] left-[-1px] w-2 h-2 border-t border-l border-white/15" />
            {/* Top Right */}
            <span className="absolute top-[-1px] right-[-1px] w-2 h-2 border-t border-r border-white/15" />
            {/* Bottom Left */}
            <span className="absolute bottom-[-1px] left-[-1px] w-2 h-2 border-b border-l border-white/15" />
            {/* Bottom Right */}
            <span className="absolute bottom-[-1px] right-[-1px] w-2 h-2 border-b border-r border-white/15" />
          </div>

          {/* Headline — Instrument Serif Italic */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-white mb-5 font-[family-name:var(--font-serif)] italic">
            Publish with power
          </h2>

          {/* Subtext */}
          <p className="text-sm md:text-lg text-gray-300/80 font-light max-w-2xl mx-auto font-mono">
            Your videos are meant to be viewed. Share them instantly with a
            link.
          </p>
        </div>

        {/* ── Preview card ───────────────── */}
        <div className="mb-16 md:mb-24">
          <ExportPreviewCard />
        </div>

        {/* ── Feature highlights (auto-rotating) ─ */}
        <FeatureRow />
      </div>
    </motion.section>
  );
}
