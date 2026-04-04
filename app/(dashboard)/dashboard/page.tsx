"use client";

import { useEffect, useState } from "react";
import { useHistory } from "@/lib/hooks/useHistory";
import { EmptyState } from "@/components/ui/empty-state";
import { VideoCard } from "@/components/dashboard/video-card";

interface VideoData {
  id: string;
  createdAt: string;
  description: string | null;
  objectKey: string;
  videoUrl?: string;
}

export default function DashboardPage() {
  const { history, isLoaded } = useHistory();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  useEffect(() => {
    async function fetchMetadata() {
      if (!isLoaded || history.length === 0) return;

      setIsLoadingMetadata(true);
      try {
        const ids = history.map((h) => h.id).join(",");
        const res = await fetch(`/api/videos?ids=${ids}`);
        if (res.ok) {
          const data = await res.json();
          setVideos(data.videos || []);
        }
      } catch (err) {
        console.error("Failed to fetch video metadata", err);
      } finally {
        setIsLoadingMetadata(false);
      }
    }

    fetchMetadata();
  }, [history, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-white animate-spin"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 border-b border-[#222] pb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">My Recordings</h1>
        <p className="text-gray-400 mt-2">Manage your local recording history.</p>
      </div>

      {isLoadingMetadata ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex flex-col rounded-xl overflow-hidden border border-[#222] bg-[#0A0A0A]">
              <div className="aspect-video bg-[#111]"></div>
              <div className="p-4 flex flex-col gap-2">
                <div className="h-4 bg-[#222] rounded w-3/4"></div>
                <div className="h-3 bg-[#222] rounded w-1/2 mt-2"></div>
                <div className="mt-4 flex gap-2 pt-3 border-t border-[#222]">
                  <div className="flex-1 py-4 rounded-md bg-[#1a1a1a]"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => {
             // Find original history item for the "fallback" title if none exists, though we aren't saving title rn.
             return (
               <VideoCard 
                  key={video.id}
                  id={video.id}
                  title={video.description}
                  createdAt={video.createdAt}
                  videoUrl={video.videoUrl}
                  onDelete={() => {
                     setVideos(prev => prev.filter(v => v.id !== video.id));
                  }}
               />
             )
          })}
        </div>
      )}
    </div>
  );
}
