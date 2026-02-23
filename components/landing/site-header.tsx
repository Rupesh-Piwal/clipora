"use client";
import { RecordIcon } from "@phosphor-icons/react";
import Link from "next/link";

export function SiteHeader() {
  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-5xl px-0 border-x border-white/10">
          <div className="flex h-16 items-center justify-between px-6">
            {/* Logo */}
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-3"
            >
              {/* <div className="w-8 h-8 rounded-md bg-[#4f3095] flex items-center justify-center text-white font-mono font-bold text-lg">
                S
              </div> */}
              <div className="flex items-center">
                <div className="relative inline-block px-3 py-1">
                  <span className="font-mono font-semibold text-white tracking-tight text-[18px] flex flex-row items-center gap-2">
                    <RecordIcon fill="#4f3095" size={32} weight="duotone" />
                    SnapCut
                  </span>

                  {/* Top Left */}
                  <span className="absolute top-[-1px] left-[-1px] w-2 h-2 border-t border-l border-white/30" />

                  {/* Top Right */}
                  <span className="absolute top-[-1px] right-[-1px] w-2 h-2 border-t border-r border-white/30" />

                  {/* Bottom Left */}
                  <span className="absolute bottom-[-1px] left-[-1px] w-2 h-2 border-b border-l border-white/30" />

                  {/* Bottom Right */}
                  <span className="absolute bottom-[-1px] right-[-1px] w-2 h-2 border-b border-r border-white/30" />
                </div>
              </div>
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-8 font-mono text-sm text-white/80">
              {[
                { name: "Features", href: "#features" },
                { name: "FAQs", href: "#faqs" },
              ].map((link) => (
                <button
                  key={link.name}
                  onClick={(e) => {
                    e.preventDefault();
                    const target = document.querySelector(link.href);
                    if (target) {
                      target.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }}
                  className="relative group font-thin text-white/80 hover:text-white transition-colors duration-300"
                >
                  {link.name}

                  {/* Premium animated underline */}
                  <span
                    className="
    absolute left-1/2 -bottom-1 h-[1px] w-0
    -translate-x-1/2
    bg-[#8B5CF6]
    transition-all duration-500 ease-out
    group-hover:w-full
  "
                  />
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

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
    </>
  );
}
