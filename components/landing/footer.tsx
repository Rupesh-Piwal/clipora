"use client"
import Link from "next/link";
import { GithubLogoIcon } from "@phosphor-icons/react";

export function Footer() {
    return (
        <footer className="bg-[#0A0A0A] border-t border-white/5 py-12">
            <div className="container mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left: GitHub Logo */}
                <div className="flex items-center gap-2 bg-[#4f3095]/30 border border-[#4f3095]/70 rounded-full p-1">
                    <Link
                        href="https://github.com/Rupesh-Piwal/Snap-cut"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/40 hover:text-white transition-colors duration-300"
                    >
                        <GithubLogoIcon size={24} weight="duotone" />
                        <span className="sr-only">GitHub</span>
                    </Link>
                </div>

                {/* Right: Made by */}
                <div className="flex items-center gap-2 text-sm font-mono text-white/40">
                    <span>Made by</span>
                    <Link
                        href="https://rpiwal.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-[#8B5CF6] transition-colors duration-300 font-medium"
                    >
                        Rupesh
                    </Link>
                </div>
            </div>
        </footer>
    );
}
