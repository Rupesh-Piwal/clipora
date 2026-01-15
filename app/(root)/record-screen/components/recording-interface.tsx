"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Square, Video, RefreshCw, Trash2, Upload, Copy, ExternalLink, AlertTriangle } from "lucide-react";
import { usePiPRecording } from "@/lib/hooks/usePiPRecording";
import { Progress } from "@/components/ui/progress";

// FSM State Definition
type RecordingState = "idle" | "recording" | "paused" | "stopping" | "completed" | "uploading" | "share-ready";

export default function RecordingInterface() {
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
    resetRecording
  } = usePiPRecording();

  const [overlaySize, setOverlaySize] = useState(160);

  // --- Dynamic UI Sizing ---
  const updateOverlaySize = useCallback(() => {
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
        y: defaultCanvasY * scaleY
      });
      setIsInitialized(true);
    }
  }, [containerRef.current, canvasDimensions, isInitialized]);

  useEffect(() => {
    window.addEventListener('resize', updateOverlaySize);
    return () => window.removeEventListener('resize', updateOverlaySize);
  }, [updateOverlaySize]);

  // --- Drag Logic ---
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
        track.addEventListener('ended', handleTrackEnded);
        return () => track.removeEventListener('ended', handleTrackEnded);
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
    if (previewStream && (recordingState === "idle" || recordingState === "recording" || recordingState === "paused")) {
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
      await new Promise(r => setTimeout(r, 30)); // 3 sec total
      setUploadProgress(i);
    }

    setShareLink(`https://snap-cut.com/v/${Math.random().toString(36).substring(7)}`);
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
            <p className="text-muted-foreground text-sm">Saving video and cleaning up. Please don't close this tab.</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN WRAPPER
  return (
    <main className="flex-1 w-full min-h-screen bg-background">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 max-w-7xl mx-auto h-full">

        {/* Main Area */}
        <div className="lg:col-span-3 flex flex-col gap-6">

          {/* RECORDING / IDLE VIEW */}
          {(recordingState === "idle" || recordingState === "recording" || recordingState === "paused") && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Preview Canvas */}
              <div
                ref={containerRef}
                className={`relative w-full rounded-xl overflow-hidden aspect-video border-2 transition-all duration-300 ${recordingState === "recording" ? "border-red-500 shadow-2xl shadow-red-500/20" :
                  recordingState === "paused" ? "border-amber-500 shadow-xl shadow-amber-500/20" : "border-border/50 bg-black/50"
                  }`}
              >
                {/* LIVE PREVIEW */}
                <video
                  ref={previewVideoRef}
                  muted
                  playsInline
                  autoPlay
                  className={`absolute inset-0 w-full h-full object-contain bg-black transition-opacity duration-300 ${previewStream ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Status Overlay */}
                <div className="absolute top-6 left-6 z-10 pointer-events-none flex items-center gap-3">
                  {recordingState === "recording" && (
                    <div className="flex items-center gap-2 bg-red-500/90 text-white px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg animate-in slide-in-from-top-2">
                      <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-sm" />
                      <span className="text-sm font-bold tracking-wide">Recording</span>
                    </div>
                  )}
                  {recordingState === "paused" && (
                    <div className="flex items-center gap-2 bg-amber-500/90 text-white px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg">
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span className="text-sm font-bold tracking-wide">Paused</span>
                    </div>
                  )}
                </div>

                {/* Timer */}
                {recordingState !== "idle" && (
                  <div className="absolute top-6 right-6 z-10 bg-black/60 text-white px-4 py-1.5 rounded-full font-mono text-lg font-medium backdrop-blur-md border border-white/10 shadow-lg">
                    {formatTime(recordingDuration)}
                  </div>
                )}

                {/* Webcam Overlay */}
                {webcamEnabled && previewStream && isInitialized && (
                  <div
                    onMouseDown={handleMouseDown}
                    className="absolute z-20 cursor-move group hover:scale-105 transition-transform duration-200"
                    style={{
                      left: webcamPos.x,
                      top: webcamPos.y,
                      width: `${overlaySize}px`,
                      height: `${overlaySize}px`,
                    }}
                  >
                    {/* Visual only - the actual video is in the canvas */}
                    {/* <div className="w-full h-full rounded-full border-4 border-white/20 shadow-2xl bg-black/10 backdrop-blur-sm group-hover:border-white/40 transition-colors" /> */}
                  </div>
                )}

                {/* IDLE PLACEHOLDER */}
                {!previewStream && recordingState === "idle" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-gray-900 to-black text-center p-8">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center ring-1 ring-white/10 shadow-2xl">
                      <Video className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">Ready to Record</h3>
                      <p className="text-muted-foreground max-w-sm">
                        Capture your screen and camera with professional quality.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* CONTROLS */}
              <div className="flex items-center justify-center gap-6 bg-card/60 backdrop-blur-lg border rounded-2xl p-6 shadow-sm">
                <Button
                  onClick={handleStartRecording}
                  disabled={recordingState !== "idle"}
                  className={`rounded-full w-16 h-16 p-0 shadow-xl transition-all hover:scale-105 active:scale-95 ${recordingState === "idle" ? "bg-red-500 hover:bg-red-600" : "opacity-50 grayscale"}`}
                >
                  <div className={`rounded-full border-2 border-white/20 ${recordingState === 'idle' ? 'w-6 h-6 bg-white' : 'w-6 h-6 border-white'}`} />
                </Button>

                <Button
                  onClick={handleStopRecording}
                  disabled={recordingState === "idle"}
                  variant="destructive"
                  className="rounded-full w-16 h-16 p-0 shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  <Square className="w-6 h-6 fill-current" />
                </Button>

                <div className="w-px h-10 bg-border/50 mx-2" />

                <Button
                  onClick={() => setWebcamEnabled((p) => !p)}
                  variant={webcamEnabled ? "default" : "secondary"}
                  className="rounded-full w-12 h-12 p-0 shadow-md transition-all"
                  disabled={recordingState !== "idle" && recordingState !== "recording"} // Allow toggle during recording
                >
                  <Video className={`w-5 h-5 ${webcamEnabled ? "text-white" : "text-muted-foreground"}`} />
                </Button>
              </div>
            </div>
          )}


          {/* REVIEW VIEW (Completed) */}
          {(recordingState === "completed" || recordingState === "uploading" || recordingState === "share-ready") && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Review Recording</h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="font-mono">{formatTime(recordingDuration)} recorded</span>
                </div>
              </div>

              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-border/50">
                {recordedVideoUrl && (
                  <video
                    src={recordedVideoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Action Card */}
              <div className="bg-card border rounded-xl p-6 shadow-lg space-y-6">

                {/* Input / Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Title / Description</label>
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
                      <span className="font-medium text-primary">Uploading video...</span>
                      <span className="font-mono text-muted-foreground">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">Uploading directly to server. We never see your video.</p>
                  </div>
                )}

                {/* SHARE READY STATE */}
                {recordingState === "share-ready" && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3 text-green-500 mb-2">
                      <div className="p-2 bg-green-500/20 rounded-full">
                        <ExternalLink className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg">Your recording is ready!</h3>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 bg-background border px-4 py-2 rounded-lg font-mono text-sm flex items-center overflow-hidden">
                        <span className="truncate">{shareLink}</span>
                      </div>
                      <Button onClick={handleCopyLink} className="shrink-0 gap-2">
                        <Copy className="w-4 h-4" /> Copy
                      </Button>
                      <Button variant="outline" asChild className="shrink-0 gap-2">
                        <a href={shareLink} target="_blank" rel="noopener noreferrer">
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>

                    <div className="pt-4 border-t border-green-500/10 flex justify-center">
                      <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => {
                        setRecordingState("idle");
                        resetRecording();
                        setShareLink("");
                        setVideoTitle("");
                      }}>
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
                            <h4 className="font-semibold text-sm mb-2">Discard this recording?</h4>
                            <p className="text-xs text-muted-foreground mb-3">This cannot be undone.</p>
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => setShowDiscardDialog(false)}>Cancel</Button>
                              <Button size="sm" variant="destructive" onClick={handleDiscard}>Discard</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 gap-2"
                      onClick={handleUpload}
                    >
                      <Upload className="w-4 h-4" /> Upload & Share
                    </Button>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

      </div>
    </main>
  );
}
