"use client";

import { useState, useRef } from "react";
import {
    Upload,
    ExternalLink,
    Copy,
    AlertCircle,
    CheckCircle,
    RotateCcw,
    Play,
    Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "./utils";
import { LinkIcon } from "@phosphor-icons/react";

export type ReviewState = "review" | "uploading" | "success" | "error";

export interface ReviewViewProps {
    reviewState: ReviewState;
    setReviewState: (state: ReviewState) => void;
    videoDescription: string;
    setVideoDescription: (description: string) => void;
    videoLinks: string[];
    setVideoLinks: (links: string[]) => void;
    recordedVideoUrl: string | null;
    recordedBlob: Blob | null;
    recordingDuration: number;
    uploadProgress: number;
    shareData: { videoId: string; url: string } | null;
    uploadError: string | null;
    showDiscardDialog: boolean;
    setShowDiscardDialog: (show: boolean) => void;
    onUpload: (blob: Blob) => void;
    onDiscard: () => void;
}

export function ReviewView({
    reviewState,
    setReviewState,
    videoDescription,
    setVideoDescription,
    videoLinks,
    setVideoLinks,
    recordedVideoUrl,
    recordedBlob,
    recordingDuration,
    uploadProgress,
    shareData,
    uploadError,
    showDiscardDialog,
    setShowDiscardDialog,
    onUpload,
    onDiscard,
}: ReviewViewProps) {

    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleExportAndUpload = () => {
        if (recordedBlob) {
            onUpload(recordedBlob);
        } else {
            console.warn("No recorded blob found");
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-screen animate-in fade-in duration-700 p-6 lg:p-10 bg-[#080809] selection:bg-emerald-500/30">
            <div className="lg:col-span-2 flex w-full flex-col gap-6 min-h-0 border border-white/[0.05] rounded-[32px] p-6 bg-linear-to-br from-white/[0.03] to-transparent backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
                <div className="flex flex-row gap-4 justify-between items-center px-2">
                    <div className="flex flex-row items-center gap-3 card-font">
                        <h2 className="text-white text-2xl font-bold tracking-tight">SnapCut</h2>
                        <div className="bg-white/10 w-px h-5" />
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-[0.2em]">
                            Review
                        </h2>
                        <div className="bg-white/10 w-px h-5" />

                        <h1 className="text-sm font-medium text-white/40">
                            {new Date().toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </h1>
                    </div>
                    <div className="flex items-center">
                        <span className="text-xs font-mono font-semibold text-white/50 bg-white/[0.03] px-4 py-2 rounded-full border border-white/5 tracking-wider">
                            {formatTime(recordingDuration)}
                        </span>
                    </div>
                </div>

                <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#000000] relative group ring-1 ring-white/[0.05]">
                    {recordedVideoUrl ? (
                        <div className="relative w-full h-full">
                            <video
                                ref={videoRef}
                                src={recordedVideoUrl}
                                className="w-full h-full object-contain"
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onClick={togglePlay}
                            />

                            {!isPlaying && (
                                <div
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer group-hover:bg-black/20 transition-all duration-500"
                                    onClick={togglePlay}
                                >
                                    <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-full flex items-center justify-center border border-white/20 shadow-2xl scale-95 group-hover:scale-100 transition-transform duration-300">
                                        <Play className="w-8 h-8 text-white fill-white ml-1" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-white/20 font-medium">
                            No recording found.
                        </div>
                    )}

                    {reviewState === 'uploading' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
                            <div className="flex flex-col items-center gap-6">
                                <div className="w-12 h-12 border-[3px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_20px_rgba(16,185,129,0.2)]" />
                                <p className="text-white font-semibold tracking-wide">Processing Video...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-1 flex flex-col min-h-0 overflow-hidden">
                <div className="bg-gradient-to-b from-white/[0.06] to-transparent border border-white/[0.05] rounded-[32px] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-3xl flex flex-col w-full h-full overflow-y-auto custom-scrollbar relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[80px] -z-10" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-[80px] -z-10" />

                    {reviewState === "review" && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col flex-1">

                            <div className="space-y-4">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-[0.2em] block ml-1">
                                    Description
                                </label>
                                <textarea
                                    placeholder="Tell the world about your recording..."
                                    className="w-full bg-white/[0.03] border border-white/5 px-5 py-4 rounded-2xl focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 outline-none min-h-[140px] resize-none text-sm placeholder:text-white/20 transition-all duration-300 text-white/90 hover:border-white/10"
                                    value={videoDescription}
                                    onChange={(e) => setVideoDescription(e.target.value)}
                                />
                            </div>

                            <div className="flex-1 space-y-4">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-[0.2em] block ml-1">
                                    Related Links
                                </label>
                                <div className="space-y-3">
                                    {videoLinks.map((link, index) => (
                                        <div key={index} className="relative group">
                                            <input
                                                type="url"
                                                placeholder={`https://example.com/link-${index + 1}`}
                                                className="w-full bg-white/[0.03] border border-white/5 text-white/90 px-5 py-3.5 rounded-xl focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 outline-none text-sm placeholder:text-white/20 transition-all duration-300 hover:border-white/10 pr-12"
                                                value={link}
                                                onChange={(e) => {
                                                    const newLinks = [...videoLinks];
                                                    newLinks[index] = e.target.value;
                                                    setVideoLinks(newLinks);
                                                }}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-emerald-500/30 transition-colors">
                                                <ExternalLink className="w-4 h-4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 mt-auto pt-8 border-t border-white/[0.05]">
                                <Button
                                    size="lg"
                                    className="w-full h-12 gap-3 bg-gradient-to-r from-white to-white/90 text-black hover:to-white hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 cursor-pointer rounded-xl font-bold shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] text-[18px] tracking-wider"
                                    onClick={handleExportAndUpload}
                                    disabled={!recordedBlob}
                                >
                                    <LinkIcon size={32} weight="bold" />
                                    Generate Link
                                </Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        onClick={onDiscard}
                                        variant="outline"
                                        className="h-12 gap-2 transition-all duration-300 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-white/80 rounded-xl font-medium border-white/5"
                                    >
                                        <RotateCcw className="w-4 h-4" /> New
                                    </Button>
                                    <Button
                                        onClick={() => setShowDiscardDialog(true)}
                                        variant="outline"
                                        className="h-12 gap-2 text-red-400/80 hover:text-red-400 transition-all duration-300 border border-red-500/10 bg-red-500/[0.02] hover:bg-red-500/[0.08] hover:border-red-500/20 active:scale-[0.98] cursor-pointer rounded-xl font-medium"
                                    >
                                        <Trash2 className="w-4 h-4" /> Discard
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {reviewState === "uploading" && (
                        <div className="space-y-12 py-12 animate-in fade-in zoom-in duration-500 flex flex-col items-center justify-center flex-1">
                            <div className="space-y-8 text-center w-full max-w-[280px]">
                                <div className="relative flex justify-center">
                                    <div className="w-24 h-24 rounded-full border border-white/[0.05] bg-white/[0.02] flex items-center justify-center relative">
                                        <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/10" />
                                        <div
                                            className="absolute inset-0 rounded-full border-[3px] border-emerald-500 border-t-transparent animate-spin"
                                            style={{ filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.3))' }}
                                        />
                                        <Upload className="w-8 h-8 text-emerald-500 animate-bounce" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="text-4xl font-black text-white tracking-tight">{uploadProgress}%</div>
                                    <div className="h-2 w-full bg-white/[0.05] rounded-full overflow-hidden border border-white/5 p-[1px]">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <p className="text-sm font-medium text-white/40 tracking-wide uppercase">Uploading to Cloud</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {reviewState === "success" && shareData && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col flex-1">
                            <div className="p-6 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-[24px] flex flex-col items-center text-center gap-4 group">
                                <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-1">Your video is ready</h3>
                                    <p className="text-white/40 text-sm">Anyone with the link can watch it.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs uppercase font-bold text-white/30 tracking-[0.2em] block ml-1">Shareable Link</label>
                                <div className="flex flex-col gap-3">
                                    <div className="flex-1 bg-white/[0.03] px-5 py-4 rounded-xl text-xs font-mono border border-white/5 text-emerald-400/80 break-all leading-relaxed ring-1 ring-inset ring-emerald-500/[0.02]">
                                        {shareData.url}
                                    </div>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={() => navigator.clipboard.writeText(shareData.url)}
                                        className="w-full h-12 gap-3 border-white/5 bg-white/[0.03] hover:bg-white/[0.08] text-white/90 rounded-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
                                    >
                                        <Copy className="w-5 h-5" />
                                        Copy Link
                                    </Button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 pt-8 border-t border-white/[0.05] mt-auto">
                                <Button
                                    size="lg"
                                    className="w-full h-14 gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:to-emerald-400 hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 rounded-2xl font-bold shadow-[0_20px_40px_-12px_rgba(16,185,129,0.3)] text-base"
                                    asChild
                                >
                                    <a href={shareData.url} target="_blank" rel="noopener noreferrer">
                                        Open Player <ExternalLink className="w-5 h-5" />
                                    </a>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onDiscard}
                                    className="w-full h-12 bg-white/[0.02] border-white/5 hover:bg-white/[0.08] text-white/50 hover:text-white rounded-xl transition-all duration-300"
                                >
                                    Record Another
                                </Button>
                            </div>
                        </div>
                    )}

                    {reviewState === "error" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col flex-1">
                            <div className="p-8 bg-red-400/[0.03] border border-red-400/10 rounded-[24px] flex flex-col items-center text-center gap-4">
                                <div className="w-14 h-14 bg-red-400/10 rounded-full flex items-center justify-center text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-1">Upload failed</h3>
                                    <p className="text-red-400/60 text-sm leading-relaxed">{uploadError || "There was a problem uploading your video. Please try again."}</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 mt-auto pt-8 border-t border-white/[0.05]">
                                <Button
                                    onClick={handleExportAndUpload}
                                    size="lg"
                                    className="w-full h-14 bg-white text-black hover:bg-white/90 hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 rounded-2xl font-bold"
                                >
                                    Retry Upload
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setReviewState("review")}
                                    className="w-full h-12 border-white/5 hover:bg-white/[0.08] text-white/40 hover:text-white rounded-xl transition-all duration-300"
                                >
                                    Back to Editor
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showDiscardDialog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-6">
                    <div className="bg-[#121214] p-10 rounded-[32px] shadow-[0_32px_80px_rgba(0,0,0,0.8)] max-w-sm w-full border border-white/[0.05] animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 mb-8 mx-auto ring-1 ring-red-500/20">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-white text-center tracking-tight">Discard Recording?</h3>
                        <p className="text-white/40 mb-10 text-center leading-relaxed font-medium">This will permanently delete your recording. This action cannot be undone.</p>
                        <div className="flex flex-col gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowDiscardDialog(false)}
                                className="h-14 border-white/5 bg-white/[0.03] hover:bg-white/[0.08] text-white rounded-2xl font-bold transition-all duration-300"
                            >
                                Keep Recording
                            </Button>
                            <Button
                                onClick={onDiscard}
                                variant="outline"
                                className="h-14 text-red-400 border-red-500/10 bg-red-500/[0.02] hover:bg-red-500/10 hover:border-red-500/20 rounded-2xl font-bold transition-all duration-300"
                            >
                                Discard Permanently
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
