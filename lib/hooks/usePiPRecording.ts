import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
    // =============================================
    // 1. STATE MANAGEMENT
    // =============================================

    // FSM for recording lifecycle
    const fsmRef = useRef<RecordingStateMachine>(new RecordingStateMachine());

    // Core recording state
    const [state, setState] = useState<BunnyRecordingState>({
        status: "idle",
        isRecording: false,
        recordedBlob: null,
        recordedVideoUrl: "",
        recordingDuration: 0,
        error: null,
    });

    // Permission state - tracks what we have access to
    const [permissions, setPermissions] = useState<PermissionState>({
        camera: false,
        mic: false,
        screen: false,
    });

    // UI toggle state - tracks what user wants enabled (separate from permissions)
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);

    // Preview streams for UI display
    const [webcamPreviewStream, setWebcamPreviewStream] = useState<MediaStream | null>(null);
    const [screenPreviewStream, setScreenPreviewStream] = useState<MediaStream | null>(null);
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

    // =============================================
    // 2. REFS FOR RESOURCES
    // =============================================

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

    // =============================================
    // 3. DERIVED STATE
    // =============================================

    // canRecord: At least one media source must be active
    const canRecord = useMemo(() => {
        return (permissions.camera && cameraEnabled) || permissions.screen;
    }, [permissions.camera, permissions.screen, cameraEnabled]);

    // =============================================
    // 4. HELPER FUNCTIONS
    // =============================================

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

    // =============================================
    // 5. PERMISSION HANDLING
    // =============================================

    /**
     * Request camera and microphone permissions.
     * This is the PRIMARY entry point for the permission gate.
     * On success: stores streams, updates permissions, shows webcam preview.
     */
    const requestCameraAndMic = useCallback(async () => {
        console.log("[Permissions] Requesting Camera & Microphone...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true,
            });

            console.log("[Permissions] Camera & Mic Granted");
            stream.getTracks().forEach(t => console.log(`[Track] ${t.kind}: readyState=${t.readyState}`));

            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            // Store webcam stream
            if (videoTrack) {
                if (webcamStreamRef.current) {
                    webcamStreamRef.current.getTracks().forEach(t => t.stop());
                }
                webcamStreamRef.current = new MediaStream([videoTrack]);

                // Create video element for canvas drawing
                const wVideo = document.createElement("video");
                wVideo.srcObject = webcamStreamRef.current;
                wVideo.muted = true;
                wVideo.playsInline = true;
                await wVideo.play();
                webcamVideoRef.current = wVideo;

                // Set preview stream for UI
                setWebcamPreviewStream(webcamStreamRef.current);
            }

            // Store microphone stream
            if (audioTrack) {
                if (microphoneStreamRef.current) {
                    microphoneStreamRef.current.getTracks().forEach(t => t.stop());
                }
                microphoneStreamRef.current = new MediaStream([audioTrack]);
            }

            // Update permissions
            setPermissions(prev => ({
                ...prev,
                camera: !!videoTrack,
                mic: !!audioTrack
            }));

            // Enable toggles by default
            setCameraEnabled(true);
            setMicEnabled(true);

        } catch (error: any) {
            console.error("[Permissions] Camera/Mic Error:", error);

            // Fallback: Try audio only if camera not found
            if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
                console.log("[Permissions] Camera not found, trying Microphone only...");
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const audioTrack = audioStream.getAudioTracks()[0];

                    if (audioTrack) {
                        microphoneStreamRef.current = new MediaStream([audioTrack]);
                        setPermissions(prev => ({ ...prev, mic: true }));
                        setMicEnabled(true);
                    }
                } catch (err2) {
                    console.error("[Permissions] Mic-only failed:", err2);
                }
            }
            // Other errors (NotAllowedError, etc.) - permission denied, handle gracefully
        }
    }, []);

    /**
     * Request screen share permission.
     * CRITICAL: Does NOT switch browser tabs.
     */
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

            // Store screen stream
            screenStreamRef.current = displayStream;
            setScreenPreviewStream(displayStream);

            // Handle user clicking "Stop Sharing" in browser UI
            const videoTrack = displayStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.onended = () => {
                    console.log("[Lifecycle] Screen share stopped by user via browser UI");
                    stopScreenShare();
                };
            }

            // Create video element for canvas drawing
            const sVideo = document.createElement("video");
            sVideo.srcObject = displayStream;
            sVideo.muted = true;
            sVideo.playsInline = true;
            await sVideo.play();
            screenVideoRef.current = sVideo;

            setPermissions(prev => ({ ...prev, screen: true }));

        } catch (error) {
            console.warn("[Permissions] Screen Share Denied/Cancelled:", error);
            // User cancelled - don't crash, just log
        }
    }, []);

    /**
     * Stop screen sharing without affecting camera/mic.
     */
    const stopScreenShare = useCallback(() => {
        console.log("[Lifecycle] Stopping Screen Share...");

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }

        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
            screenVideoRef.current = null;
        }

        setScreenPreviewStream(null);
        setPermissions(prev => ({ ...prev, screen: false }));

        // If recording, stop it
        if (fsmRef.current.state === "recording") {
            performStop();
        }
    }, []);

    /**
     * Toggle camera on/off (after permission is granted).
     */
    const toggleCamera = useCallback((enable: boolean) => {
        console.log(`[Toggle] Camera: ${enable}`);
        setCameraEnabled(enable);

        // Enable/disable the video track
        if (webcamStreamRef.current) {
            webcamStreamRef.current.getVideoTracks().forEach(t => {
                t.enabled = enable;
            });
        }
    }, []);

    /**
     * Toggle microphone on/off (after permission is granted).
     */
    const toggleMic = useCallback((enable: boolean) => {
        console.log(`[Toggle] Mic: ${enable}`);
        setMicEnabled(enable);

        // Enable/disable the audio track
        if (microphoneStreamRef.current) {
            microphoneStreamRef.current.getAudioTracks().forEach(t => {
                t.enabled = enable;
            });
        }
    }, []);

    // =============================================
    // 6. DRAWING & ANIMATION LOOP
    // =============================================

    let lastFrameTs = performance.now();

    const drawFrame = useCallback(() => {
        const now = performance.now();
        lastFrameTs = now;

        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        const screenVideo = screenVideoRef.current;
        const webcamVideo = webcamVideoRef.current;

        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw screen capture (if available)
        if (screenVideo && screenVideo.readyState >= 2) {
            ctx.drawImage(screenVideo, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            // No screen capture - fill with dark background
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // Draw webcam overlay (if enabled and available)
        if (webcamVideo && webcamVideo.readyState === 4 && webcamStreamRef.current && cameraEnabled) {
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

            // Draw Video (Cover crop to circle)
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
    }, [cameraEnabled]);

    // =============================================
    // 7. CLEANUP FUNCTIONS
    // =============================================

    /**
     * Full cleanup - stops ALL streams and resets state.
     * Called on unmount or after recording completes.
     */
    const cleanup = useCallback(() => {
        console.log("[Cleanup] Starting full cleanup...");

        // Stop animation loops
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

        // Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                console.warn("MediaRecorder stop failed:", e);
            }
        }

        // Stop all tracks
        const stopTracks = (stream: MediaStream | null) => {
            stream?.getTracks().forEach(t => {
                t.stop();
                console.log(`[Cleanup] Stopped track: ${t.kind}`);
            });
        };
        stopTracks(screenStreamRef.current);
        stopTracks(webcamStreamRef.current);
        stopTracks(microphoneStreamRef.current);

        // Clear refs
        screenStreamRef.current = null;
        webcamStreamRef.current = null;
        microphoneStreamRef.current = null;

        // Close audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        // Release video elements
        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
            screenVideoRef.current = null;
        }
        if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = null;
            webcamVideoRef.current = null;
        }

        // Reset all state
        setPermissions({ camera: false, mic: false, screen: false });
        setWebcamPreviewStream(null);
        setScreenPreviewStream(null);
        setPreviewStream(null);

    }, []);

    // =============================================
    // 8. RECORDING LIFECYCLE
    // =============================================

    /**
     * Start recording. Requires at least one media source (camera OR screen).
     */
    const startRecording = async () => {
        console.log("[Lifecycle] Start Recording Requested");

        // Validate: Must have at least one source
        if (!canRecord) {
            console.warn("[Lifecycle] Cannot start recording - no media sources enabled");
            return;
        }

        // Enforce FSM Transition
        if (!fsmRef.current.transition("initializing")) {
            console.warn("[Lifecycle] FSM failed to transition to initializing. Current state:", fsmRef.current.state);
            return;
        }
        updateState();

        try {
            // Reset previous recording data
            setState(prev => ({
                ...prev,
                recordedVideoUrl: "",
                recordedBlob: null,
                error: null
            }));

            // Setup Canvas
            const canvas = document.createElement("canvas");
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            canvasRef.current = canvas;
            ctxRef.current = canvas.getContext("2d", { alpha: false });

            // Start drawing loop
            drawFrame();
            backgroundIntervalRef.current = setInterval(() => {
                if (document.hidden) drawFrame();
            }, 100);

            // Audio Mixing
            audioContextRef.current = new AudioContext();

            const displayStream = screenStreamRef.current;
            const hasDisplayAudio = (displayStream?.getAudioTracks().length ?? 0) > 0;

            let userStreamForMixer: MediaStream | undefined = undefined;
            if (microphoneStreamRef.current && micEnabled) {
                userStreamForMixer = microphoneStreamRef.current;
            }

            // Final Stream
            const canvasStream = canvas.captureStream(FRAME_RATE);
            const finalStream = new MediaStream();
            canvasStream.getVideoTracks().forEach(t => finalStream.addTrack(t));

            if (displayStream) {
                const mixedDest = createAudioMixer(
                    audioContextRef.current,
                    displayStream,
                    userStreamForMixer || null,
                    hasDisplayAudio
                );

                if (mixedDest) {
                    mixedDest.stream.getAudioTracks().forEach(t => finalStream.addTrack(t));
                } else {
                    displayStream.getAudioTracks().forEach(t => finalStream.addTrack(t));
                    if (micEnabled) {
                        microphoneStreamRef.current?.getAudioTracks().forEach(t => finalStream.addTrack(t));
                    }
                }
            } else if (micEnabled) {
                 // No screen sharing, just mic
                microphoneStreamRef.current?.getAudioTracks().forEach(t => finalStream.addTrack(t));
            }

            // Set preview stream for recording view
            setPreviewStream(finalStream);

            // Setup MediaRecorder
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
                    // Cleanup recording resources (but preserve camera for re-recording)
                    cleanupRecordingResources();
                }
            });

            // START
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
            cleanupRecordingResources();
        }
    };

    /**
     * Cleanup only recording resources, preserve camera/mic for re-recording.
     */
    const cleanupRecordingResources = useCallback(() => {
        console.log("[Cleanup] Cleaning recording resources only...");

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

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        // Stop screen stream (but keep camera/mic)
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }
        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
            screenVideoRef.current = null;
        }

        setScreenPreviewStream(null);
        setPreviewStream(null);
        setPermissions(prev => ({ ...prev, screen: false }));

    }, []);

    // Timer & Auto-Stop
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

    // Stop Logic
    const performStop = useCallback(() => {
        console.log("[Lifecycle] Stop Requested");
        if (!fsmRef.current.transition("stopping")) return;
        updateState();

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        } else {
            cleanupRecordingResources();
            fsmRef.current.transition("completed");
            updateState();
        }
    }, [updateState, cleanupRecordingResources]);

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
    }, [state.recordedVideoUrl, updateState]);

    // Legacy toggle for compatibility
    const toggleWebcam = useCallback(async (shouldEnable: boolean) => {
        toggleCamera(shouldEnable);
    }, [toggleCamera]);

    // Cleanup on unmount
    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    // =============================================
    // 9. RETURN VALUES
    // =============================================

    return {
        // Recording state
        ...state,

        // Permission state
        permissions,

        // Preview streams
        previewStream,
        webcamPreviewStream,
        screenPreviewStream,

        // Derived state
        canRecord,
        cameraEnabled,
        micEnabled,

        // Recording actions
        startRecording,
        stopRecording,
        resetRecording,

        // Permission actions
        requestCameraAndMic,
        requestScreenShare,
        stopScreenShare,

        // Toggle actions
        toggleCamera,
        toggleMic,
        toggleWebcam, // Legacy

        // Config
        setWebcamConfig,
        canvasDimensions: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        MAX_RECORDING_DURATION,
    };
};
