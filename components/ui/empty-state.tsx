import { FilmStrip } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
      <div className="w-20 h-20 bg-[#111] rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-[#222]">
        <FilmStrip size={40} className="text-gray-500" />
      </div>
      <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight">No recordings yet</h2>
      <p className="text-gray-400 mb-8 leading-relaxed">
        Your local history is empty. Start recording your screen and it will automatically appear here.
      </p>
      <Link href="/record">
        <Button className="rounded-full px-8 bg-white text-black hover:bg-gray-200 transition-colors">
          Start Recording
        </Button>
      </Link>
    </div>
  );
}
