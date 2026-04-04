"use client";

import { useEffect, useState } from "react";
import { useHistory } from "@/lib/hooks/useHistory";
import { EmptyState } from "@/components/ui/empty-state";
import { VideoCard } from "@/components/dashboard/video-card";
import { FilmStrip, Clock, ShareNetwork } from "@phosphor-icons/react/dist/ssr";

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
          // Sort videos by history addedAt timestamp locally
          const formattedVideos = (data.videos || []).sort((a: VideoData, b: VideoData) => {
             const hA = history.find(h => h.id === a.id);
             const hB = history.find(h => h.id === b.id);
             return (hB?.addedAt || 0) - (hA?.addedAt || 0);
          });
          setVideos(formattedVideos);
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
        <div className="w-8 h-8 rounded-full border-2 border-t-white/50 border-white/10 animate-spin"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return <EmptyState />;
  }

  const todayRecordings = history.filter(
    (h) => new Date(h.addedAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="p-8 md:p-12 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-[28px] font-semibold text-white tracking-tight mb-8">Dashboard</h1>
        
        {/* Metric Cards - "Lunor" Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
               <span className="text-white/60 text-[13px] font-medium">Total Recordings</span>
               <div className="w-10 h-10 rounded-[10px] bg-white/5 flex items-center justify-center border border-white/5">
                  <FilmStrip size={20} className="text-white/40" />
               </div>
            </div>
            <span className="text-3xl font-semibold text-white">{history.length}</span>
          </div>
          
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
               <span className="text-white/60 text-[13px] font-medium">Recorded Today</span>
               <div className="w-10 h-10 rounded-[10px] bg-white/5 flex items-center justify-center border border-white/5">
                  <Clock size={20} className="text-white/40" />
               </div>
            </div>
            <span className="text-3xl font-semibold text-white">{todayRecordings}</span>
          </div>

          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col justify-between hidden md:flex">
            <div className="flex justify-between items-start mb-4">
               <span className="text-white/60 text-[13px] font-medium">Quick Actions</span>
               <div className="w-10 h-10 rounded-[10px] bg-white/5 flex items-center justify-center border border-white/5">
                  <ShareNetwork size={20} className="text-white/40" />
               </div>
            </div>
            <span className="text-sm font-medium text-white/50 leading-snug">Hover over video cards to auto-play specific parts.</span>
          </div>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-end">
         <h2 className="text-lg font-medium text-white">Your Recordings</h2>
         {/* Could put a search bar here if wanted */}
      </div>

      {isLoadingMetadata ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex flex-col rounded-[20px] overflow-hidden border border-white/5 bg-[#111] h-[320px]">
              <div className="h-40 bg-[#151515] m-2 rounded-2xl"></div>
              <div className="p-4 pt-2 flex flex-col gap-2">
                <div className="h-4 bg-white/5 rounded-md w-3/4"></div>
                <div className="h-3 bg-white/5 rounded-md w-1/4 mt-1"></div>
                <div className="mt-auto pt-4 flex gap-2">
                  <div className="flex-1 py-4 rounded-xl bg-white/5"></div>
                  <div className="w-12 py-4 rounded-xl bg-white/5"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => {
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
