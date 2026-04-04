import { useRef, useState, useCallback, useEffect } from "react";
import { setupRecording, calculateRecordingDuration } from "../record-utils"; // Reusing existing utils if possible, or recreating logic here as requested.

// Requirements say: "Move all MediaRecorder logic out of component."
// It also says: "MIME Negotiation Order: vp9 -> vp8 -> mp4"
// "Chunk Resilience: push to ref every 1s"
// "On Stop: Create blob from chunks"

interface UseRecordingProps {
    onComplete: (blob: Blob) => void;
    onError?: (error: Error) => void;
}

export function useRecording({ onComplete, onError }: UseRecordingProps) {
    // --- State ---
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);

    // --- Refs ---
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    console.log("chunksRef: ", chunksRef.current)
    console.log("startTimeRef: ", startTimeRef.current)
    console.log("timerIntervalRef: ", timerIntervalRef.current)
    console.log("isRecording: ", isRecording)
    console.log("recordingDuration: ", recordingDuration)

    // --- Helpers ---
    const getSupportedMimeType = () => {
        const types = [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/mp4",
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return "video/webm"; // Fallback
    };

    const startTimer = () => {
        startTimeRef.current = Date.now();
        setRecordingDuration(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        timerIntervalRef.current = setInterval(() => {
            if (startTimeRef.current) {
                const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
                setRecordingDuration(duration);
            }
        }, 1000);
    };

    const stopTimer = () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    };

    // --- Actions ---
    const startRecording = useCallback((stream: MediaStream) => {
        try {
            chunksRef.current = [];
            const mimeType = getSupportedMimeType();
            console.log(`[Recording] Starting with MIME: ${mimeType}`);

            const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 8000000, // 8 Mbps high quality
            });

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            // Handle stop event
            recorder.onstop = () => {
                console.log("[Recording] Stop event received");
                stopTimer();

                const blob = new Blob(chunksRef.current, { type: mimeType });
                console.log(`[Recording] Created blob size: ${blob.size}`);
                onComplete(blob);

                // Cleanup
                chunksRef.current = [];
                setIsRecording(false);
            };

            recorder.onerror = (event: any) => {
                console.error("[Recording] Error:", event.error);
                if (onError) onError(event.error);
                stopRecording();
            };

            // Start recording with 1s timeslices for chunk resilience
            recorder.start(1000);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            startTimer();

        } catch (error: any) {
            console.error("[Recording] Setup Failed:", error);
            if (onError) onError(error);
        }
    }, [onComplete, onError]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            console.log("[Recording] Stopping...");
            mediaRecorderRef.current.stop(); // triggers onstop
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTimer();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    return {
        isRecording,
        recordingDuration,
        startRecording,
        stopRecording,
    };
}
