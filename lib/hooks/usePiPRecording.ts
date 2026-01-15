import { useState, useRef, useEffect, useCallback } from "react";
import {
    createAudioMixer,
    createRecordingBlob,
    setupRecording,
} from "../record-utils";
import { BunnyRecordingState, ExtendedMediaStream } from "../types";

// Configuration Constants
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const FRAME_RATE = 60;
const WEBCAM_WIDTH = 320; // Default width
const PADDING = 20;

export interface WebcamConfig {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Custom hook to manage Picture-in-Picture (PiP) screen recording.
 * Handles:
 * 1. Stream capture (Screen + Mic + Webcam)
 * 2. Canvas compositing (Drawing webcam overlay on screen capture)
 * 3. Audio mixing (System audio + Mic)
 * 4. MediaRecorder lifecycle management
 */
export const usePiPRecording = () => {
    const [state, setState] = useState<BunnyRecordingState>({
        isRecording: false,
        recordedBlob: null,
        recordedVideoUrl: "",
        recordingDuration: 0,
    });

    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

    // Refs for persistent objects across renders
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const backgroundIntervalRef = useRef<NodeJS.Timeout | null>(null); // Fallback for background tabs
    const startTimeRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Source Refs
    const screenStreamRef = useRef<MediaStream | null>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const microphoneStreamRef = useRef<MediaStream | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement | null>(null);
    const webcamVideoRef = useRef<HTMLVideoElement | null>(null);

    // Initial config: Positioned bottom-right by default
    const webcamConfigRef = useRef<WebcamConfig>({
        x: CANVAS_WIDTH - WEBCAM_WIDTH - PADDING,
        y: CANVAS_HEIGHT - WEBCAM_WIDTH - PADDING, // Square 1:1
        width: WEBCAM_WIDTH,
        height: WEBCAM_WIDTH // Square 1:1
    });

    const setWebcamConfig = useCallback((config: Partial<WebcamConfig>) => {
        webcamConfigRef.current = { ...webcamConfigRef.current, ...config };
    }, []);

    // --- 1. Helper: Draw Loop (The Compositor) ---
    /**
     * The core rendering loop running at 60fps.
     * Composites the screen capture and webcam video onto a canvas.
     * Handles the circular clipping and positioning of the webcam overlay.
     */
    const drawFrame = useCallback(() => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        const screenVideo = screenVideoRef.current;
        const webcamVideo = webcamVideoRef.current;

        if (!ctx || !canvas || !screenVideo) return;

        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // const CANVAS_WIDTH = 1920;
        // const CANVAS_HEIGHT = 1080;

        // Draw Screen (Background) - Stretch to fit 1920x1080
        ctx.drawImage(screenVideo, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw Webcam (PiP)
        if (webcamVideo && webcamVideo.readyState === 4 && webcamVideo.srcObject) {
            const { x, y, width, height } = webcamConfigRef.current;

            // Enforce square aspect ratio for circular cut
            const size = Math.min(width, height);
            const radius = size / 2;
            const cx = x + radius;
            const cy = y + radius;

            ctx.save();

            // 1. Define Path for Clipping & Border
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.closePath();

            // 2. Add Shadow (Applied to whatever is drawn next, effectively the clipped image)
            // Note: Shadow on a clipped image can be tricky. 
            // Better to draw a shadow circle behind the image first.
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 4;
            ctx.fillStyle = "rgba(0,0,0,0.1)"; // Invisible fill just to cast shadow? 
            // Actually, let's just draw the Video with clip. 
            // Shadows with clip can be buggy in some browsers. 
            // Let's draw a dark circle behind first for the shadow effect.
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fill();

            // Clear shadow for the video itself
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            // 3. Clip
            ctx.clip();

            // 4. Draw Video (Object-Fit: Cover)
            const vw = webcamVideo.videoWidth;
            const vh = webcamVideo.videoHeight;
            const videoAspect = vw / vh;
            const destAspect = 1; // Circle is 1:1

            let sx = 0, sy = 0, sw = vw, sh = vh;

            if (videoAspect > destAspect) {
                // Video is wider -> crop sides
                sw = vh * destAspect;
                sx = (vw - sw) / 2;
            } else {
                // Video is taller -> crop top/bottom
                sh = vw / destAspect;
                sy = (vh - sh) / 2;
            }

            ctx.drawImage(webcamVideo, sx, sy, sw, sh, x, y, size, size);

            // 5. Restore (removes clip)
            ctx.restore();

            // 6. Reuse path for Border (after restore so it's not clipped if stroke is wide)
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "white";
            ctx.stroke();
            ctx.restore();
        }

        // Always schedule next frame via rAF for smooth foreground rendering
        // The safety interval handles background tab scenario
        animationFrameRef.current = requestAnimationFrame(drawFrame);
    }, []);

    // --- 2. Helper: Cleanup ---
    /**
     * Proper cleanup of all media resources.
     * Stops streams, tracks, animation loops, and audio context to prevent memory leaks and hardware locks.
     */
    const cleanup = useCallback(() => {
        // Stop Animation (rAF)
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        // Stop Animation (Background Interval)
        if (backgroundIntervalRef.current) {
            clearInterval(backgroundIntervalRef.current);
            backgroundIntervalRef.current = null;
        }

        // Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }

        // Stop Tracks
        [screenStreamRef.current, webcamStreamRef.current, microphoneStreamRef.current].forEach((stream) => {
            stream?.getTracks().forEach((track) => track.stop());
        });

        // Close Audio Context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Clear Video Elements
        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
            screenVideoRef.current = null;
        }
        if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = null;
            webcamVideoRef.current = null;
        }
    }, []);

    // --- 3. Start Recording ---
    /**
     * Initializes the recording session.
     * 1. Requests Display Media (Screen)
     * 2. Requests User Media (Webcam/Mic)
     * 3. Sets up hidden video elements for decoding streams
     * 4. Initializes Canvas for compositing
     * 5. Sets up AudioContext for mixing
     * 6. Starts MediaRecorder on the final mixed stream
     */
    const startRecording = async (withWebcam: boolean = true) => {
        try {
            // Cleanup previous session if any
            cleanup();
            setState((prev) => ({ ...prev, recordedVideoUrl: "", recordedBlob: null }));

            // A. Get Streams
            // 1. Screen (Display Media) - 1080p 60fps preferred
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: CANVAS_WIDTH },
                    height: { ideal: CANVAS_HEIGHT },
                    frameRate: { ideal: FRAME_RATE },

                },
                audio: true, // System audio
            });
            screenStreamRef.current = displayStream;

            // 2. Webcam (User Media) - Only if requested
            let userStream: MediaStream | null = null;
            if (withWebcam) {
                try {
                    userStream = await navigator.mediaDevices.getUserMedia({
                        video: { width: 1280, height: 720 },
                        audio: true, // Mic audio
                    });
                    webcamStreamRef.current = userStream;
                    microphoneStreamRef.current = userStream;
                } catch (err) {
                    console.warn("Could not get webcam/mic:", err);
                }
            }

            // Handle user stopping screen share via browser UI
            displayStream.getVideoTracks()[0].onended = () => {
                stopRecording();
            };

            // B. Setup Hidden Video Elements (Decoders)
            // Screen Video
            const sVideo = document.createElement("video");
            sVideo.srcObject = displayStream;
            sVideo.muted = true; // IMPORTANT: loops won't play if not muted usually, plus we handle audio separately
            sVideo.playsInline = true;
            await sVideo.play();
            screenVideoRef.current = sVideo;

            // Webcam Video
            if (userStream) {
                const wVideo = document.createElement("video");
                // We only want the video track for the video element to avoid echo
                const videoOnlyStream = new MediaStream(userStream.getVideoTracks());
                wVideo.srcObject = videoOnlyStream; // Only attach video track
                wVideo.muted = true;
                wVideo.playsInline = true;
                await wVideo.play();
                webcamVideoRef.current = wVideo;
            }

            // C. Setup Canvas Compositor
            const canvas = document.createElement("canvas");
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            canvasRef.current = canvas;
            // Removed alpha: false to avoid potential optimization bugs with clipping/transparency interactions
            ctxRef.current = canvas.getContext("2d");

            // Start loop (primary rAF + safety interval for background)
            drawFrame();
            // Safety interval: runs in parallel, ensures frames are drawn even if rAF pauses
            // Browsers throttle background intervals to ~1/sec, but that's better than complete freeze
            backgroundIntervalRef.current = setInterval(() => {
                // Only draw if rAF might be stalled (in background)
                if (document.hidden) {
                    drawFrame();
                }
            }, 100); // Check frequently, but only draws when hidden

            // D. Audio Mixing
            const hasDisplayAudio = displayStream.getAudioTracks().length > 0;
            audioContextRef.current = new AudioContext();

            const mixedAudioDest = createAudioMixer(
                audioContextRef.current,
                displayStream,
                userStream,
                hasDisplayAudio
            );

            // E. Create Final Stream
            const canvasStream = canvas.captureStream(FRAME_RATE);
            const finalStream = new MediaStream();

            // Add Video Track from Canvas
            canvasStream.getVideoTracks().forEach(track => finalStream.addTrack(track));

            // Add Mixed Audio Track
            if (mixedAudioDest) {
                mixedAudioDest.stream.getAudioTracks().forEach(track => finalStream.addTrack(track));
            } else {
                // Fallback if mixer failed or no audio, try to add tracks directly if exists (unmixed)
                // ideally createAudioMixer handles scenarios, but as fallback:
                displayStream.getAudioTracks().forEach(track => finalStream.addTrack(track));
                userStream?.getAudioTracks().forEach(track => finalStream.addTrack(track));
            }

            setPreviewStream(finalStream); // Optional: if we want to show it somewhere

            // F. Setup MediaRecorder
            chunksRef.current = [];
            mediaRecorderRef.current = setupRecording(finalStream, {
                onDataAvailable: (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                },
                onStop: () => {
                    const { blob, url } = createRecordingBlob(chunksRef.current);
                    setState(prev => ({
                        ...prev,
                        recordedBlob: blob,
                        recordedVideoUrl: url,
                        isRecording: false
                    }));
                    cleanup(); // Full cleanup after stop
                }
            });

            // Start Recording
            mediaRecorderRef.current.start(1000); // 1s timeslice
            startTimeRef.current = Date.now();
            setState((prev) => ({ ...prev, isRecording: true, recordingDuration: 0 }));

        } catch (error) {
            console.error("Failed to start recording:", error);
            cleanup();
        }
    };

    /**
     * Dynamically enables or disables the webcam during an active recording.
     * seamlessly adds/removes the video track without stopping the main recording.
     */
    const toggleWebcam = useCallback(async (shouldEnable: boolean) => {
        try {
            if (shouldEnable) {
                // Enable Webcam
                // 1. Check if we already have a stream
                if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
                    return; // Already enabled
                }

                // 2. Get User Media (Video only)
                // We ask for audio: false because this is just for the visual overlay, audio is mixed separately
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720 },
                    audio: false
                });

                webcamStreamRef.current = stream;

                // 3. Setup Video Element
                let wVideo = webcamVideoRef.current;
                if (!wVideo) {
                    wVideo = document.createElement("video");
                    wVideo.muted = true;
                    wVideo.playsInline = true;
                    webcamVideoRef.current = wVideo;
                }
                wVideo.srcObject = stream;
                await wVideo.play();

            } else {
                // Disable Webcam
                if (webcamStreamRef.current) {
                    webcamStreamRef.current.getVideoTracks().forEach(t => t.stop());
                    webcamStreamRef.current = null;
                }
                if (webcamVideoRef.current) {
                    webcamVideoRef.current.srcObject = null;
                }
            }
        } catch (error) {
            console.error("Failed to toggle webcam:", error);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        } else {
            cleanup();
        }
    }, [cleanup]);

    const resetRecording = useCallback(() => {
        stopRecording();
        setState({
            isRecording: false,
            recordedBlob: null,
            recordedVideoUrl: "",
            recordingDuration: 0,
        });
    }, [stopRecording]);

    // Duration Timer
    useEffect(() => {
        if (!state.isRecording || !startTimeRef.current) return;
        const interval = setInterval(() => {
            const duration = Math.floor((Date.now() - startTimeRef.current!) / 1000);
            setState(prev => ({ ...prev, recordingDuration: duration }));
        }, 1000);
        return () => clearInterval(interval);
    }, [state.isRecording]);

    // Unmount Cleanup
    useEffect(() => {
        return () => cleanup();
    }, []);

    return {
        ...state,
        previewStream,
        startRecording,
        stopRecording,
        resetRecording,
        setWebcamConfig,
        canvasDimensions: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        toggleWebcam
    };
};
