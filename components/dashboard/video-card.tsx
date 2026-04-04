"use client";

import { Copy, Play, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import Image from "next/image";
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
      className="group flex flex-col rounded-xl overflow-hidden border border-[#222] bg-[#0A0A0A] hover:border-gray-600 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/v/${id}`} className="block relative aspect-video bg-[#111] overflow-hidden">
        {videoUrl ? (
          <video 
             src={videoUrl} 
             className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
             muted 
             playsInline 
             loop 
             preload="metadata"
             ref={(el) => {
                if (el) {
                   if (isHovered) {
                      el.play().catch(() => {});
                   } else {
                      el.pause();
                      el.currentTime = 0;
                   }
                }
             }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
             <Play size={48} className={`text-white/20 transition-transform duration-300 ${isHovered ? 'scale-110 text-white/40' : ''}`} weight="fill" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Play size={48} className={`text-white/30 drop-shadow-lg transition-transform duration-300 ${isHovered ? 'scale-110 text-white/50 opacity-0' : 'opacity-100'}`} weight="fill" />
        </div>
      </Link>
      
      <div className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="text-white font-medium truncate">
          {title || `Recording ${id.substring(0, 8)}`}
        </h3>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>{formattedDate}</span>
        </div>
        
        <div className="mt-4 flex gap-2 pt-3 border-t border-[#222]">
          <button 
            onClick={handleCopyLink}
            className="flex flex-1 items-center justify-center gap-2 py-2 rounded-md bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 transition-colors"
          >
            <Copy size={16} />
            <span className="text-sm">Copy Link</span>
          </button>
          
          <button 
            onClick={handleDelete}
            className="flex items-center justify-center p-2 rounded-md bg-[#1a1a1a] hover:bg-red-500/20 hover:text-red-400 text-gray-500 transition-colors"
            title="Remove from history"
          >
            <Trash size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
