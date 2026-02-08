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
        if (!videoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        videoRef.current.currentTime = percent * duration;
    };

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className="relative w-full aspect-video bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-2xl overflow-hidden shadow-lg group"
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

            {/* Center Play Button */}
            <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                <div className="relative w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg pointer-events-auto transition-transform transform group-hover:scale-110">
                    {isPlaying ? (
                        <Pause className="w-6 h-6 text-white fill-white" />
                    ) : (
                        <Play className="w-6 h-6 text-white fill-white ml-1" />
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

            {/* Bottom Controls */}
            <div
                className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 text-white text-sm font-medium mb-2">
                    <span>{formatTime(currentTime)}</span>
                    <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer" onClick={handleProgressClick}>
                        <div
                            className="h-full bg-green-500 rounded-full relative"
                            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                        />
                    </div>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
}
