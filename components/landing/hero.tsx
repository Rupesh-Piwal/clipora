"use client";

import Link from "next/link";
import { HeroVideoDialog } from "../ui/hero-video-dialog";
import { TextAnimate } from "../ui/text-animate";
import { AnimatedSection } from "../animated-section";

export function Hero() {
  return (
    <section className="bg-[#0A0A0A] border-b border-white/10">
      <div className="container mx-auto max-w-5xl px-0 border-x border-white/10 h-full relative">
        {/* Main Content Area */}
        <AnimatedSection className="py-8 flex flex-col items-center text-center px-6 relative z-10">
          {/* Top Left */}
          <span className="absolute top-[-1px] left-[-1px] w-2 h-2 border-t border-l border-white/15" />

          {/* Top Right */}
          <span className="absolute top-[-1px] right-[-1px] w-2 h-2 border-t border-r border-white/15" />

          {/* Bottom Left */}
          <span className="absolute bottom-[-1px] left-[-1px] w-2 h-2 border-b border-l border-white/15" />

          {/* Bottom Right */}
          <span className="absolute bottom-[-1px] right-[-1px] w-2 h-2 border-b border-r border-white/15" />

          {/* Tag */}
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 font-mono font-thin text-xs text-white">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-60"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8B5CF6]"></span>
            </span>
            Browser Screen Recorder
          </div>

          {/* Heading */}
          <TextAnimate animation="blurInUp" by="character" once>
            {"Record Your Screen\nShare Instantly."}
          </TextAnimate>
          {/* Subtext */}
          <p className=" text-slate-300/90 mb-10 max-w-lg text-sm md:text-[16px] tracking-wide font-thin">
            Create high-quality screen recordings & <br />
            share them instantly with a link
          </p>

          {/* CTA Button */}
          <div className="relative group">
            <div className="absolute inset-0 bg-[#8B5CF6] blur-xl opacity-60 group-hover:opacity-40 transition-opacity" />
            <Link
              href="/record"
              className="relative inline-block group cursor-pointer"
            >
              <button
                className="
  relative px-10 py-3
  text-white text-lg font-medium
  border border-white/15
  bg-white/5
  backdrop-blur-sm
  rounded-md
  transition-all duration-300
  hover:bg-white/10
  hover:border-white/30
  hover:shadow-[0_0_40px_rgba(168,85,247,0.25)] cursor-pointer
"
              >
                Capture Screen
              </button>

              {/* Top Left */}
              <span
                className="absolute top-[-5px] left-[-5px] 
                   group-hover:top-[-8px] group-hover:left-[-8px]
                   w-2.5 h-2.5 border-t border-l border-white/40
                   transition-all duration-200 ease-out"
              />

              {/* Top Right */}
              <span
                className="absolute top-[-5px] right-[-5px] 
                   group-hover:top-[-8px] group-hover:right-[-8px]
                   w-2.5 h-2.5 border-t border-r border-white/40
                   transition-all duration-200 ease-out"
              />

              {/* Bottom Left */}
              <span
                className="absolute bottom-[-5px] left-[-5px] 
                   group-hover:bottom-[-8px] group-hover:left-[-8px]
                   w-2.5 h-2.5 border-b border-l border-white/40
                   transition-all duration-200 ease-out"
              />

              {/* Bottom Right */}
              <span
                className="absolute bottom-[-5px] right-[-5px] 
                   group-hover:bottom-[-8px] group-hover:right-[-8px]
                   w-2.5 h-2.5 border-b border-r border-white/40
                   transition-all duration-200 ease-out"
              />
            </Link>
          </div>
        </AnimatedSection>

        {/* Video/Visual Area with "Purple Strips" Image */}
        <AnimatedSection
          delay={0.2}
          className="mx-5 md:mx-0 rounded-2xl md:rounded-none relative border-t border-white/10"
        >
          {/* The Purple Strips Image Background */}
          <div
            className="absolute inset-x-0 top-0 h-full bg-cover bg-center bg-no-repeat opacity-90"
            style={{
              backgroundImage: "url('/hero-banner.jpg')",
              // Fallback gradient if image missing
              backgroundColor: "#0A0A0A",
            }}
          />
          {/* Fallback pattern overlaid if image keeps failing, ensuring vibe */}
          <div className="absolute inset-x-0 top-0 h-[500px] bg-[repeating-linear-gradient(0deg,rgba(139,92,246,0.1)_0px,rgba(139,92,246,0.1)_1px,transparent_1px,transparent_4px)] mix-blend-overlay pointer-events-none" />

          <div className="relative z-10 px-6 pb-20 pt-12 flex justify-baseline">
            <HeroVideoDialog
              className="block dark:hidden border-transparent rounded-4xl overflow-hidden shadow-lg cursor-pointer opacity-95"
              animationStyle="from-center"
              videoSrc="/videos/dummy-video.mp4"
              thumbnailSrc="/dummy-image.png"
              thumbnailAlt="Dummy Video Thumbnail"
            />
          </div>
        </AnimatedSection>
      </div>
      {/* STRIPE + DIAGONAL SECTION */}
      <div className="relative w-full bg-[#0A0A0A] border-b border-white/10">
        <div className="container relative mx-auto max-w-5xl px-0 border-x border-white/10  overflow-hidden">
          <div
            className="h-12 w-full opacity-80"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #1a1a1a 0px, #1a1a1a 1px, transparent 1px, transparent 6px)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
