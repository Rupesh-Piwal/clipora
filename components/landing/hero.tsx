"use client";

import Link from "next/link";
import { TextAnimate } from "../ui/text-animate";
import { AnimatedSection } from "../animated-section";
import Image from "next/image";

export function Hero() {
  return (
    <section className="bg-[#0A0A0A] border-b border-white/10">
      <div className="container mx-auto max-w-5xl px-0 border-x border-white/10 h-full relative">
        {/* Ambient Background Glow */}{" "}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.10),transparent_40%)] pointer-events-none" />
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
          <div className="relative mb-8 inline-flex items-center gap-2 px-3 py-1.5 border border-white/5 bg-white/5 font-mono font-thin text-xs text-white">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-60"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8B5CF6]"></span>
            </span>
            Browser Screen Recorder
            {/* Top Left */}
            <span className="absolute top-[-1px] left-[-1px] w-2 h-2 border-t border-l border-white/15" />
            {/* Top Right */}
            <span className="absolute top-[-1px] right-[-1px] w-2 h-2 border-t border-r border-white/15" />
            {/* Bottom Left */}
            <span className="absolute bottom-[-1px] left-[-1px] w-2 h-2 border-b border-l border-white/15" />
            {/* Bottom Right */}
            <span className="absolute bottom-[-1px] right-[-1px] w-2 h-2 border-b border-r border-white/15" />
          </div>

          {/* Heading */}
          <TextAnimate animation="blurInUp" by="character" once>
            {"Record Your Screen\nShare Instantly."}
          </TextAnimate>
          {/* Subtext */}
          <p className=" text-slate-300/90 mb-10 max-w-lg text-[11px] md:text-[16px] font-thin font-mono">
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
        {/* Visual Section */}
        <AnimatedSection
          delay={0.2}
          className="relative border-t border-white/10 overflow-hidden"
        >
          {/* Background Layer 1 — Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0f0f14] to-[#0A0A0A]" />

          {/* Background Layer 2 — Banner Image */}
          <div
            className="absolute inset-0 opacity-40 bg-cover bg-center"
            style={{
              backgroundImage: "url('/hero-banner.jpg')",
            }}
          />

          {/* Background Glow Effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.25),transparent_60%)]" />

          {/* Content Wrapper */}
          <div className="relative z-10 px-6 md:px-10 py-16 flex justify-center">
            <div className="relative w-full max-w-5xl">
              {/* Soft Purple Glow Behind Image */}
              <div className="absolute -inset-6 bg-[#8B5CF6] opacity-20 blur-3xl rounded-3xl" />

              {/* Glass Card Container */}
              <div className="relative rounded border border-white/10 bg-black backdrop-blur-xl shadow-[0_20px_80px_rgba(139,92,246,0.25)] overflow-hidden">
                <Image
                  src="/hero/Hero-Image.png"
                  alt="App Screenshot"
                  width={1200}
                  height={900}
                  priority
                  className="
            w-full
            h-auto
            object-cover
            transition-transform duration-700
            hover:scale-[1.02]
          "
                />
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
