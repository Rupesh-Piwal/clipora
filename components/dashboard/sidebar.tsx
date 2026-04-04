import Link from "next/link";
import { VideoCamera, FilmStrip, Gear, GithubLogo } from "@phosphor-icons/react/dist/ssr";

export function Sidebar() {
  return (
    <div className="w-64 h-screen border-r border-[#222] bg-[#0A0A0A] flex flex-col p-4 fixed left-0 top-0">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
          <VideoCamera weight="fill" />
        </div>
        <span className="font-semibold text-lg text-white">SnapCut</span>
      </div>

      <nav className="flex-1 space-y-2">
        <Link 
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#111] text-white hover:bg-[#222] transition-colors"
        >
          <FilmStrip size={20} className="text-gray-400" />
          <span className="text-sm font-medium">My Recordings</span>
        </Link>
        <Link 
          href="/record"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#111] transition-colors"
        >
          <VideoCamera size={20} />
          <span className="text-sm font-medium">New Record</span>
        </Link>
      </nav>

      <div className="pt-4 border-t border-[#222] space-y-2">
         <Link 
          href="https://github.com/Rupesh-Piwal/snapcut"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#111] transition-colors"
        >
          <GithubLogo size={20} />
          <span className="text-sm font-medium">Source Code</span>
        </Link>
      </div>
    </div>
  );
}
