"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Pause,
  Square,
  Video,
  VideoOff,
  RefreshCw,
  Trash2,
  Upload,
  Copy,
  ExternalLink,
  AlertTriangle,
  Mic,
  MicOff,
  MonitorUp,
  MoreVertical,
  PhoneOff,
  Smile,
  Hand,
  LayoutDashboard,
  ScrollText,
  Share,
  Disc,
} from "lucide-react";
import { usePiPRecording } from "@/lib/hooks/usePiPRecording";
import { Progress } from "@/components/ui/progress";

// FSM State Definition
// Idle -> Recording <-> Paused -> Stopping -> Completed -> Uploading -> Share Ready
type RecordingState =
  | "idle"
  | "recording"
  | "paused"
  | "stopping"
  | "completed"
  | "uploading"
  | "share-ready";

export default function RecordingInterface() {
  // Main finite state machine for the UI
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [webcamEnabled, setWebcamEnabled] = useState(true);

  // Review State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareLink, setShareLink] = useState("");
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");

  // Webcam UI State
  const [webcamPos, setWebcamPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
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
    toggleWebcam,
    recordedBlob,
    recordedVideoUrl,
    resetRecording,
  } = usePiPRecording();

  const [overlaySize, setOverlaySize] = useState(160);

  // --- Dynamic UI Sizing ---
  // --- Dynamic UI Sizing ---
  /**
   * Calculates the size of the webcam overlay relative to the container width.
   * Maintains a consistent visual ratio across different screen sizes.
   */
  const updateOverlaySize = useCallback(() => {
    //The useCallback hook is used here for Referential Stability and Performance.
    //Preventing Infinite loops / Re-binding:
    //Without useCallback, the updateOverlaySize function would be redefined completely on every single component render, leading to potential infinite loops or unnecessary re-renders.
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      const calculatedSize = (width / 1920) * 320;
      setOverlaySize(calculatedSize);
    }
  }, []);

  // Initialize UI position & Size
  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      const container = containerRef.current.getBoundingClientRect();
      // Default: Bottom Right
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

  // --- Drag Logic ---
  /**
   * Handles dragging of the PiP webcam overlay within the preview container.
   * Updates local UI state immediately for smoothness, then syncs with the
   * canvas compositor via setWebcamConfig.
   */
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

  // --- FSM Transitions & Logic ---

  // 1. DIRECT Start Recording (Fixes Infinite Loop)
  /**
   * Triggers the start of the recording session.
   * Updates state to 'recording' only after successful stream initialization.
   */
  const handleStartRecording = async () => {
    try {
      await startRecording(webcamEnabled);
      setRecordingState("recording");
    } catch (error) {
      console.error("User cancelled or failed to start", error);
      setRecordingState("idle");
    }
  };

  // 2. Stop Recording -> Just trigger stop, effect handles transition
  const handleStopRecording = () => {
    setRecordingState("stopping");
    stopRecording();
  };

  const handlePause = () => {
    if (recordingState === "recording") setRecordingState("paused");
    else if (recordingState === "paused") setRecordingState("recording");
    // Note: Actual MediaRecorder pausing logic would go here if hook supported it
  };

  // 3. Monitor Stream Ends (e.g. user stops sharing via browser UI)
  useEffect(() => {
    if (isRecording && previewStream) {
      const track = previewStream.getVideoTracks()[0];
      if (track) {
        const handleTrackEnded = () => {
          setRecordingState("stopping");
          // Hook handles cleanup internally
        };
        track.addEventListener("ended", handleTrackEnded);
        return () => track.removeEventListener("ended", handleTrackEnded);
      }
    }
  }, [isRecording, previewStream]);

  // 4. "Stopping" -> "Completed" when Blob is ready
  useEffect(() => {
    if (recordingState === "stopping" && recordedBlob) {
      setRecordingState("completed");
    }
  }, [recordingState, recordedBlob]);

  // Handle Runtime Webcam Toggle
  useEffect(() => {
    if (isRecording) {
      toggleWebcam(webcamEnabled);
    }
  }, [webcamEnabled, isRecording, toggleWebcam]);

  // --- Preview Logic ---
  useEffect(() => {
    if (!previewVideoRef.current) return;
    // Show stream only in active states
    if (
      previewStream &&
      (recordingState === "idle" ||
        recordingState === "recording" ||
        recordingState === "paused")
    ) {
      previewVideoRef.current.srcObject = previewStream;
      previewVideoRef.current.play().catch(() => { });
    } else {
      previewVideoRef.current.srcObject = null;
    }
  }, [previewStream, recordingState]);

  // --- Actions ---

  const handleDiscard = () => {
    resetRecording();
    setRecordingState("idle");
    setShowDiscardDialog(false);
    setUploadProgress(0);
    setVideoTitle("");
  };

  const handleRestart = () => {
    handleDiscard(); // Same cleanup logic
  };

  const handleUpload = async () => {
    setRecordingState("uploading");

    // Simulate Upload
    const totalSteps = 100;
    for (let i = 0; i <= totalSteps; i++) {
      await new Promise((r) => setTimeout(r, 30)); // 3 sec total
      setUploadProgress(i);
    }

    setShareLink(
      `https://snap-cut.com/v/${Math.random().toString(36).substring(7)}`,
    );
    setRecordingState("share-ready");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  // --- Render Helpers ---

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // --- Views ---

  // 1. STOPPING STATE (Blocking Modal)
  if (recordingState === "stopping") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-card p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full border border-white/10">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold">Finalizing recording...</h3>
            <p className="text-muted-foreground text-sm">
              Saving video and cleaning up. Please don't close this tab.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN WRAPPER
  return (
    <main className="flex-1 w-full min-h-screen bg-background p-6">
      {/* RECORDING / IDLE VIEW */}
      {/* RECORDING / IDLE VIEW */}
      {(recordingState === "idle" ||
        recordingState === "recording" ||
        recordingState === "paused") && (
          <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#202124] text-white rounded-lg overflow-hidden">
            {/* 1. VIDEO AREA */}
            <div className="flex-1 flex items-center justify-center p-4 min-h-0 relative">
              <div
                ref={containerRef}
                className="relative w-full max-w-5xl aspect-video bg-[#3c4043] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/5 group"
              >
                {/* LIVE PREVIEW */}
                <video
                  ref={previewVideoRef}
                  muted
                  playsInline
                  autoPlay
                  className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${previewStream ? "opacity-100" : "opacity-0"}`}
                />

                {/* STATUS INDICATORS (Top Left) */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  {recordingState === "recording" && (
                    <div className="flex items-center gap-2 bg-red-600/90 text-white px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg animate-in slide-in-from-top-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-xs font-bold tracking-wider uppercase">
                        REC
                      </span>
                    </div>
                  )}
                  {recordingState === "paused" && (
                    <div className="flex items-center gap-2 bg-amber-500/90 text-white px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg">
                      <Pause className="w-3 h-3 fill-current" />
                      <span className="text-xs font-bold tracking-wider uppercase">
                        Paused
                      </span>
                    </div>
                  )}
                </div>

                {/* TIMER (Top Right) */}
                {recordingState !== "idle" && (
                  <div className="absolute top-4 right-4 z-10 bg-black/40 text-white px-3 py-1.5 rounded-md font-mono text-sm font-medium backdrop-blur-md">
                    {formatTime(recordingDuration)}
                  </div>
                )}

                {/* WEBCAM OVERLAY */}
                {webcamEnabled && previewStream && isInitialized && (
                  <div
                    onMouseDown={handleMouseDown}
                    className="absolute z-20 cursor-move rounded-lg overflow-hidden shadow-lg ring-1 ring-white/20 hover:ring-white/40 transition-all duration-200"
                    style={{
                      left: webcamPos.x,
                      top: webcamPos.y,
                      width: `${overlaySize}px`,
                      height: `${overlaySize}px`,
                    }}
                  >
                    {/* The actual webcam internal rendering is handled by the canvas compositor, 
                        but we can add a visual border or effect here if needed. */}
                    <div className="w-full h-full bg-transparent" />
                  </div>
                )}

                {/* IDLE PLACEHOLDER */}
                {!previewStream && recordingState === "idle" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-8">
                    <div className="w-24 h-24 rounded-full bg-[#303134] flex items-center justify-center mb-4">
                      <Video className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. CONTROL BAR (Bottom) */}
            <div className="h-20 shrink-0 flex items-center justify-center gap-3 pb-4 px-4">
              {/* Start/Stop Button (Primary) */}
              {recordingState === "idle" ? (
                <div className="flex flex-col items-center gap-2 group">
                  <button
                    onClick={handleStartRecording}
                    className="relative w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-xl hover:shadow-2xl hover:shadow-red-500/30 transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-500/40"
                    aria-label="Start recording"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-white" />
                    </div>
                  </button>
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Record</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      Click to start
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 group">
                  <button
                    onClick={handleStopRecording}
                    className="relative w-14 h-14 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-xl hover:shadow-2xl transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-gray-500/40"
                    aria-label="Stop recording"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-red-500 rounded-sm" />
                    </div>
                    {/* Pulsing animation */}
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/40 animate-ping" />
                  </button>
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        Recording
                      </span>
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      Click to stop
                    </p>
                  </div>
                </div>
              )}

              <div className="w-px h-8 bg-[#5f6368] mx-2 opacity-50" />

              {/* Mic (Visual Toggle) */}
              <ControlBtn
                icon={Mic}
                label="Mic"
                active={true} // Always "on" visually for now
                onClick={() => { }}
              />

              {/* Camera Toggle */}
              <ControlBtn
                icon={webcamEnabled ? Video : VideoOff}
                label="Camera"
                active={webcamEnabled}
                onClick={() => setWebcamEnabled(!webcamEnabled)}
                offState={!webcamEnabled}
              />

              {/* Placeholder Controls */}
              <ControlBtn icon={Smile} label="React" />
              <ControlBtn icon={MonitorUp} label="Present" />
              <ControlBtn icon={Hand} label="Raise hand" />
              <ControlBtn icon={MoreVertical} label="More" />

              <div className="w-px h-8 bg-[#5f6368] mx-2 opacity-50" />

              {/* End Call Button */}
              <ControlBtn
                icon={PhoneOff}
                label="Leave"
                variant="danger"
                onClick={() => {
                  if (recordingState === "recording") handleStopRecording();
                  else setRecordingState("idle"); // Just reset
                }}
              />
            </div>
          </div>
        )}

      {/* REVIEW VIEW (Completed) */}
      {(recordingState === "completed" ||
        recordingState === "uploading" ||
        recordingState === "share-ready") && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-6 h-[calc(100vh-3rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* LEFT COLUMN: Video */}
            <div className="flex flex-col gap-4 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <h2 className="text-2xl font-bold tracking-tight">
                  Review Recording
                </h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="font-mono">
                    {formatTime(recordingDuration)} recorded
                  </span>
                </div>
              </div>

              <div className="relative w-full flex-1 bg-black rounded-xl overflow-hidden shadow-2xl border border-border/50">
                {recordedVideoUrl && (
                  <video
                    src={recordedVideoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Action Card */}
            <div className="flex flex-col justify-center">
              <div className="bg-card border rounded-xl p-6 shadow-lg space-y-6 w-full">
                {/* Input / Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Title / Description
                    </label>
                    <input
                      type="text"
                      placeholder="What is this recording about?"
                      className="w-full bg-background border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      disabled={recordingState !== "completed"}
                    />
                  </div>
                </div>

                {/* UPLOADING STATE */}
                {recordingState === "uploading" && (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-primary">
                        Uploading video...
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {uploadProgress}%
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      Uploading directly to server. We never see your video.
                    </p>
                  </div>
                )}

                {/* SHARE READY STATE */}
                {recordingState === "share-ready" && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3 text-green-500 mb-2">
                      <div className="p-2 bg-green-500/20 rounded-full">
                        <ExternalLink className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg">
                        Your recording is ready!
                      </h3>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 bg-background border px-4 py-2 rounded-lg font-mono text-sm flex items-center overflow-hidden">
                        <span className="truncate">{shareLink}</span>
                      </div>
                      <Button
                        onClick={handleCopyLink}
                        className="shrink-0 gap-2"
                      >
                        <Copy className="w-4 h-4" /> Copy
                      </Button>
                      <Button
                        variant="outline"
                        asChild
                        className="shrink-0 gap-2"
                      >
                        <a
                          href={shareLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>

                    <div className="pt-4 border-t border-green-500/10 flex justify-center">
                      <Button
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setRecordingState("idle");
                          resetRecording();
                          setShareLink("");
                          setVideoTitle("");
                        }}
                      >
                        Record another
                      </Button>
                    </div>
                  </div>
                )}

                {/* COMPLETED STATE (Buttons) */}
                {recordingState === "completed" && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground gap-2"
                        onClick={handleRestart}
                      >
                        <RefreshCw className="w-4 h-4" /> Restart
                      </Button>

                      <div className="relative">
                        <Button
                          variant="ghost"
                          className="text-red-400 hover:text-red-500 hover:bg-red-500/10 gap-2"
                          onClick={() => setShowDiscardDialog(true)}
                        >
                          <Trash2 className="w-4 h-4" /> Discard
                        </Button>

                        {/* Inline Discard Confirm */}
                        {showDiscardDialog && (
                          <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-lg shadow-xl p-4 z-50 animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="font-semibold text-sm mb-2">
                              Discard this recording?
                            </h4>
                            <p className="text-xs text-muted-foreground mb-3">
                              This cannot be undone.
                            </p>
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowDiscardDialog(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleDiscard}
                              >
                                Discard
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 gap-2"
                      onClick={handleUpload}
                    >
                      <Upload className="w-4 h-4" /> Upload & Share
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

// Helper Component for Control Buttons
function ControlBtn({
  icon: Icon,
  label,
  onClick,
  active = false,
  offState = false,
  variant = "default",
}: {
  icon: any;
  label: string;
  onClick?: () => void;
  active?: boolean;
  offState?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <div className="flex flex-col items-center gap-2 group/btn">
      <button
        onClick={onClick}
        className={`h-11 w-11 rounded-full flex items-center justify-center transition-all duration-200 
          ${variant === "danger"
            ? "bg-[#ea4335] hover:bg-[#d93025] text-white"
            : offState
              ? "bg-[#ea4335] hover:bg-[#d93025] text-white"
              : "bg-[#3c4043] hover:bg-[#45484c] text-white"
          }
          ${!offState && variant !== "danger"
            ? "hover:scale-110"
            : ""
          }
        `}
      >
        <Icon className="w-5 h-5" />
      </button>
      <span className="text-[10px] text-gray-400 opacity-0 group-hover/btn:opacity-100 transition-opacity absolute -top-8 bg-black/80 px-2 py-1 rounded">
        {label}
      </span>
    </div>
  );
}

