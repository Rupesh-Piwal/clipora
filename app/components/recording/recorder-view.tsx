import { useRef, useState, useEffect } from "react";
import { Video, Timer, Mic, Monitor, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { ControlBar } from "./control-bar";
import { formatTime } from "./utils";
import { Button } from "@/components/ui/button";
import Clip from "./clip";

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
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleWebcam: () => void;
  micEnabled: boolean;
  onToggleMic: () => void;
  // Permission props
  permissions: { camera: boolean; mic: boolean; screen: boolean };
  onRequestCameraMic: () => void;
  onRequestScreen: () => void;
  // New props
  webcamPreviewStream: MediaStream | null;
  screenPreviewStream: MediaStream | null;
  canRecord: boolean;
  permissionError: string | null;
  permissionErrorType?: string | null;
}

export function RecorderView({
  status,
  webcamEnabled,
  previewStream,
  recordingDuration,
  MAX_RECORDING_DURATION,
  canvasDimensions,
  onStartRecording,
  onStopRecording,
  onToggleWebcam,
  micEnabled,
  onToggleMic,
  permissions,
  onRequestCameraMic,
  onRequestScreen,
  webcamPreviewStream,
  screenPreviewStream,
  canRecord,
  permissionError,
}: RecorderViewProps) {
  // --- Refs & State ---
  const containerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // No dragging state needed anymore
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      setIsInitialized(true);
    }
  }, [canvasDimensions, isInitialized]);

  // --- Video Sources ---
  // Main preview (recording stream)
  useEffect(() => {
    if (!previewVideoRef.current) return;
    if (
      previewStream &&
      (status === "recording" ||
        status === "initializing" ||
        status === "stopping")
    ) {
      previewVideoRef.current.srcObject = previewStream;
    } else {
      previewVideoRef.current.srcObject = null;
    }
  }, [previewStream, status]);

  // Webcam preview (always visible after permission)
  useEffect(() => {
    if (!webcamVideoRef.current) return;
    if (webcamPreviewStream && webcamEnabled) {
      webcamVideoRef.current.srcObject = webcamPreviewStream;
    } else {
      webcamVideoRef.current.srcObject = null;
    }
  }, [webcamPreviewStream, webcamEnabled]);

  // Screen preview (visible when screen sharing)
  useEffect(() => {
    if (screenVideoRef.current && screenPreviewStream) {
      screenVideoRef.current.srcObject = screenPreviewStream;
    }
  }, [screenPreviewStream, permissions.screen]);

  const remainingTime = MAX_RECORDING_DURATION - recordingDuration;
  const isTimeRunningLow = remainingTime <= 10;

  // Permission gate check
  const hasAnyPermission = permissions.camera || permissions.mic;
  const isRecordingActive =
    status === "recording" ||
    status === "initializing" ||
    status === "stopping";

  // =============================================
  // PERMISSION GATE SCREEN
  // =============================================
  // =============================================
  // MAIN RECORDING VIEW
  // =============================================
  return (
    <div className="flex flex-col text-white overflow-hidden min-h-screen bg-[#0a0a0a]">
      {/* VIDEO AREA */}
      <div className="flex-1 flex items-center justify-center relative mb-1.5 bg-[#1c1c1c]">
        {/* Permission Gate or Main Video Area */}
        {!hasAnyPermission && status === "idle" ? (
          // =============================================
          // PERMISSION GATE SCREEN (Embedded)
          // =============================================
          <div className="max-w-md w-full space-y-8 p-8 flex flex-col items-center animate-in fade-in duration-500">
            {permissionError ? (
              // ERROR STATE (Design from image)
              <>
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2 ring-1 ring-red-500/20">
                  <span className="text-red-500 font-bold text-2xl">✕</span>
                </div>

                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-bold text-white">
                    Can&apos;t access your devices
                  </h2>
                  <p className="text-white/60 text-base leading-relaxed">
                    {permissionError ||
                      "Please make sure your camera and microphone are connected. Close any other apps that are currently using them."}
                  </p>
                </div>

                <Button
                  onClick={onRequestCameraMic}
                  size="lg"
                  className="bg-[#6366f1] hover:bg-[#5558dd] text-white px-8 h-12 rounded-xl font-medium transition-all duration-200 mt-4"
                >
                  Try again
                </Button>
              </>
            ) : (
              // INITIAL PERMISSION STATE
              <>
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 mx-auto bg-linear-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/10">
                    <Camera className="w-10 h-10 text-white/60" />
                  </div>
                  <h2 className="text-3xl font-bold bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent">
                    Permission to record
                  </h2>
                  <p className="text-white/50 text-base">
                    We need access to your camera and microphone.
                  </p>
                </div>

                <div className="pt-4 w-full">
                  <Button
                    onClick={onRequestCameraMic}
                    size="lg"
                    className="w-full h-14 text-base font-semibold bg-white hover:bg-gray-100 text-black shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]"
                  >
                    <Video className="w-5 h-5 mr-3" />
                    Enable camera & microphone
                  </Button>
                </div>

                <p className="text-center text-white/30 text-sm">
                  Your browser will ask for permission. Click "Allow" to
                  continue.
                </p>
              </>
            )}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative w-full max-w-380 h-[calc(100vh-170px)] bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          >
            {/* Recording Preview (shows during recording) */}
            {isRecordingActive && (
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
            )}

            {/* Split Layout: Screen + Webcam (when idle and both are available) */}
            {!isRecordingActive && (
              <div className="absolute inset-0 flex">
                {/* Screen Preview (Left) */}
                {permissions.screen && screenPreviewStream ? (
                  <div
                    className={cn(
                      "relative bg-[#0a0a0a] flex items-center justify-center",
                      permissions.camera && webcamEnabled ? "w-2/3" : "w-full",
                    )}
                  >
                    <video
                      ref={screenVideoRef}
                      muted
                      playsInline
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                    {/* Screen label */}
                    <div className="absolute bottom-4 left-4 bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border border-blue-500/30">
                      <Monitor className="w-3 h-3" />
                      Screen
                    </div>
                  </div>
                ) : (
                  /* Empty state when no screen share */
                  <div
                    className={cn(
                      "relative bg-[#1a1a1a] flex flex-col items-center justify-center",
                      permissions.camera && webcamEnabled ? "w-2/3" : "w-full",
                    )}
                  >
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center ring-1 ring-white/10">
                        <Monitor className="w-8 h-8 text-white/30" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/40 text-sm">
                          No screen selected
                        </p>
                        <p className="text-white/25 text-xs">
                          Click "Screen" below to share
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Webcam Preview (Right) - Always visible if camera enabled */}
                {permissions.camera && webcamEnabled && webcamPreviewStream && (
                  <div className="w-1/3 relative bg-[#0a0a0a] flex items-center justify-center border-l border-white/10">
                    <video
                      ref={webcamVideoRef}
                      muted
                      playsInline
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    {/* Webcam label */}
                    <div className="absolute bottom-4 left-4 bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border border-purple-500/30">
                      <Video className="w-3 h-3" />
                      Camera
                    </div>
                  </div>
                )}
              </div>
            )}

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
                <span className="font-semibold">
                  {formatTime(recordingDuration)}
                </span>
                <span className="opacity-50 text-xs font-normal">
                  / {formatTime(MAX_RECORDING_DURATION)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTROL BAR */}
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
        screenShareEnabled={permissions.screen}
        onToggleScreenShare={onRequestScreen}
        canRecord={canRecord}
      />
      <Clip />
    </div>
  );
}
