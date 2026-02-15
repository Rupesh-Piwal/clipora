import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { RecordingStateMachine } from "../recording-state-machine";
import { useStreams } from "./useStreams";
import { useRecording } from "./useRecording";
import { BunnyRecordingState, RecordingState } from "../types";
import { BackgroundOption, NO_BACKGROUND } from "../backgrounds";
import { drawBackground } from "../layouts/layout-engine";

// Configuration
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export const usePiPRecording = () => {
    // --- FSM & State ---
    const fsmRef = useRef<RecordingStateMachine>(new RecordingStateMachine());
    const [state, setState] = useState<BunnyRecordingState>({
        status: "idle",
        isRecording: false,
        recordedBlob: null,
        recordedVideoUrl: "",
        recordingDuration: 0,
        error: null,
    });

    const [countdownValue, setCountdownValue] = useState<number | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // --- Background State ---
    const [background, setBackground] = useState<BackgroundOption>(NO_BACKGROUND);
    const backgroundImageElementRef = useRef<HTMLImageElement | null>(null);

    // Preload background image
    useEffect(() => {
        if (background.type === "image" && background.value) {
            const img = new Image();
            img.src = background.value;
            img.crossOrigin = "anonymous";
            img.onload = () => {
                backgroundImageElementRef.current = img;
            };
        } else {
            backgroundImageElementRef.current = null;
        }
    }, [background]);

    // --- External Hooks ---
    const {
        permissions,
        cameraEnabled,
        micEnabled,
        permissionError,
        permissionErrorType,
        webcamPreviewStream,
        screenPreviewStream,
        webcamVideoRef,
        screenVideoRef,
        microphoneStreamRef,
        startCamera,
        stopCamera,
        toggleCamera,
        startMic,
        stopMic,
        toggleMic,
        startScreen,
        stopScreen,
        stopAll: stopAllStreams
    } = useStreams({
        onScreenEnded: () => {
            // Native Stop Button clicked
            console.log("Native stop detected");
            // If recording, we should probably stop recording or at least pause?
            // For now, let's just stop if we are recording.
            if (fsmRef.current.state === "recording") {
                stopRecordingWrapper();
            }
        }
    });

    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);

    // We need a stream to record. The canvas capture stream + audio.
    const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);

    // --- Recording Hook ---
    const {
        isRecording: isMediaRecording,
        startRecording: startMediaRecording,
        stopRecording: stopMediaRecording,
        recordingDuration
    } = useRecording({
        onComplete: (blob) => {
            console.log("Recording complete", blob.size);
            const url = URL.createObjectURL(blob);

            // Cleanup
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            stopAllStreams();

            fsmRef.current.transition("completed");
            updateState({
                status: "completed",
                recordedBlob: blob,
                recordedVideoUrl: url,
                recordingDuration
            });
        },
        onError: (err) => {
            console.error("Recording error", err);
            fsmRef.current.transition("error");
            updateState({ status: "error", error: err });
        }
    });


    // --- Helper to update state from FSM ---
    const updateState = (overrides?: Partial<BunnyRecordingState>) => {
        setState((prev) => ({
            ...prev,
            status: fsmRef.current.state,
            isRecording: fsmRef.current.state === "recording" || fsmRef.current.state === "stopping",
            recordingDuration: recordingDuration || prev.recordingDuration, // Sync duration
            ...overrides,
        }));
    };




    // --- Render Loop (Heartbeat Driven) ---
    const renderFrame = useCallback(() => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;

        // 1. Clear
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // 1. Draw Background
        drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, backgroundImageElementRef.current || background);

        // 2. Draw Screen
        if (screenVideoRef.current && screenVideoRef.current.readyState >= 2) {
            // Draw full screen
            ctx.drawImage(screenVideoRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            // Placeholder if screen is missing but we are recording?
            // Actually usually we just draw black.
            ctx.fillStyle = "#111"; // slightly lighter black
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = "#333";
            ctx.font = "40px sans-serif";
            ctx.fillText("Waiting for screen...", CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2);
        }

        // 3. Draw Camera (Circle or PiP)
        if (webcamVideoRef.current && webcamVideoRef.current.readyState >= 2 && cameraEnabled) {
            // Default layout: Bottom Right Circle
            const size = 400; // Fixed size for now
            const padding = 50;
            const x = CANVAS_WIDTH - size - padding;
            const y = CANVAS_HEIGHT - size - padding;

            ctx.save();
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.clip();
            // Draw video centered in circle, covering it
            // simple draw for now
            ctx.drawImage(webcamVideoRef.current, x, y, size, size);
            ctx.restore();

            // Border
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.lineWidth = 10;
            ctx.strokeStyle = "white";
            ctx.stroke();
        }

    }, [cameraEnabled, screenVideoRef, webcamVideoRef]);


    // --- Recording Control ---

    const startWorker = () => {
        if (workerRef.current) return;
        workerRef.current = new Worker(new URL("../../workers/heartbeat.worker.js", import.meta.url));

        workerRef.current.onmessage = (e) => {
            if (e.data === "tick") {
                renderFrame();
            }
        };
        workerRef.current.postMessage("start");
    };


    const startRecordingFn = async () => {
        if (!fsmRef.current.transition("initializing")) return;
        updateState();

        // Countdown
        setCountdownValue(3);
        for (let i = 3; i > 0; i--) {
            setCountdownValue(i);
            if (fsmRef.current.state !== "initializing") {
                setCountdownValue(null);
                return; // Cancelled
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        setCountdownValue(null);

        if (fsmRef.current.state !== "initializing") return;

        try {
            // 1. Init Canvas & Context
            if (!canvasRef.current) {
                const canvas = document.createElement("canvas");
                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;
                canvasRef.current = canvas;
                ctxRef.current = canvas.getContext("2d", { alpha: false });
            }

            // 2. Init Audio Mixing
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;
            const dest = audioCtx.createMediaStreamDestination();
            destNodeRef.current = dest;

            // Mix Mic
            if (micEnabled && microphoneStreamRef.current) {
                const micSource = audioCtx.createMediaStreamSource(microphoneStreamRef.current);
                // Add gain?
                const gain = audioCtx.createGain();
                gain.gain.value = 1.0;
                micSource.connect(gain).connect(dest);
            }
            // Mix Screen Audio
            if (screenPreviewStream) {
                // If screen has audio tracks. 
                // Note: screenPreviewStream is from useStreams.
                const tracks = screenPreviewStream.getAudioTracks();
                if (tracks.length > 0) {
                    const screenAudio = new MediaStream(tracks);
                    const screenSource = audioCtx.createMediaStreamSource(screenAudio);
                    const gain = audioCtx.createGain();
                    gain.gain.value = 0.8;
                    screenSource.connect(gain).connect(dest);
                }
            }

            // 3. Create Final Stream
            const canvasStream = canvasRef.current.captureStream(30);
            const finalStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...dest.stream.getAudioTracks()
            ]);

            setRecordingStream(finalStream);

            // 4. Start Heartbeat
            startWorker();

            // 5. Start MediaRecorder
            startMediaRecording(finalStream);

            fsmRef.current.transition("recording");
            updateState();

        } catch (e) {
            console.error("Failed to start", e);
            fsmRef.current.transition("error");
            updateState({ error: e as Error });
        }
    };

    const stopRecordingWrapper = () => {
        if (!fsmRef.current.transition("stopping")) return;
        updateState();

        // Stop worker driving the frame headers
        if (workerRef.current) workerRef.current.postMessage("stop");

        // Stop MediaRecorder (which will trigger onComplete -> cleanup)
        stopMediaRecording();
    };

    // Sync duration from hook to state
    useEffect(() => {
        setState(p => ({ ...p, recordingDuration }));

        // Auto-stop limit
        if (state.isRecording && recordingDuration >= 120) {
            stopRecordingWrapper();
        }
    }, [recordingDuration, state.isRecording]);


    const cancelCountdown = () => {
        fsmRef.current.transition("idle");
        updateState();
        setCountdownValue(null);
    };

    const resetRecording = () => {
        setState({
            status: "idle",
            isRecording: false,
            recordedBlob: null,
            recordedVideoUrl: "",
            recordingDuration: 0,
            error: null
        });
        fsmRef.current = new RecordingStateMachine();
        setCountdownValue(null);
        // Clean streams handled by UI usually? Or should we close them?
        // Usually user might want to keep camera open for next take.
        // But let's assume valid state is idle with permissions still there.
    };


    return {
        // State
        status: state.status,
        isRecording: state.isRecording,
        recordingDuration: state.recordingDuration,
        recordedVideoUrl: state.recordedVideoUrl,
        recordedBlob: state.recordedBlob,
        error: state.error,

        // Permissions & Streams (Passthrough)
        permissions,
        cameraEnabled,
        micEnabled,
        permissionError,
        permissionErrorType,
        webcamPreviewStream,
        screenPreviewStream,
        // Provide a combined preview stream if needed? 
        // The UI uses 'previewStream' for the main big monitor. 
        // If not recording, it's null. If recording, it's the canvas stream?
        // In the old code: "previewStream" was the canvas stream during recording.
        previewStream: recordingStream,

        // Actions
        requestCameraAndMic: startCamera, // Map to useStreams
        toggleCamera,
        toggleMic,
        toggleScreenShare: async () => {
            if (permissions.screen) stopScreen();
            else await startScreen();
        },

        startRecording: startRecordingFn,
        stopRecording: stopRecordingWrapper,
        resetRecording,

        // Metadata/Helpers
        canRecord: (cameraEnabled || permissions.screen),
        recordedSources: null, // Legacy? We are doing single file now? User asked for "MIME negotiation", maybe single file.
        // The existing code had "recordedSources" for separate blobs. 
        // New requirement says "onComplete(blob)". 
        // I will stick to single blob for simplicity as per requirement 2 "Call onComplete(blob)".

        MAX_RECORDING_DURATION: 120, // 2 mins
        canvasDimensions: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        countdownValue,
        cancelCountdown,
        background,
        setBackground,
    };
};
