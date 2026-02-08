
"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { LayoutId, getLayout } from "@/lib/layouts/layout-engine";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "./utils"; // Assuming utils exists in same folder or I need to import from parent

// Mock Slider if simple-ui not available, but let's assume shadcn/ui slider is there or basic input range
// "UI Toggle state... Reuse existing card / button components if possible"

interface PostProcessorProps {
    screenBlob: Blob | null;
    cameraBlob: Blob | null; // Can be null if only screen recorded
    // If camera is primary/only, it might be passed as screenBlob in a dirty hack, but let's assume we handle it properly
    // Actually, if "Camera Only" recording, we likely have cameraBlob but no screenBlob? 
    // Code in usePiPRecording: 
    // if (screenStream) { screenBlob = primary; cameraBlob = secondary }
    // else { cameraBlob = primary; }
    // So we should handle both being present or one.

    initialLayout: LayoutId;
    onExportStart: () => void;
    onExportProgress: (progress: number) => void;
    onExportComplete: (url: string, blob: Blob) => void;
    onExportError: (error: Error) => void;
}

export interface PostProcessorRef {
    exportVideo: () => void;
}

export const PostProcessor = forwardRef<PostProcessorRef, PostProcessorProps>(({
    screenBlob,
    cameraBlob,
    initialLayout,
    onExportStart,
    onExportProgress,
    onExportComplete,
    onExportError
}, ref) => {
    const [layoutId, setLayoutId] = useState<LayoutId>(initialLayout);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const screenVideoRef = useRef<HTMLVideoElement>(null);
    const cameraVideoRef = useRef<HTMLVideoElement>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Create object URLs on mount, revoke on unmount
    const [screenUrl, setScreenUrl] = useState<string | null>(null);
    const [cameraUrl, setCameraUrl] = useState<string | null>(null);

    useEffect(() => {
        if (screenBlob) {
            const url = URL.createObjectURL(screenBlob);
            setScreenUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [screenBlob]);

    useEffect(() => {
        if (cameraBlob) {
            const url = URL.createObjectURL(cameraBlob);
            setCameraUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [cameraBlob]);

    // Handle Metadata Loaded to set Duration
    const handleMetadata = () => {
        // Prefer screen duration, else camera
        const v1 = screenVideoRef.current;
        const v2 = cameraVideoRef.current;
        let d = 0;
        if (v1 && !isNaN(v1.duration) && isFinite(v1.duration)) d = v1.duration;
        else if (v2 && !isNaN(v2.duration) && isFinite(v2.duration)) d = v2.duration;

        if (d > 0) setDuration(d);
    };

    // Sync Logic
    const syncVideos = (time: number) => {
        if (screenVideoRef.current && Number.isFinite(time)) screenVideoRef.current.currentTime = time;
        if (cameraVideoRef.current && Number.isFinite(time)) cameraVideoRef.current.currentTime = time;
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const layout = getLayout(layoutId);
        layout.render(
            ctx,
            screenVideoRef.current,
            cameraVideoRef.current,
            canvas.width,
            canvas.height
        );
    }, [layoutId]);

    // Loop
    useEffect(() => {
        let lastTime = performance.now();

        const loop = () => {
            // Update UI time if playing
            // We rely on the VIDEO element's time update provided by browser if playing?
            // Or we can drive it manually.
            // Better to rely on the primary video's time to keep sync.

            const v = screenVideoRef.current || cameraVideoRef.current;
            if (v && !v.paused && !v.ended) {
                setCurrentTime(v.currentTime);
            }

            // If ended, stop
            if (v && v.ended) {
                setIsPlaying(false);
            }

            draw();
            animationFrameRef.current = requestAnimationFrame(loop);
        };

        if (isPlaying) {
            screenVideoRef.current?.play().catch(() => { });
            cameraVideoRef.current?.play().catch(() => { });
            loop();
        } else {
            screenVideoRef.current?.pause();
            cameraVideoRef.current?.pause();
            draw(); // Draw static frame
            cancelAnimationFrame(animationFrameRef.current!);
        }

        return () => cancelAnimationFrame(animationFrameRef.current!);
    }, [isPlaying, draw, layoutId]); // Re-run loop setup if play state changes

    // Seek Handler
    const handleSeek = (val: number[]) => {
        const newTime = val[0];
        setCurrentTime(newTime);
        syncVideos(newTime);
        draw(); // Immediate update
    };

    const togglePlay = () => {
        if (currentTime >= duration) {
            setCurrentTime(0);
            syncVideos(0);
        }
        setIsPlaying(!isPlaying);
    };

    // Public Export Method
    useImperativeHandle(ref, () => ({
        exportVideo: async () => {
            // 1. Stop playback
            setIsPlaying(false);
            onExportStart();

            try {
                const canvas = canvasRef.current;
                const vScreen = screenVideoRef.current;
                const vCamera = cameraVideoRef.current;
                if (!canvas) throw new Error("No canvas");

                // 2. Reset to start
                if (vScreen) vScreen.currentTime = 0;
                if (vCamera) vCamera.currentTime = 0;

                // 3. Setup Recorder
                const stream = canvas.captureStream(60); // 60 FPS Export

                // Add Audio Track from videos
                // Usually we want the Mixed Audio we recorded.
                // It resides on the Screen Blob (Primary) usually.
                // We need to create an AudioContext to mix them again? 
                // OR just take the track from the video element.
                // Capturing audio from a video element into a MediaStream is tricky (captureStream() on video element is experimental).
                // Standard way: Web Audio API. 

                const ctx = new AudioContext();
                const dest = ctx.createMediaStreamDestination();

                if (vScreen) {
                    // Create source from video element? CORS issues if not careful, but blob is local so ok.
                    try {
                        const src = ctx.createMediaElementSource(vScreen);
                        src.connect(dest);
                    } catch (e) { console.warn("Audio export setup failed for screen", e); }
                }
                // If camera has audio (e.g. camera only mode), mix it too?
                // In our recorder implementation, we mixed EVERYTHING into the Primary Blob.
                // So we only need audio from Primary.
                // If Camera Blob is secondary, it is muted/video-only.

                dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));

                const recorder = new MediaRecorder(stream, {
                    mimeType: "video/webm;codecs=vp9,opus",
                    videoBitsPerSecond: 5000000 // High quality export
                });

                const chunks: Blob[] = [];
                recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: "video/webm" });
                    const url = URL.createObjectURL(blob);
                    onExportComplete(url, blob);

                    // Cleanup Audio Context
                    ctx.close();

                    // Restore UI state if needed
                    // setIsPlaying(false);
                };

                recorder.start(100);

                // 4. Play videos to drive rendering
                // We need a loop that draws to canvas while recorder is running
                // We can't use requestAnimationFrame if the tab is backgrounded?
                // Export should ideally happen in foreground.

                const exportLoop = () => {
                    draw();
                    if (recorder.state === "recording") {
                        requestAnimationFrame(exportLoop);
                    }
                };
                exportLoop();

                await Promise.all([
                    vScreen ? vScreen.play() : Promise.resolve(),
                    vCamera ? vCamera.play() : Promise.resolve()
                ]);

                // 5. Wait for end
                // Listen for 'ended' on primary video
                const primary = vScreen || vCamera;
                if (primary) {
                    primary.onended = () => {
                        recorder.stop();
                        primary.onended = null; // cleanup
                    };
                } else {
                    recorder.stop();
                }

            } catch (err) {
                onExportError(err as Error);
            }
        }
    }));

    // Update layout from parent
    useEffect(() => setLayoutId(initialLayout), [initialLayout]);

    return (
        <div className="relative w-full h-full bg-black/40 flex flex-col group">
            {/* Hidden Sources */}
            <div className="hidden">
                {screenUrl && (
                    <video
                        ref={screenVideoRef}
                        src={screenUrl}
                        onLoadedMetadata={handleMetadata}
                        muted={isMuted} /* Mute preview audio if needed, but usually we want to hear it */
                        playsInline
                        crossOrigin="anonymous" // vital for WebAudio
                    />
                )}
                {cameraUrl && (
                    <video
                        ref={cameraVideoRef}
                        src={cameraUrl}
                        onLoadedMetadata={handleMetadata}
                        muted={true} /* Secondary always muted to avoid echo */
                        playsInline
                        crossOrigin="anonymous"
                    />
                )}
            </div>

            {/* Canvas Preview */}
            <canvas
                ref={canvasRef}
                width={1920}
                height={1080}
                className="w-full h-full object-contain bg-black"
            />

            {/* Custom Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex flex-col gap-2">
                    {/* Seeker */}
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        step={0.1}
                        value={currentTime}
                        onChange={(e) => handleSeek([parseFloat(e.target.value)])}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                    />

                    <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-full transition">
                                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                            </button>
                            <span className="text-sm font-mono opacity-80">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-full transition">
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

PostProcessor.displayName = "PostProcessor";
