'use client';

import React from "react"

import { useRef, useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VideoPlayerProps {
    src: string | undefined;
    autoPlay?: boolean;
}

export function VideoPlayer({ src, autoPlay = true }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isMuted, setIsMuted] = useState(autoPlay); // Mute invalidates autoplay restrictions

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlayPause = () => setIsPlaying(!video.paused);
        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleLoadedMetadata = () => setDuration(video.duration);

        video.addEventListener('play', handlePlayPause);
        video.addEventListener('pause', handlePlayPause);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        if (autoPlay) {
            video.muted = true; // Essential for autoplay
            video.play().catch(err => {
                console.warn("Autoplay failed:", err);
                setIsPlaying(false);
                setIsMuted(false);
            });
        }

        return () => {
            video.removeEventListener('play', handlePlayPause);
            video.removeEventListener('pause', handlePlayPause);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [autoPlay]);

    const handlePlayPauseClick = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
            } else {
                videoRef.current.pause();
            }
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current || !Number.isFinite(duration) || duration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        videoRef.current.currentTime = percent * duration;
    };

    const formatTime = (time: number) => {
        if (!time || !Number.isFinite(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handlePlayPauseClick}
        >
            <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-contain bg-black"
                playsInline
                loop
                muted={isMuted}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Glassmorphic Play/Pause Center Button */}
            <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 pointer-events-none ${isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                <div className="relative w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl pointer-events-auto transition-transform transform hover:scale-105 active:scale-95">
                    {isPlaying ? (
                        <Pause className="w-7 h-7 text-white fill-white" />
                    ) : (
                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                    )}
                </div>
            </div>

            {/* Mute Button (Bottom Right) */}
            <div className={`absolute top-4 right-4 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <button
                    onClick={toggleMute}
                    className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                >
                    {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-volume-x"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" x2="17" y1="9" y2="15" /><line x1="17" x2="23" y1="9" y2="15" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-volume-2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                    )}
                </button>
            </div>

            {/* Bottom Controls Bar (Glassmorphic) */}
            <div
                className={`absolute bottom-4 left-4 right-4 px-4 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl transition-all duration-500 ${isHovered || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-4 text-white/90 text-xs font-medium tracking-wide">
                    <span className="w-8 text-center">{formatTime(currentTime)}</span>
                    
                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer group/progress relative" onClick={handleProgressClick}>
                        <div
                            className="absolute top-0 bottom-0 left-0 bg-white rounded-full transition-all duration-150 ease-out"
                            style={{ width: Number.isFinite(duration) && duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                        />
                    </div>
                    
                    <span className="w-8 text-center">{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
}
