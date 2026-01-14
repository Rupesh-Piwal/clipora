"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Circle, Pause, Square, Video, Settings, Clock } from "lucide-react";
import { usePiPRecording } from "@/lib/hooks/usePiPRecording";

type RecordingState = "idle" | "recording" | "paused";

export default function RecordingInterface() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(true);

  // Webcam UI State
  const [webcamPos, setWebcamPos] = useState({ x: 0, y: 0 }); // Will init on mount
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // To hide until positioned
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    previewStream,
    setWebcamConfig,
    canvasDimensions,
    toggleWebcam
  } = usePiPRecording();

  // Calculate dynamic UI size for webcam based on container
  const [overlaySize, setOverlaySize] = useState(160);

  const updateOverlaySize = useCallback(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      // Canvas is 1920. Webcam is 320.
      // UI Size = (Content Width / 1920) * 320
      const calculatedSize = (width / 1920) * 320;
      setOverlaySize(calculatedSize);
    }
  }, []);

  // Initialize UI position & Size
  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      const container = containerRef.current.getBoundingClientRect();
      // Default Canvas Config: 
      // x: 1920 - 320 - 20 = 1580
      // y: 1080 - 320 - 20 = 740 (Square 320x320)
      const defaultCanvasX = 1580;
      const defaultCanvasY = 740;

      const scaleX = container.width / canvasDimensions.width;
      const scaleY = container.height / canvasDimensions.height;

      // Initial Size
      const calculatedSize = (container.width / 1920) * 320;
      setOverlaySize(calculatedSize);

      setWebcamPos({
        x: defaultCanvasX * scaleX,
        y: defaultCanvasY * scaleY
      });
      setIsInitialized(true);
    }
  }, [containerRef.current, canvasDimensions, isInitialized]);

  // Handle Resize
  useEffect(() => {
    window.addEventListener('resize', updateOverlaySize);
    return () => window.removeEventListener('resize', updateOverlaySize);
  }, [updateOverlaySize]);

  /* --------------------------------------------
     Drag Logic
  --------------------------------------------- */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!webcamEnabled) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...webcamPos };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      const container = containerRef.current.getBoundingClientRect();
      const boxSize = overlaySize;

      const newX = Math.min(Math.max(0, initialPosRef.current.x + deltaX), container.width - boxSize);
      const newY = Math.min(Math.max(0, initialPosRef.current.y + deltaY), container.height - boxSize);

      setWebcamPos({ x: newX, y: newY });

      // Sync with Canvas
      const scaleX = canvasDimensions.width / container.width;
      const scaleY = canvasDimensions.height / container.height;

      setWebcamConfig({
        x: newX * scaleX,
        y: newY * scaleY,
        width: 320,
        height: 320
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, canvasDimensions, setWebcamConfig]);

  /* --------------------------------------------
     Sync UI state → Recording engine
  --------------------------------------------- */
  useEffect(() => {
    // 1. Handle Start/Stop
    if (recordingState === "recording" && !isRecording) {
      startRecording(webcamEnabled);
    }

    if (recordingState === "idle" && isRecording) {
      stopRecording();
    }
  }, [recordingState, isRecording]); // Removed webcamEnabled from dependency to avoid restart

  // 2. Handle Runtime Webcam Toggle
  useEffect(() => {
    if (isRecording) {
      toggleWebcam(webcamEnabled);
    }
  }, [webcamEnabled, isRecording, toggleWebcam]);

  useEffect(() => {
    if (!previewVideoRef.current) return;

    if (previewStream) {
      previewVideoRef.current.srcObject = previewStream;
      previewVideoRef.current.play().catch(() => { });
    } else {
      previewVideoRef.current.srcObject = null;
    }
  }, [previewStream]);

  /* --------------------------------------------
     Keyboard shortcuts
  --------------------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;

      switch (e.key.toLowerCase()) {
        case "r":
          e.preventDefault();
          if (recordingState === "idle") {
            setRecordingState("recording");
          }
          break;

        case "p":
          e.preventDefault();
          if (recordingState === "recording") {
            setRecordingState("paused");
          } else if (recordingState === "paused") {
            setRecordingState("recording");
          }
          break;

        case "s":
          e.preventDefault();
          setRecordingState("idle");
          break;

        case "w":
          e.preventDefault();
          setWebcamEnabled((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recordingState]);

  /* --------------------------------------------
     Helpers
  --------------------------------------------- */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  /* --------------------------------------------
     UI
  --------------------------------------------- */
  return (
    <main className="flex-1">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 max-w-7xl mx-auto">
        {/* Main Recording Area */}
        <div className="lg:col-span-3">
          <div className="space-y-4">
            {/* Preview Canvas */}
            <div
              ref={containerRef}
              className={`relative w-full rounded-lg overflow-hidden aspect-video border-2 transition-all duration-200 ${recordingState === "recording"
                ? "border-red-500 shadow-lg shadow-red-500/20"
                : recordingState === "paused"
                  ? "border-amber-500 shadow-lg shadow-amber-500/20"
                  : "border-border"
                }`}
            >
              {/* LIVE SCREEN PREVIEW */}
              {previewStream && (
                <video
                  ref={previewVideoRef}
                  muted
                  playsInline
                  autoPlay
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                />
              )}

              {/* Status */}
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                {recordingState === "recording" && (
                  <div className="flex items-center gap-2 bg-red-500/90 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-sm font-semibold">Recording</span>
                  </div>
                )}
                {recordingState === "paused" && (
                  <div className="flex items-center gap-2 bg-amber-500/90 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
                    <div className="w-2 h-2 bg-white" />
                    <span className="text-sm font-semibold">Paused</span>
                  </div>
                )}
              </div>

              {/* Timer */}
              <div className="absolute top-4 right-4 z-10 bg-black/60 text-white px-4 py-2 rounded-lg font-mono text-lg pointer-events-none">
                {formatTime(recordingDuration)}
              </div>

              {/* DRAGGABLE WEBCAM OVERLAY */}
              {webcamEnabled && previewStream && isInitialized && (
                <div
                  onMouseDown={handleMouseDown}
                  className="absolute z-20 cursor-move group"
                  style={{
                    left: webcamPos.x,
                    top: webcamPos.y,
                    width: `${overlaySize}px`,
                    height: `${overlaySize}px`,
                  }}
                >
                  <div className="w-full h-full rounded-full cursor-move" />
                </div>
              )}

              {/* Idle Placeholder */}
              {!previewStream && recordingState === "idle" && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-black">
                  <Video className="w-8 h-8 text-gray-400" />
                  <p className="text-gray-400 text-sm">
                    Click Record to start capturing your screen
                  </p>
                  <p className="text-gray-500 text-xs">
                    Press Ctrl + R to start
                  </p>
                </div>
              )}
            </div>

            {/* Control Bar */}
            <div className="flex items-center justify-center gap-4 bg-card border rounded-lg p-6">
              {/* Record */}
              <Button
                onClick={() => setRecordingState("recording")}
                disabled={recordingState !== "idle"}
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white rounded-full w-14 h-14 p-0"
              >
                <Circle className="w-6 h-6 fill-current" />
              </Button>

              {/* Stop */}
              <Button
                onClick={() => setRecordingState("idle")}
                disabled={recordingState === "idle"}
                size="lg"
                variant="destructive"
                className="rounded-full w-14 h-14 p-0"
              >
                <Square className="w-6 h-6 fill-current" />
              </Button>

              <div className="w-px h-8 bg-border mx-2" />

              {/* Webcam */}
              <Button
                onClick={() => setWebcamEnabled((p) => !p)}
                variant={webcamEnabled ? "default" : "outline"}
                size="lg"
                className="rounded-full w-14 h-14 p-0"
              >
                <Video className="w-6 h-6" />
              </Button>

              {/* Settings */}
              <Button
                onClick={() => setShowSettings((p) => !p)}
                variant="outline"
                size="lg"
                className="rounded-full w-14 h-14 p-0"
              >
                <Settings className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
