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

export interface RecordedState {
    screen: Blob | null;
    camera: Blob | null;
    duration: number;
}

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

    // Toggle state
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [micEnabled, setMicEnabled] = useState(false);

    // Recording Sources State
    const [recordedSources, setRecordedSources] = useState<{
        screen: Blob | null;
        camera: Blob | null;
        duration: number;
    } | null>(null);

    // UI toggle state - tracks what user wants enabled (separate from permissions)

    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [permissionErrorType, setPermissionErrorType] = useState<PermissionErrorType>(null);

    // Preview streams for UI display
    const [webcamPreviewStream, setWebcamPreviewStream] = useState<MediaStream | null>(null);
    const [screenPreviewStream, setScreenPreviewStream] = useState<MediaStream | null>(null);
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

    // =============================================
    // 2. REFS FOR RESOURCES
    // =============================================

    const primaryRecorderRef = useRef<MediaRecorder | null>(null);
    const secondaryRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mixerDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const backgroundIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const primaryChunksRef = useRef<Blob[]>([]);
    const secondaryChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Stream Refs
    const screenStreamRef = useRef<MediaStream | null>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const microphoneStreamRef = useRef<MediaStream | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement | null>(null);
    const webcamVideoRef = useRef<HTMLVideoElement | null>(null);

    // =============================================
    // 3. DERIVED STATE
    // =============================================

    // canRecord: At least one media source must be active
    const canRecord = useMemo(() => {
        return (permissions.camera && cameraEnabled) || permissions.screen; // Removed mic check for "recording", usually we need video? 
        // Actually, logic is: Screen OR Camera (for video). Mic is audio only.
        // We probably don't support Audio-only recording in this UI (it's a screen/video recorder).
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


    // =============================================
    // 5. PERMISSION HANDLING & HARDWARE CONTROL
    // =============================================

    /**
     * Stop all tracks in a stream to fully release hardware.
     */
    const stopStreamTracks = (stream: MediaStream | null) => {
        if (!stream) return;
        stream.getTracks().forEach(t => {
            t.stop();
            console.log(`[Lifecycle] Stopped track: ${t.kind} (${t.label})`);
        });
    };

    /**
     * Helper to acquire just the camera stream.
     */
    const acquireCamera = async (): Promise<MediaStream | null> => {
        console.log("[Hardware] Acquiring Camera...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            return stream;
        } catch (error) {
            console.warn("[Hardware] Failed to acquire camera:", error);
            return null;
        }
    };

    /**
     * Helper to acquire just the microphone stream.
     */
    const acquireMic = async (): Promise<MediaStream | null> => {
        console.log("[Hardware] Acquiring Mic...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            return stream;
        } catch (error) {
            console.warn("[Hardware] Failed to acquire mic:", error);
            return null;
        }
    };

    /**
     * Request initial permissions (Permission Gate).
     * Enables both by default if granted.
     */
    const requestCameraAndMic = useCallback(async () => {
        console.log("[Permissions] Requesting Camera & Microphone...");
        setPermissionError(null);
        setPermissionErrorType(null);

        if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
            setPermissionErrorType('HTTPS_REQUIRED');
            setPermissionError("Camera access requires a secure HTTPS connection.");
            return;
        }

        try {
            // Stop logic handles if we already had something
            stopStreamTracks(webcamStreamRef.current);
            stopStreamTracks(microphoneStreamRef.current);

            const constraints = { video: true, audio: true };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log("[Permissions] Access Granted");

            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            // 1. Handle Camera
            if (videoTrack) {
                const camStream = new MediaStream([videoTrack]);
                webcamStreamRef.current = camStream;

                const wVideo = document.createElement("video");
                wVideo.srcObject = camStream;
                wVideo.muted = true;
                wVideo.playsInline = true;
                await wVideo.play();
                webcamVideoRef.current = wVideo;

                setWebcamPreviewStream(camStream);
                setCameraEnabled(true);
                setPermissions(p => ({ ...p, camera: true }));
            }

            // 2. Handle Mic
            if (audioTrack) {
                const micStream = new MediaStream([audioTrack]);
                microphoneStreamRef.current = micStream;
                setMicEnabled(true);
                setPermissions(p => ({ ...p, mic: true }));
            }

        } catch (error: any) {
            console.error("[Permissions] Error:", error);
            if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                setPermissionErrorType('PERMISSION_BLOCKED');
                setPermissionError("Permission denied. check your system/browser permission settings.");
            } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
                setPermissionErrorType('NO_DEVICE');
                setPermissionError("No camera or microphone found.");
            } else {
                setPermissionErrorType('UNKNOWN');
                setPermissionError(error.message || "Failed to access camera/microphone.");
            }
        }
    }, []);


    /**
     * Toggle Camera: Strict hardware release.
     */
    const toggleCamera = useCallback(async (enable: boolean) => {
        console.log(`[Toggle] Camera: ${enable}`);
        setCameraEnabled(enable); // Optimistic Update

        if (enable) {
            // Turn ON: Re-acquire stream
            const stream = await acquireCamera();
            if (stream) {
                webcamStreamRef.current = stream;

                const wVideo = document.createElement("video");
                wVideo.srcObject = stream;
                wVideo.muted = true;
                wVideo.playsInline = true;
                wVideo.play().catch(e => console.error("Webcam play error", e));
                webcamVideoRef.current = wVideo;

                setWebcamPreviewStream(stream);
                setPermissions(p => ({ ...p, camera: true }));
            } else {
                setCameraEnabled(false); // Revert
            }
        } else {
            // Turn OFF: Full Stop
            stopStreamTracks(webcamStreamRef.current);
            webcamStreamRef.current = null;
            if (webcamVideoRef.current) {
                webcamVideoRef.current.srcObject = null;
                webcamVideoRef.current = null;
            }
            setWebcamPreviewStream(null);
        }
    }, []);

    /**
     * Toggle Mic: Strict hardware release + Hot-swap.
     */
    const toggleMic = useCallback(async (enable: boolean) => {
        console.log(`[Toggle] Mic: ${enable}`);
        setMicEnabled(enable);

        if (enable) {
            // Turn ON
            const stream = await acquireMic();
            if (stream) {
                microphoneStreamRef.current = stream;
                setPermissions(p => ({ ...p, mic: true }));

                // === Hot-Swap Logic ===
                if (fsmRef.current.state === 'recording' || fsmRef.current.state === 'initializing') {
                    if (audioContextRef.current && mixerDestinationRef.current) {
                        const ctx = audioContextRef.current;
                        if (micSourceNodeRef.current) {
                            try { micSourceNodeRef.current.disconnect(); } catch (e) { }
                        }

                        const newSource = ctx.createMediaStreamSource(stream);
                        const gain = ctx.createGain();
                        gain.gain.value = 1.5;
                        newSource.connect(gain).connect(mixerDestinationRef.current);

                        micSourceNodeRef.current = newSource;
                        console.log("[Audio] Hot-swapped new mic stream into mixer");
                    }
                }
            } else {
                setMicEnabled(false);
            }
        } else {
            // Turn OFF
            if (micSourceNodeRef.current) {
                try { micSourceNodeRef.current.disconnect(); } catch (e) { }
                micSourceNodeRef.current = null;
            }
            stopStreamTracks(microphoneStreamRef.current);
            microphoneStreamRef.current = null;
        }

    }, []);

    // Screen Share Logic
    const requestScreenShare = useCallback(async () => {
        console.log("[Permissions] Requesting Screen Share...");
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: CANVAS_WIDTH },
                    height: { ideal: CANVAS_HEIGHT },
                    frameRate: { ideal: FRAME_RATE },
                },
                audio: true,
            });

            screenStreamRef.current = displayStream;
            setScreenPreviewStream(displayStream);

            const videoTrack = displayStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.addEventListener('ended', () => {
                    setScreenPreviewStream(null);
                    stopScreenShare();
                });
            }

            const sVideo = document.createElement("video");
            sVideo.srcObject = displayStream;
            sVideo.muted = true;
            sVideo.playsInline = true;
            await sVideo.play();
            screenVideoRef.current = sVideo;

            setPermissions(prev => ({ ...prev, screen: true }));
        } catch (error) {
            console.warn("[Permissions] Screen Share Denied:", error);
        }
    }, []);

    // Drawing Loop
    const drawFrame = useCallback(() => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        const screenVideo = screenVideoRef.current;
        const webcamVideo = webcamVideoRef.current;

        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const isCamActive = webcamVideo && webcamVideo.readyState >= 2 && webcamStreamRef.current && cameraEnabled;
        const isScreenActive = screenVideo && screenVideo.readyState >= 2;

        if (isCamActive) {
            const camX = SPLIT_SCREEN_WIDTH;
            const camY = 0;
            const camW = SPLIT_WEBCAM_WIDTH;
            const camH = CANVAS_HEIGHT;

            const videoW = webcamVideo.videoWidth;
            const videoH = webcamVideo.videoHeight;
            const videoAspect = videoW / videoH;
            const destAspect = camW / camH;

            let sx = 0, sy = 0, sw = videoW, sh = videoH;

            if (videoAspect > destAspect) {
                sw = videoH * destAspect;
                sx = (videoW - sw) / 2;
            } else {
                sh = videoW / destAspect;
                sy = (videoH - sh) / 2;
            }

            ctx.drawImage(webcamVideo, sx, sy, sw, sh, camX, camY, camW, camH);

            if (isScreenActive) {
                const screenW = SPLIT_SCREEN_WIDTH;
                const screenH = CANVAS_HEIGHT;
                const sVideoW = screenVideo.videoWidth;
                const sVideoH = screenVideo.videoHeight;
                const sAspect = sVideoW / sVideoH;
                const dAspect = screenW / screenH;

                let drawW = screenW, drawH = screenH, drawX = 0, drawY = 0;

                if (sAspect > dAspect) {
                    drawH = screenW / sAspect;
                    drawY = (screenH - drawH) / 2;
                } else {
                    drawW = screenH * sAspect;
                    drawX = (screenW - drawW) / 2;
                }
                ctx.drawImage(screenVideo, 0, 0, sVideoW, sVideoH, drawX, drawY, drawW, drawH);
            }

        } else {
            if (isScreenActive) {
                const sVideoW = screenVideo.videoWidth;
                const sVideoH = screenVideo.videoHeight;
                const sAspect = sVideoW / sVideoH;
                const dAspect = CANVAS_WIDTH / CANVAS_HEIGHT;

                let drawW = CANVAS_WIDTH, drawH = CANVAS_HEIGHT, drawX = 0, drawY = 0;

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

    // Cleanup resources used ONLY for recording
    const cleanupRecordingResources = useCallback(() => {
        console.log("[Cleanup] Cleaning recording resources...");

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (backgroundIntervalRef.current) clearInterval(backgroundIntervalRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
        mixerDestinationRef.current = null;
        micSourceNodeRef.current = null;

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

    const performStop = useCallback(() => {
        console.log("[Lifecycle] Stop Requested");
        if (fsmRef.current.state === 'idle' || fsmRef.current.state === 'completed') return;

        if (!fsmRef.current.transition("stopping")) return;
        updateState();

        let recordersToStop = 0;
        let stoppedCount = 0;

        const checkAllStopped = () => {
            stoppedCount++;
            if (stoppedCount >= recordersToStop) {
                // All recorders stopped
                const primaryBlob = primaryChunksRef.current.length > 0
                    ? new Blob(primaryChunksRef.current, { type: "video/webm" })
                    : null;

                const secondaryBlob = secondaryChunksRef.current.length > 0
                    ? new Blob(secondaryChunksRef.current, { type: "video/webm" })
                    : null;

                // Determine which is which based on what we started
                // Logic: Screen is always Primary if present. Camera is Secondary if Screen present.
                // If Screen missing, Camera is Primary.

                let screenBlob = null;
                let cameraBlob = null;

                if (screenStreamRef.current) {
                    screenBlob = primaryBlob;
                    cameraBlob = secondaryBlob;
                } else if (webcamStreamRef.current) {
                    cameraBlob = primaryBlob;
                }

                const duration = calculateRecordingDuration(startTimeRef.current);

                setRecordedSources({
                    screen: screenBlob,
                    camera: cameraBlob,
                    duration
                });

                // For backward compatibility / initial review, we can set recordedBlob to screenBlob (or primary)
                if (primaryBlob) {
                    const url = URL.createObjectURL(primaryBlob);
                    setState(prev => ({ ...prev, recordedBlob: primaryBlob, recordedVideoUrl: url }));
                }

                cleanupRecordingResources();
                fsmRef.current.transition("completed");
                updateState();
            }
        };

        if (primaryRecorderRef.current && primaryRecorderRef.current.state !== "inactive") {
            recordersToStop++;
            primaryRecorderRef.current.onstop = checkAllStopped;
            primaryRecorderRef.current.stop();
        }

        if (secondaryRecorderRef.current && secondaryRecorderRef.current.state !== "inactive") {
            recordersToStop++;
            secondaryRecorderRef.current.onstop = checkAllStopped;
            secondaryRecorderRef.current.stop();
        }

        if (recordersToStop === 0) {
            cleanupRecordingResources();
            fsmRef.current.transition("completed");
            updateState();
        }

    }, [cleanupRecordingResources, updateState]);

    const stopScreenShare = useCallback(() => {
        if (fsmRef.current.state === "recording") performStop();

        stopStreamTracks(screenStreamRef.current);
        screenStreamRef.current = null;
        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
            screenVideoRef.current = null;
        }
        setScreenPreviewStream(null);
        setPermissions(prev => ({ ...prev, screen: false }));
    }, [performStop]); // Dependency added

    const startRecording = async () => {
        console.log("[Lifecycle] Start Recording Requested");
        if (!canRecord) return;

        if (!fsmRef.current.transition("initializing")) return;
        updateState();

        try {
            setState(prev => ({ ...prev, recordedVideoUrl: "", recordedBlob: null, error: null }));
            setRecordedSources(null);

            // Setup Canvas (Keep for Preview)
            const canvas = document.createElement("canvas");
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            canvasRef.current = canvas;
            ctxRef.current = canvas.getContext("2d", { alpha: false });

            drawFrame();
            backgroundIntervalRef.current = setInterval(() => { if (document.hidden) drawFrame(); }, 100);

            // Setup Audio Mixer
            const ctx = new AudioContext();
            audioContextRef.current = ctx;
            const dest = ctx.createMediaStreamDestination();
            mixerDestinationRef.current = dest;

            // Mix Audio Logic
            if (screenStreamRef.current) {
                const displayStream = screenStreamRef.current;
                if (displayStream.getAudioTracks().length > 0) {
                    const source = ctx.createMediaStreamSource(displayStream);
                    const gain = ctx.createGain();
                    gain.gain.value = 0.7;
                    source.connect(gain).connect(dest);
                }
            }
            if (microphoneStreamRef.current && micEnabled) {
                const micStream = microphoneStreamRef.current;
                if (micStream.getAudioTracks().length > 0) {
                    const source = ctx.createMediaStreamSource(micStream);
                    const gain = ctx.createGain();
                    gain.gain.value = 1.5;
                    source.connect(gain).connect(dest);
                    micSourceNodeRef.current = source;
                }
            }

            // Create Final Preview Stream (Canvas + Mixed Audio) - For UI Feedback
            const canvasStream = canvas.captureStream(FRAME_RATE);
            const previewStreamCombined = new MediaStream();
            canvasStream.getVideoTracks().forEach(t => previewStreamCombined.addTrack(t));
            // Add audio to preview if you want local feedback? Usually muted to avoid feedback loop.
            // dest.stream.getAudioTracks().forEach(t => previewStreamCombined.addTrack(t)); 
            setPreviewStream(previewStreamCombined);

            // =========================================================
            // DUAL RECORDER SETUP
            // =========================================================

            primaryChunksRef.current = [];
            secondaryChunksRef.current = [];

            let primaryStream: MediaStream | null = null;
            let secondaryStream: MediaStream | null = null;

            // Scenario 1: Screen + Camera
            if (screenStreamRef.current && permissions.screen) {
                // Primary = Screen + Mixed Audio
                primaryStream = new MediaStream();
                screenStreamRef.current.getVideoTracks().forEach(t => primaryStream!.addTrack(t));
                dest.stream.getAudioTracks().forEach(t => primaryStream!.addTrack(t));

                if (webcamStreamRef.current && cameraEnabled) {
                    // Secondary = Camera (Video Only)
                    secondaryStream = new MediaStream();
                    webcamStreamRef.current.getVideoTracks().forEach(t => secondaryStream!.addTrack(t));
                }
            }
            // Scenario 2: Camera Only
            else if (webcamStreamRef.current && cameraEnabled) {
                // Primary = Camera + Mixed Audio
                primaryStream = new MediaStream();
                webcamStreamRef.current.getVideoTracks().forEach(t => primaryStream!.addTrack(t));
                dest.stream.getAudioTracks().forEach(t => primaryStream!.addTrack(t));
            }

            if (!primaryStream) throw new Error("No media stream available to record");

            // Start Primary
            primaryRecorderRef.current = setupRecording(primaryStream, {
                onDataAvailable: (e) => { if (e.data.size > 0) primaryChunksRef.current.push(e.data); },
                onStop: () => { } // Handled in performStop
            });
            primaryRecorderRef.current.start(1000);

            // Start Secondary (if exists)
            if (secondaryStream) {
                secondaryRecorderRef.current = setupRecording(secondaryStream, {
                    onDataAvailable: (e) => { if (e.data.size > 0) secondaryChunksRef.current.push(e.data); },
                    onStop: () => { }
                });
                secondaryRecorderRef.current.start(1000);
            }

            startTimeRef.current = Date.now();

            if (fsmRef.current.transition("recording")) {
                updateState();
                startTimer();
            }

        } catch (error) {
            console.error("Start failed:", error);
            fsmRef.current.transition("error");
            setState(prev => ({ ...prev, error: error as Error }));
            cleanupRecordingResources();
        }
    };

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

    const stopRecording = () => {
        performStop();
    };

    useEffect(() => {
        return () => {
            console.log("[Unmount] Component cleanup");
            stopStreamTracks(webcamStreamRef.current);
            stopStreamTracks(microphoneStreamRef.current);
            stopStreamTracks(screenStreamRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    const resetRecording = useCallback(() => {
        if (state.recordedVideoUrl) URL.revokeObjectURL(state.recordedVideoUrl);
        setState(prev => ({
            ...prev,
            status: 'idle',
            recordedBlob: null,
            recordedVideoUrl: "",
            recordingDuration: 0,
            isRecording: false
        }));
        fsmRef.current = new RecordingStateMachine();
        setPermissions({ camera: false, mic: false, screen: false });
        setCameraEnabled(false);
        setMicEnabled(false);
    }, [state.recordedVideoUrl]);

    return {
        ...state,
        permissions,
        cameraEnabled,
        micEnabled,
        permissionError,
        permissionErrorType,
        webcamPreviewStream,
        screenPreviewStream,
        previewStream,
        startRecording,
        stopRecording,
        requestCameraAndMic,
        requestScreenShare,
        toggleCamera,
        toggleMic,
        toggleScreenShare: async () => {
            if (permissions.screen && screenStreamRef.current) stopScreenShare();
            else await requestScreenShare();
        },
        resetRecording,
        canRecord,
        recordedSources,
        MAX_RECORDING_DURATION,
        canvasDimensions: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
    };
};
