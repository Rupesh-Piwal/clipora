import { useState, useRef, useEffect, useCallback } from "react";
import {
    createAudioMixer,
    createRecordingBlob,
    setupRecording,
    calculateRecordingDuration,
    cleanupRecording,
} from "../record-utils";
import { BunnyRecordingState, RecordingState } from "../types";
import { RecordingStateMachine } from "../recording-state-machine";

// Configuration Constants
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const FRAME_RATE = 60;
const WEBCAM_WIDTH = 320;
const PADDING = 20;
const MAX_RECORDING_DURATION = 120; // 2 minutes strict limit

export interface WebcamConfig {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PermissionState {
    camera: boolean;
    mic: boolean;
    screen: boolean;
}

export const usePiPRecording = () => {
    // 1. State Management via FSM
    // We use a ref for the FSM to ensure it persists across renders
    const fsmRef = useRef<RecordingStateMachine>(new RecordingStateMachine());

    // React state reflects the persistent FSM state + data
    const [state, setState] = useState<BunnyRecordingState>({
        status: "idle",
        isRecording: false,
        recordedBlob: null,
        recordedVideoUrl: "",
        recordingDuration: 0,
        error: null,
    });

    const [permissions, setPermissions] = useState<PermissionState>({
        camera: false,
        mic: false,
        screen: false,
    });

    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

    // Refs for Resources
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const backgroundIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Stream Refs
    const screenStreamRef = useRef<MediaStream | null>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const microphoneStreamRef = useRef<MediaStream | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement | null>(null);
    const webcamVideoRef = useRef<HTMLVideoElement | null>(null);

    // Webcam Config
    const webcamConfigRef = useRef<WebcamConfig>({
        x: CANVAS_WIDTH - WEBCAM_WIDTH - PADDING,
        y: CANVAS_HEIGHT - WEBCAM_WIDTH - PADDING,
        width: WEBCAM_WIDTH,
        height: WEBCAM_WIDTH
    });

    // --- Helper: Sync FSM to React State ---
    const updateState = useCallback(() => {
        const currentStatus = fsmRef.current.state;
        setState(prev => ({
            ...prev,
            status: currentStatus,
            isRecording: currentStatus === "recording" || currentStatus === "stopping",
        }));
    }, []);

    // Subscribe to FSM changes
    useEffect(() => {
        const unsubscribe = fsmRef.current.subscribe(updateState);
        return () => unsubscribe();
    }, [updateState]);


    const setWebcamConfig = useCallback((config: Partial<WebcamConfig>) => {
        webcamConfigRef.current = { ...webcamConfigRef.current, ...config };
    }, []);

    // --------------------- //
    // Permission Handling
    // --------------------- //

    const processStream = useCallback(async (stream: MediaStream) => {
        console.log("[Permissions] Access Granted");
        stream.getTracks().forEach(t => console.log(`[Track] ${t.kind}: readyState=${t.readyState}`));

        // Store streams
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        if (videoTrack) {
            // If we already have a webcam stream, stop it first
            if (webcamStreamRef.current) {
                webcamStreamRef.current.getTracks().forEach(t => t.stop());
            }
            webcamStreamRef.current = new MediaStream([videoTrack]);

            // Initialize Webcam Video Element for preview/canvas
            const wVideo = document.createElement("video");
            wVideo.srcObject = webcamStreamRef.current;
            wVideo.muted = true;
            wVideo.playsInline = true;
            await wVideo.play();
            webcamVideoRef.current = wVideo;
        }

        if (audioTrack) {
            if (microphoneStreamRef.current) {
                microphoneStreamRef.current.getTracks().forEach(t => t.stop());
            }
            microphoneStreamRef.current = new MediaStream([audioTrack]);
        }

        setPermissions(prev => ({
            ...prev,
            camera: !!videoTrack,
            mic: !!audioTrack
        }));
    }, []);

    const requestCameraAndMic = useCallback(async () => {
        console.log("[Permissions] Requesting Camera & Microphone...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true,
            });
            await processStream(stream);

        } catch (error: any) {
            console.error("[Permissions] Camera/Mic Denied or Error:", error);

            // Fallback: If Not Found (e.g. no camera), try Audio only
            if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
                console.log("[Permissions] Camera not found, trying Microphone only...");
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    await processStream(stream);
                } catch (err2) {
                    console.error("[Permissions] Mic-only failed:", err2);
                }
            }
        }
    }, [processStream]);

    const requestScreenShare = useCallback(async () => {
        console.log("[Permissions] Requesting Screen Share...");
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: CANVAS_WIDTH },
                    height: { ideal: CANVAS_HEIGHT },
                    frameRate: { ideal: FRAME_RATE },
                },
                audio: true, // Request system audio
            });

            console.log("[Permissions] Screen Share Granted");
            displayStream.getTracks().forEach(t => console.log(`[Track] ${t.kind}: readyState=${t.readyState}`));

            screenStreamRef.current = displayStream;

            // Handle user clicking "Stop Sharing" in browser UI
            displayStream.getVideoTracks()[0].onended = () => {
                console.log("[Lifecycle] Screen share stopped by user");
                setPermissions(prev => ({ ...prev, screen: false }));
                performStop(); // Stop recording if ongoing
            };

            // Initialize Screen Video Element for canvas
            const sVideo = document.createElement("video");
            sVideo.srcObject = displayStream;
            sVideo.muted = true;
            sVideo.playsInline = true;
            await sVideo.play();
            screenVideoRef.current = sVideo;

            setPermissions(prev => ({ ...prev, screen: true }));

        } catch (error) {
            console.warn("[Permissions] Screen Share Denied/Cancelled:", error);
        }
    }, []);


    // --------------------- //
    // Drawing & Loop
    // --------------------- //

    let lastFrameTs = performance.now();

    const drawFrame = useCallback(() => {
        const now = performance.now();
        const delta = now - lastFrameTs;
        lastFrameTs = now;

        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        const screenVideo = screenVideoRef.current;
        const webcamVideo = webcamVideoRef.current;

        if (!ctx || !canvas || !screenVideo) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.drawImage(screenVideo, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (webcamVideo && webcamVideo.readyState === 4 && webcamStreamRef.current) {
            const { x, y, width, height } = webcamConfigRef.current;
            const size = Math.min(width, height);
            const radius = size / 2;
            const cx = x + radius;
            const cy = y + radius;

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.closePath();

            // Shadow
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 4;
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fill();

            // Reset Shadow
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            ctx.clip();

            // Draw Video (Cover)
            const vw = webcamVideo.videoWidth;
            const vh = webcamVideo.videoHeight;
            const videoAspect = vw / vh;
            const destAspect = 1;

            let sx = 0, sy = 0, sw = vw, sh = vh;

            if (videoAspect > destAspect) {
                sw = vh * destAspect;
                sx = (vw - sw) / 2;
            } else {
                sh = vw / destAspect;
                sy = (vh - sh) / 2;
            }

            ctx.drawImage(webcamVideo, sx, sy, sw, sh, x, y, size, size);
            ctx.restore();

            // Border
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "white";
            ctx.stroke();
            ctx.restore();
        }

        animationFrameRef.current = requestAnimationFrame(drawFrame);
    }, []);

    // --- Robust Cleanup ---
    const cleanup = useCallback(() => {
        console.log("[Cleanup] Starting cleanup...");
        // 1. Stop Animation Loops
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (backgroundIntervalRef.current) {
            clearInterval(backgroundIntervalRef.current);
            backgroundIntervalRef.current = null;
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        // 2. Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                console.warn("MediaRecorder stop failed:", e);
            }
        }

        // 3. Stop Tracks
        const stopTracks = (stream: MediaStream | null) => {
            stream?.getTracks().forEach(t => {
                t.stop();
                console.log(`[Cleanup] Stopped track: ${t.kind}`);
            });
        };
        stopTracks(screenStreamRef.current);
        stopTracks(webcamStreamRef.current);
        stopTracks(microphoneStreamRef.current);

        // Reset Logic: Clearing refs
        screenStreamRef.current = null;
        webcamStreamRef.current = null;
        microphoneStreamRef.current = null;

        // 4. Close Audio Context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        // 5. Release Video Elements
        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
            screenVideoRef.current = null;
        }
        if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = null;
            webcamVideoRef.current = null;
        }

        // Reset permissions visually (optional, but good for "Session" cleanup)
        setPermissions({ camera: false, mic: false, screen: false });

    }, []);

    // --- Start Recording ---
    const startRecording = async () => {
        console.log("[Lifecycle] Start Recording Requested");
        // Enforce FSM Transition
        if (!fsmRef.current.transition("initializing")) {
            console.warn("[Lifecycle] FSM failed to transition to initializing. Current state:", fsmRef.current.state);
            return;
        }
        updateState();

        try {
            // Validation: Ensure streams exist
            if (!screenStreamRef.current) {
                throw new Error("No screen stream available. Please share screen first.");
            }

            // Cleanup previous failed attempts (but DO NOT kill the active streams we just got)
            // Note: Our cleanup() kills streams. So we shouldn't call global cleanup here if we want to reuse streams.
            // We should only reset recording-specifics.

            setState(prev => ({
                ...prev,
                recordedVideoUrl: "",
                recordedBlob: null,
                error: null
            }));

            // 3. Setup Canvas
            const canvas = document.createElement("canvas");
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            canvasRef.current = canvas;
            ctxRef.current = canvas.getContext("2d", { alpha: false });

            // Start Loops
            drawFrame();
            backgroundIntervalRef.current = setInterval(() => {
                if (document.hidden) drawFrame();
            }, 100);

            // 4. Audio Mixing
            const displayStream = screenStreamRef.current;
            const hasDisplayAudio = displayStream.getAudioTracks().length > 0;

            audioContextRef.current = new AudioContext();

            // Combine partial internal streams 
            // Currently webcamStreamRef has video only, microphoneStreamRef has audio only (usually from same getUserMedia call though)
            // If they are from same call, we can just use one.
            // If we supported separate mic/cam selection, we'd need to merge.
            // In requestCameraMic, we assign both refs from the same stream usually.

            let userStreamForMixer: MediaStream | undefined = undefined;
            if (microphoneStreamRef.current) {
                userStreamForMixer = microphoneStreamRef.current;
            }

            const mixedDest = createAudioMixer(
                audioContextRef.current,
                displayStream,
                userStreamForMixer || null,
                hasDisplayAudio
            );

            // 5. Final Stream
            const canvasStream = canvas.captureStream(FRAME_RATE);
            const finalStream = new MediaStream();
            canvasStream.getVideoTracks().forEach(t => finalStream.addTrack(t));

            if (mixedDest) {
                mixedDest.stream.getAudioTracks().forEach(t => finalStream.addTrack(t));
            } else {
                displayStream.getAudioTracks().forEach(t => finalStream.addTrack(t));
                microphoneStreamRef.current?.getAudioTracks().forEach(t => finalStream.addTrack(t));
            }

            // This sets the PREVIEW stream to the FINAL stream for debugging/verification
            setPreviewStream(finalStream);

            // 6. MediaRecorder
            chunksRef.current = [];
            mediaRecorderRef.current = setupRecording(finalStream, {
                onDataAvailable: (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                },
                onStop: () => {
                    const { blob, url } = createRecordingBlob(chunksRef.current);

                    if (fsmRef.current.transition("completed")) {
                        setState(prev => ({
                            ...prev,
                            recordedBlob: blob,
                            recordedVideoUrl: url,
                        }));
                    }
                    // Full cleanup for safety
                    cleanup();
                }
            });

            // 7. START
            mediaRecorderRef.current.start(1000);
            startTimeRef.current = Date.now();

            if (fsmRef.current.transition("recording")) {
                updateState();
                startTimer();
                console.log("[Lifecycle] Recording started successfully");
            }

        } catch (error) {
            console.error("Start failed:", error);
            fsmRef.current.transition("error");
            setState(prev => ({ ...prev, error: error as Error }));
            cleanup();
        }
    };

    // --- Timer & Auto-Stop ---
    const startTimer = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        timerIntervalRef.current = setInterval(() => {
            if (!startTimeRef.current) return;
            const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

            setState(prev => ({ ...prev, recordingDuration: duration }));

            if (duration >= MAX_RECORDING_DURATION) {
                performStop();
            }
        }, 1000);
    };

    // --- Stop Logic ---
    const performStop = useCallback(() => {
        console.log("[Lifecycle] Stop Requested");
        // Only proceed if we are recording
        if (!fsmRef.current.transition("stopping")) return;
        updateState();

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        } else {
            // If recorder already stopped (e.g. error), force complete
            cleanup();
            fsmRef.current.transition("completed");
            updateState();
        }
    }, [updateState, cleanup]); // cleanup is stable

    const stopRecording = () => {
        performStop();
    };

    const resetRecording = useCallback(() => {
        if (state.recordedVideoUrl) {
            URL.revokeObjectURL(state.recordedVideoUrl);
        }
        fsmRef.current.transition("idle");
        updateState();
        setState(prev => ({
            ...prev,
            recordedBlob: null,
            recordedVideoUrl: "",
            recordingDuration: 0,
            error: null
        }));
        setPreviewStream(null);
        // Note: resetRecording does NOT revoke permissions. Use reload for that.
    }, [state.recordedVideoUrl, updateState]);

    const toggleWebcam = useCallback(async (shouldEnable: boolean) => {
        // Toggle visualization mainly.
        // If we want to support disabling camera track physically, we can do it here.
        // But for "cached permissions", we might just want to mute/unmute visual.
        // For this task, I will keep it empty as a placeholder or simple logic if needed.
    }, []);

    // Initial Cleanup on Mount
    useEffect(() => {
        return () => cleanup();
    }, []);

    return {
        ...state,
        permissions, // Export permissions
        previewStream,
        startRecording,
        stopRecording,
        resetRecording,
        setWebcamConfig,
        canvasDimensions: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        toggleWebcam,
        MAX_RECORDING_DURATION,
        requestCameraAndMic, // Export
        requestScreenShare   // Export
    };
};
