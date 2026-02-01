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
const MAX_RECORDING_DURATION = 120; // 2 minutes strict limit

// Split Screen Constants
const SPLIT_SCREEN_WIDTH = 1280; // 2/3 of 1920
const SPLIT_WEBCAM_WIDTH = 640;  // 1/3 of 1920

export interface PermissionState {
    camera: boolean;
    mic: boolean;
    screen: boolean;
}

export type PermissionErrorType =
    | 'PERMISSION_BLOCKED'
    | 'DEVICE_BUSY'
    | 'NO_DEVICE'
    | 'HTTPS_REQUIRED'
    | 'UNKNOWN'
    | null;

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
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [micEnabled, setMicEnabled] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [permissionErrorType, setPermissionErrorType] = useState<PermissionErrorType>(null);

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
    // const webcamConfigRef = useRef<WebcamConfig>({
    //     x: CANVAS_WIDTH - WEBCAM_WIDTH - PADDING,
    //     y: CANVAS_HEIGHT - WEBCAM_WIDTH - PADDING,
    //     width: WEBCAM_WIDTH,
    //     height: WEBCAM_WIDTH
    // });

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

    const setWebcamConfig = useCallback(() => {
        // No-op: Config is now fixed to split screen
        console.warn("setWebcamConfig is deprecated. Layout is fixed.");
    }, []);

    // =============================================
    // 5. PERMISSION HANDLING
    // =============================================

    /**
     * Request camera and microphone permissions.
     * This is the PRIMARY entry point for the permission gate.
     * On success: stores streams, updates permissions, shows webcam preview.
     */
    /**
     * Request camera and microphone permissions.
     * This is the PRIMARY entry point for the permission gate.
     * On success: stores streams, updates permissions, shows webcam preview.
     */
    const requestCameraAndMic = useCallback(async () => {
        console.log("[Permissions] Requesting Camera & Microphone...");
        setPermissionError(null);
        setPermissionErrorType(null);

        // 1. HTTPS Check
        if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
            setPermissionErrorType('HTTPS_REQUIRED');
            setPermissionError("Camera access requires a secure HTTPS connection.");
            return;
        }

        try {
            // Default constraints
            const constraints = {
                video: true,
                audio: true,
            };

            // 2. Check Permission State & Refine Constraints
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const camState = await navigator.permissions.query({ name: 'camera' as PermissionName });
                    const micState = await navigator.permissions.query({ name: 'microphone' as PermissionName });

                    // If both blocked, stop immediately
                    if (camState.state === 'denied' && micState.state === 'denied') {
                        console.warn("[Permissions] Explicitly blocked by user.");
                        setPermissionErrorType('PERMISSION_BLOCKED');
                        setPermissionError("Camera and microphone are blocked. Please enable them from browser site settings.");
                        return;
                    }

                    // Smart Constraints: Don't ask for what is already denied
                    if (camState.state === 'denied') {
                        console.warn("[Permissions] Camera blocked, requesting Mic only");
                        constraints.video = false;
                    }
                    if (micState.state === 'denied') {
                        console.warn("[Permissions] Mic blocked, requesting Camera only");
                        constraints.audio = false;
                    }

                } catch (e) {
                    console.warn("[Permissions] navigator.permissions.query not fully supported, proceeding with default constraints.");
                }
            }

            // 3. Stop previous streams
            if (webcamStreamRef.current) {
                webcamStreamRef.current.getTracks().forEach(t => t.stop());
                webcamStreamRef.current = null;
            }
            if (microphoneStreamRef.current) {
                microphoneStreamRef.current.getTracks().forEach(t => t.stop());
                microphoneStreamRef.current = null;
            }

            // 4. Call getUserMedia with Smart Constraints
            // This ensures the picker appears for the 'prompt' device even if the other is blocked.
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            console.log("[Permissions] Access Granted", constraints);
            stream.getTracks().forEach(t => console.log(`[Track] ${t.kind}: readyState=${t.readyState}`));

            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            // Store webcam stream
            if (videoTrack) {
                webcamStreamRef.current = new MediaStream([videoTrack]);
                const wVideo = document.createElement("video");
                wVideo.srcObject = webcamStreamRef.current;
                wVideo.muted = true;
                wVideo.playsInline = true;
                await wVideo.play();
                webcamVideoRef.current = wVideo;
                setWebcamPreviewStream(webcamStreamRef.current);
            }

            // Store microphone stream
            if (audioTrack) {
                microphoneStreamRef.current = new MediaStream([audioTrack]);
            }

            // Update permissions
            setPermissions(prev => ({
                ...prev,
                camera: !!videoTrack,
                mic: !!audioTrack
            }));

            // Warn if partial success
            if (!videoTrack && constraints.video) {
                // Requested but didn't get? (Should imply specific track error, effectively meaningless here as getUserMedia throws)
            }
            if (!videoTrack && !constraints.video) {
                // We intentionally skipped video
                if (constraints.audio && audioTrack) {
                    // We got audio only
                    setPermissionError("Camera is blocked. Recording with Microphone only.");
                }
            }
            if (!audioTrack && !constraints.audio) {
                // We intentionally skipped audio
                if (constraints.video && videoTrack) {
                    // We got video only
                    setPermissionError("Microphone is blocked. Recording with Camera only.");
                }
            }

            // Default to OFF as requested
            setCameraEnabled(false);
            setMicEnabled(false);

            // Ensure tracks start disabled
            if (videoTrack) videoTrack.enabled = false;
            if (audioTrack) audioTrack.enabled = false;

        } catch (error: any) {
            console.error("[Permissions] Camera/Mic Error:", error);

            // 5. Error Mapping
            if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                setPermissionErrorType('PERMISSION_BLOCKED');
                setPermissionError("Permission denied. check your system/browser permission settings.");
            } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
                setPermissionErrorType('NO_DEVICE');
                setPermissionError("No camera or microphone found.");
            } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
                setPermissionErrorType('DEVICE_BUSY');
                setPermissionError("Camera or microphone is checking/busy. Close other apps using them.");
            } else {
                setPermissionErrorType('UNKNOWN');
                setPermissionError(error.message || "Failed to access camera/microphone.");
            }
        }
    }, []);

    /**
     * Request screen share permission.
     * CRITICAL: Does NOT switch browser tabs.
     */
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
                videoTrack.addEventListener('ended', () => {
                    console.log("[Lifecycle] Screen share stopped by user via browser UI");
                    // Specific requirement: Update state null
                    setScreenPreviewStream(null);
                    stopScreenShare();
                });
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
     * Toggle Screen Share: Request if inactive, Stop if active.
     */
    const toggleScreenShare = useCallback(async () => {
        if (permissions.screen && screenStreamRef.current) {
            stopScreenShare();
        } else {
            await requestScreenShare();
        }
    }, [permissions.screen, requestScreenShare, stopScreenShare]);

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

        // --- BACKGROUND ---
        ctx.fillStyle = "#000000"; // Black background
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const isCamActive = webcamVideo && webcamVideo.readyState === 4 && webcamStreamRef.current && cameraEnabled;
        const isScreenActive = screenVideo && screenVideo.readyState >= 2;

        // --- LAYOUT LOGIC ---
        // 1. If Camera is Active: Split View (Left 2/3 Screen, Right 1/3 Camera)
        // 2. If Camera Not Active: Full View (Full Screen)

        if (isCamActive) {
            // == RIGHT SIDE: WEBCAM ==
            // Draw into the 640x1080 strip on the right
            const camX = SPLIT_SCREEN_WIDTH; // 1280
            const camY = 0;
            const camW = SPLIT_WEBCAM_WIDTH; // 640
            const camH = CANVAS_HEIGHT;      // 1080

            // Aspect Fill for user experience (like a vertical video)
            const videoW = webcamVideo.videoWidth;
            const videoH = webcamVideo.videoHeight;
            const videoAspect = videoW / videoH;
            const destAspect = camW / camH;

            let sx = 0, sy = 0, sw = videoW, sh = videoH;

            if (videoAspect > destAspect) {
                // Video is wider than slot: crop sides
                sw = videoH * destAspect;
                sx = (videoW - sw) / 2;
            } else {
                // Video is taller than slot: crop top/bottom
                sh = videoW / destAspect;
                sy = (videoH - sh) / 2;
            }

            ctx.drawImage(webcamVideo, sx, sy, sw, sh, camX, camY, camW, camH);

            // == LEFT SIDE: SCREEN ==
            if (isScreenActive) {
                // Draw into the 1280x1080 area on the left
                // Aspect Fit to ensure entire screen is visible
                const screenX = 0;
                const screenY = 0;
                const screenW = SPLIT_SCREEN_WIDTH;
                const screenH = CANVAS_HEIGHT;

                const sVideoW = screenVideo.videoWidth;
                const sVideoH = screenVideo.videoHeight;
                const sAspect = sVideoW / sVideoH;
                const dAspect = screenW / screenH;

                let drawW = screenW;
                let drawH = screenH;
                let drawX = screenX;
                let drawY = screenY;

                if (sAspect > dAspect) {
                    // Screen is wider: match width, center vertically
                    drawH = screenW / sAspect;
                    drawY = screenY + (screenH - drawH) / 2;
                } else {
                    // Screen is taller: match height, center horizontally
                    drawW = screenH * sAspect;
                    drawX = screenX + (screenW - drawW) / 2;
                }
                ctx.drawImage(screenVideo, 0, 0, sVideoW, sVideoH, drawX, drawY, drawW, drawH);
            }

        } else {
            // == FULL SCREEN MODE (No Camera) ==
            if (isScreenActive) {
                // Draw Full Canvas 1920x1080 - Aspect Fit
                const sVideoW = screenVideo.videoWidth;
                const sVideoH = screenVideo.videoHeight;
                const sAspect = sVideoW / sVideoH;
                const dAspect = CANVAS_WIDTH / CANVAS_HEIGHT;

                let drawW = CANVAS_WIDTH;
                let drawH = CANVAS_HEIGHT;
                let drawX = 0;
                let drawY = 0;

                if (sAspect > dAspect) {
                    drawH = CANVAS_WIDTH / sAspect;
                    drawY = (CANVAS_HEIGHT - drawH) / 2;
                } else {
                    drawW = CANVAS_HEIGHT * sAspect;
                    drawX = (CANVAS_WIDTH - drawW) / 2;
                }
                ctx.drawImage(screenVideo, 0, 0, sVideoW, sVideoH, drawX, drawY, drawW, drawH);
            }
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
        requestScreenShare, // Raw request if needed
        toggleScreenShare,  // Smart toggle
        stopScreenShare,

        // Toggle actions
        toggleCamera,
        toggleMic,
        toggleWebcam, // Legacy

        // Config
        setWebcamConfig,
        canvasDimensions: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        MAX_RECORDING_DURATION,
        permissionError,
        permissionErrorType,
    };
};
