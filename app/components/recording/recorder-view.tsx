import React, { useRef, useState, useEffect, useCallback } from "react";
import { Video, Timer, Mic, ScreenShare, CheckCircle2, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { ControlBar } from "./control-bar";
import { formatTime } from "./utils";
import { Button } from "@/components/ui/button";

interface RecorderViewProps {
  status:
  | "idle"
  | "recording"
  | "initializing"
  | "stopping"
  | "completed"
  | "error";
  webcamEnabled: boolean;
  previewStream: MediaStream | null;
  recordingDuration: number;
  MAX_RECORDING_DURATION: number;
  canvasDimensions: { width: number; height: number };
  setWebcamConfig: (config: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleWebcam: () => void;
  micEnabled: boolean;
  onToggleMic: () => void;
  // New Props
  permissions: { camera: boolean; mic: boolean; screen: boolean };
  onRequestCameraMic: () => void;
  onRequestScreen: () => void;
}

export function RecorderView({
  status,
  webcamEnabled,
  previewStream,
  recordingDuration,
  MAX_RECORDING_DURATION,
  canvasDimensions,
  setWebcamConfig,
  onStartRecording,
  onStopRecording,
  onToggleWebcam,
  micEnabled,
  onToggleMic,
  permissions,
  onRequestCameraMic,
  onRequestScreen,
}: RecorderViewProps) {
  // --- Refs & State ---
  const containerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  const [webcamPos, setWebcamPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });
  const [overlaySize, setOverlaySize] = useState(160);

  // --- Helpers ---
  const updateOverlaySize = useCallback(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      const calculatedSize = (width / 1920) * 320;
      setOverlaySize(calculatedSize);
    }
  }, []);

  // --- Initialization & Resizing ---
  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      const container = containerRef.current.getBoundingClientRect();
      const defaultCanvasX = 1580;
      const defaultCanvasY = 740;

      const scaleX = container.width / canvasDimensions.width;
      const scaleY = container.height / canvasDimensions.height;

      const calculatedSize = (container.width / 1920) * 320;

      setOverlaySize(calculatedSize);
      setWebcamPos({
        x: defaultCanvasX * scaleX,
        y: defaultCanvasY * scaleY,
      });
      setIsInitialized(true);
    }
  }, [containerRef.current, canvasDimensions, isInitialized]);

  useEffect(() => {
    window.addEventListener("resize", updateOverlaySize);
    return () => window.removeEventListener("resize", updateOverlaySize);
  }, [updateOverlaySize]);

  // --- Dragging Logic ---
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

      const newX = Math.min(
        Math.max(0, initialPosRef.current.x + deltaX),
        container.width - boxSize,
      );
      const newY = Math.min(
        Math.max(0, initialPosRef.current.y + deltaY),
        container.height - boxSize,
      );

      setWebcamPos({ x: newX, y: newY });

      // Sync with Canvas
      const scaleX = canvasDimensions.width / container.width;
      const scaleY = canvasDimensions.height / container.height;

      setWebcamConfig({
        x: newX * scaleX,
        y: newY * scaleY,
        width: 320,
        height: 320,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, canvasDimensions, setWebcamConfig, overlaySize]);

  // --- Video Source ---
  useEffect(() => {
    if (!previewVideoRef.current) return;
    if (
      previewStream &&
      (status === "idle" ||
        status === "recording" ||
        status === "initializing" ||
        status === "stopping")
    ) {
      previewVideoRef.current.srcObject = previewStream;
    } else {
      previewVideoRef.current.srcObject = null;
    }
  }, [previewStream, status]);

  const remainingTime = MAX_RECORDING_DURATION - recordingDuration;
  const isTimeRunningLow = remainingTime <= 10;

  const hasCamMic = permissions.camera || permissions.mic;
  const hasScreen = permissions.screen;

  return (
    <div className="flex flex-col text-white overflow-hidden min-h-screen bg-[#0a0a0a]">
      {/* VIDEO AREA */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div
          ref={containerRef}
          className="relative w-full max-w-7xl h-[calc(100vh-120px)] bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        >
          {/* Live Preview (Main Scene) */}
          <video
            ref={previewVideoRef}
            muted
            playsInline
            autoPlay
            className={cn(
              "absolute inset-0 w-full h-full object-contain transition-opacity duration-500",
              previewStream ? "opacity-100" : "opacity-0",
            )}
          />

          {/* OVERLAYS */}
          <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
            {status === "recording" && (
              <div className="flex items-center gap-2.5 bg-red-500/15 text-red-400 px-4 py-2 rounded-full backdrop-blur-xl border border-red-500/20 shadow-lg animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <span className="text-sm font-semibold tracking-wide">
                  REC
                </span>
              </div>
            )}
          </div>

          {status === "recording" && (
            <div
              className={cn(
                "absolute top-6 right-6 z-10 px-4 py-2 rounded-full font-mono text-sm font-medium backdrop-blur-xl transition-all duration-300 flex items-center gap-2.5 border shadow-lg",
                isTimeRunningLow
                  ? "bg-red-500/15 text-red-400 border-red-500/20 animate-pulse"
                  : "bg-white/5 text-white border-white/10",
              )}
            >
              <Timer className="w-4 h-4" />
              <span className="font-semibold">{formatTime(recordingDuration)}</span>
              <span className="opacity-50 text-xs font-normal">
                / {formatTime(MAX_RECORDING_DURATION)}
              </span>
            </div>
          )}

          {/* Draggable Webcam Overlay (Canvas visualization replica for dragging) */}
          {webcamEnabled && previewStream && isInitialized && (
            <div
              onMouseDown={handleMouseDown}
              className="absolute z-20 cursor-move rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20 hover:ring-white/40 transition-all duration-300 hover:scale-105"
              style={{
                left: webcamPos.x,
                top: webcamPos.y,
                width: `${overlaySize}px`,
                height: `${overlaySize}px`,
              }}
            >
              <div className="w-full h-full bg-transparent backdrop-blur-sm" />
            </div>
          )}

          {/* Setup Flow (Idle State) */}
          {!previewStream && status === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#1a1a1a]">
              <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">Get Started</h3>
                  <p className="text-white/40 text-sm">Enable permissions to start recording</p>
                </div>

                <div className="space-y-4">
                  {/* Step 1: Camera & Mic */}
                  <div className={cn(
                    "p-4 rounded-xl border transition-all duration-300 flex items-center justify-between",
                    hasCamMic ? "bg-green-500/10 border-green-500/20" : "bg-white/5 border-white/10"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg", hasCamMic ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60")}>
                        <Video className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Camera & Microphone</div>
                        <div className="text-xs text-white/40">Required for video and audio</div>
                      </div>
                    </div>
                    {hasCamMic ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <Button onClick={onRequestCameraMic} variant="secondary" size="sm" className="h-8 text-xs">
                        Enable
                      </Button>
                    )}
                  </div>

                  {/* Step 2: Screen */}
                  <div className={cn(
                    "p-4 rounded-xl border transition-all duration-300 flex items-center justify-between",
                    hasScreen ? "bg-green-500/10 border-green-500/20" : "bg-white/5 border-white/10"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg", hasScreen ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60")}>
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Screen Share</div>
                        <div className="text-xs text-white/40">Choose a tab, window, or screen</div>
                      </div>
                    </div>
                    {hasScreen ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <Button onClick={onRequestScreen} variant="secondary" size="sm" className="h-8 text-xs">
                        Share Screen
                      </Button>
                    )}
                  </div>
                </div>

                {/* Step 3: Record Action */}
                {/* <div className="pt-4 flex justify-center">
                  <Button
                    size="lg"
                    className={cn(
                      "w-full font-semibold transition-all duration-300",
                      (hasScreen)
                        ? "bg-white hover:bg-gray-200 text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        : "opacity-50 cursor-not-allowed bg-white/10 text-white/40"
                    )}
                    disabled={!hasScreen}
                    onClick={onStartRecording}
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse" />
                    Start Recording
                  </Button>
                </div> */}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONTROLS (Only visible when permissions are set or recording) */}

      <ControlBar
        status={status}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        webcamEnabled={webcamEnabled}
        onToggleWebcam={onToggleWebcam}
        micEnabled={micEnabled}
        onToggleMic={onToggleMic}
        recordingDuration={recordingDuration}
        onReset={() => { }}
        onPause={() => { }}
        onDelete={() => { }}
      />

    </div>
  );
}
