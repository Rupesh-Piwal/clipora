"use client";

import { ShareNetwork, Trash, Play } from "@phosphor-icons/react";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner"; // Assuming sonner is installed or we use standard alert for now
import { useHistory } from "@/lib/hooks/useHistory";

interface VideoCardProps {
  id: string;
  title: string | null;
  createdAt: string;
  duration?: string;
  videoUrl?: string;
  onDelete?: () => void;
}

export function VideoCard({ id, title, createdAt, duration, videoUrl, onDelete }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { removeVideoFromHistory } = useHistory();

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/v/${id}`;
    navigator.clipboard.writeText(url);
    try {
      toast.success("Link copied to clipboard!");
    } catch {
      alert("Link copied to clipboard!");
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Remove this video from your local history? It won't delete the video from the server.")) {
      removeVideoFromHistory(id);
      if (onDelete) onDelete();
    }
  };

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(createdAt));

  return (
    <div
      className="group flex flex-col rounded-[20px] overflow-hidden border border-white/5 bg-[#111] hover:bg-[#151515] hover:border-white/10 transition-all duration-300 shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/v/${id}`} className="block relative aspect-video bg-[#0a0a0a] overflow-hidden m-2 rounded-2xl border border-white/5">
        {videoUrl ? (
          <video
            src={videoUrl}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
            muted
            playsInline
            loop
            preload="metadata"
            ref={(el) => {
              if (el) {
                if (isHovered) {
                  el.play().catch(() => { });
                } else {
                  el.pause();
                  el.currentTime = 0;
                }
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
            <Play size={48} className={`text-white/10 transition-transform duration-500 ${isHovered ? 'scale-110 text-white/20' : ''}`} weight="fill" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Play size={48} className={`text-white/20 drop-shadow-md transition-transform duration-500 ${isHovered ? 'scale-110 text-white/40 opacity-0' : 'opacity-100'}`} weight="fill" />
        </div>
      </Link>

      <div className="p-4 pt-2 flex flex-col gap-3 flex-1">
        <div className="flex flex-col gap-1 items-start">
          <h3 className="text-white text-[15px] font-medium tracking-tight truncate w-full">
            {title || `Recording ${id.substring(0, 8)}`}
          </h3>
          <span className="text-[13px] text-white/40">{formattedDate}</span>
          <p className="text-[13px] text-white/50 line-clamp-2 mt-1 leading-relaxed">
            Recordings from your browser session tracking local history.
          </p>
        </div>

        <div className="mt-auto flex gap-2 pt-4">
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[13px] font-medium transition-all"
          >
            <ShareNetwork size={16} weight="bold" />
            <span>Share Link</span>
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-white/40 transition-all"
            title="Remove from history"
          >
            <Trash size={16} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
