"use client";
import {
  HammerIcon,
  LinkBreakIcon,
  MicrophoneIcon,
  SelectionBackgroundIcon,
  SketchLogoIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "../animated-section";

const features = [
  {
    title: "5-Minute Recordings",
    description:
      "Capture longer thoughts, tutorials, and demos with up to 5 minutes of recording time.",
    icon: (props: any) => <MicrophoneIcon size={32} weight="duotone" />,
    className: "md:col-span-2",
  },
  {
    title: "Pro Recording Tools",
    description: "Access advanced canvas tools and layouts.",
    icon: (props: any) => <HammerIcon size={32} weight="duotone" />,
    className: "md:col-span-1",
  },
  {
    title: "Premium Backgrounds",
    description: "Production-ready virtual backgrounds.",
    icon: (props: any) => (
      <SelectionBackgroundIcon size={32} weight="duotone" />
    ),
    className: "md:col-span-1",
  },
  {
    title: "Instant Link Sharing",
    description: "Share recording links instantly.",
    icon: (props: any) => <LinkBreakIcon size={32} weight="duotone" />,
    className: "md:col-span-1",
  },
  {
    title: "Always Free",
    description: "All premium features included.",
    icon: (props: any) => <SketchLogoIcon weight="duotone" size={32} />,
    className: "md:col-span-1",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="bg-[#0A0A0A] py-12 md:py-20 relative overflow-hidden scroll-mt-20"
    >
      {/* Background Grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto max-w-5xl px-4 relative z-10">
        <AnimatedSection className="mb-10 text-center max-w-3xl mx-auto">
          <div className="relative inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 text-xs font-mono font-thin text-white/70 mb-10 uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-60"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8B5CF6]"></span>
            </span>
            Capabilities
            {/* Top Left */}
            <span className="absolute top-[-1px] left-[-1px] w-2 h-2 border-t border-l border-white/15" />
            {/* Top Right */}
            <span className="absolute top-[-1px] right-[-1px] w-2 h-2 border-t border-r border-white/15" />
            {/* Bottom Left */}
            <span className="absolute bottom-[-1px] left-[-1px] w-2 h-2 border-b border-l border-white/15" />
            {/* Bottom Right */}
            <span className="absolute bottom-[-1px] right-[-1px] w-2 h-2 border-b border-r border-white/15" />
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-white mb-5 font-[family-name:var(--font-serif)] italic">
            ENGINEERED For Speed
          </h2>
          <p className="text-sm md:text-lg text-gray-300/80 font-light max-w-2xl mx-auto font-mono">
            Every pixel designed to help you move faster.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <AnimatedSection
              key={i}
              delay={0.1 + i * 0.1}
              className={cn(
                "group relative md:p-8 py-2 h-full bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden text-center md:text-start rounded-2xl md:rounded-none",
                feature.className,
              )}
            >
              {/* Corner Accents - All 4 corners */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Hover highlight effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white group-hover:text-[#8B5CF6] group-hover:border-[#8B5CF6]/30 transition-colors duration-300">
                  <feature.icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="mb-3 text-[10px] md:text-xl font-thin md:font-medium text-white group-hover:text-[#8B5CF6] transition-colors duration-300 font-mono">
                  {feature.title}
                </h3>
                <p className="hidden md:flex text-sm text-white/40 leading-relaxed font-mono font-thin">
                  {feature.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
