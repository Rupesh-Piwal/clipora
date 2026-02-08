"use client";

import { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  RotateCcw,
  Pause,
  Monitor,
  MonitorOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ControlBarProps {
  status:
    | "idle"
    | "dest"
    | "initializing"
    | "recording"
    | "stopping"
    | "completed"
    | "error";
  onStartRecording: () => void;
  onStopRecording: () => void;
  webcamEnabled: boolean;
  onToggleWebcam: () => void;
  micEnabled: boolean;
  onToggleMic: () => void;
  recordingDuration?: number;
  onReset?: () => void;
  onPause?: () => void;
  onDelete?: () => void;
  // New props
  screenShareEnabled: boolean;
  onToggleScreenShare: () => void;
  canRecord: boolean;
}

export function ControlBar({
  status,
  onStartRecording,
  onStopRecording,
  webcamEnabled,
  onToggleWebcam,
  micEnabled,
  onToggleMic,
  recordingDuration = 0,
  onReset,
  onPause,
  screenShareEnabled,
  onToggleScreenShare,
  canRecord,
}: ControlBarProps) {
  const [formattedTime, setFormattedTime] = useState("00:00");

  useEffect(() => {
    const mins = Math.floor(recordingDuration / 60);
    const secs = recordingDuration % 60;
    setFormattedTime(
      `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
    );
  }, [recordingDuration]);

  if (status === "idle") {
    return (
      <div className="flex items-center justify-center gap-8 m-2 rounded-lg bg-[#1A1B1D] border border-[#2E2E30] p-1">
        {/* Record/Start Button - DISABLED when no media source */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onStartRecording}
            disabled={!canRecord}
            className={cn(
              "rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg group px-4 py-1",
              canRecord
                ? "bg-[#f84d4d] hover:bg-[#ff5f5f] text-white cursor-pointer"
                : "bg-[#f84d4d]/30 text-white/40 cursor-not-allowed",
            )}
          >
            <span className="text-lg font-semibold tracking-tight">Record</span>
          </button>
          <span className="text-[12px] font-medium text-gray-400">
            {canRecord ? "Start" : "Enable source"}
          </span>
        </div>

        {/* Screen Share Toggle */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onToggleScreenShare}
            className={cn(
              "p-2 flex items-center justify-center rounded-[14px] transition-all duration-200 cursor-pointer",
              screenShareEnabled
                ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 ring-1 ring-blue-500/30"
                : "bg-[#2a2a2a]/40 text-gray-600 hover:bg-[#2a2a2a]/60",
            )}
          >
            {screenShareEnabled ? (
              <Monitor className="w-5 h-5" />
            ) : (
              <MonitorOff className="w-5 h-5 opacity-40" />
            )}
          </button>
          <span className="text-[12px] font-medium text-slate-400">Screen</span>
        </div>

        {/* Mic Toggle */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onToggleMic}
            className={cn(
              "p-2 flex items-center justify-center rounded-[14px] transition-all duration-200 cursor-pointer",
              micEnabled
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30"
                : "bg-[#2a2a2a]/40 text-gray-600 hover:bg-[#2a2a2a]/60",
            )}
          >
            {micEnabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5 opacity-40" />
            )}
          </button>
          <span className="text-[12px] font-medium text-slate-400">Mic</span>
        </div>

        {/* Cam Toggle */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onToggleWebcam}
            className={cn(
              "p-2 flex items-center justify-center rounded-[14px] transition-all duration-200 cursor-pointer",
              webcamEnabled
                ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 ring-1 ring-purple-500/30"
                : "bg-[#2a2a2a]/40 text-gray-600 hover:bg-[#2a2a2a]/60",
            )}
          >
            {webcamEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5 opacity-40" />
            )}
          </button>
          <span className="text-[12px] font-medium text-slate-400">Cam</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-16 flex items-center justify-center pointer-events-none pb-6">
      {/* Floating Bar Container */}
      <div className="pointer-events-auto bg-[#1a1a1a]/95 backdrop-blur-xl rounded-full shadow-[0_8px_40px_rgb(0,0,0,0.5)] border border-white/10 p-1 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
        {/* Main Controls Group */}
        <div className="flex items-center bg-[#0a0a0a] rounded-full px-2 py-1 gap-1.5">
          {/* Stop Button */}
          <button
            onClick={onStopRecording}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[#1a1a1a] transition-all text-white/60 hover:text-red-400 group"
            title="Stop Recording"
          >
            <div className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full group-hover:bg-red-500/20 transition-all duration-200">
              <div className="w-3 h-3 bg-white rounded-[3px] shadow-sm transform group-hover:scale-110 transition-transform" />
            </div>
          </button>

          {/* Timer */}
          <div className="px-4 font-mono text-white font-semibold min-w-20 text-center select-none text-base">
            {formattedTime}
          </div>

          {/* Restart */}
          <button
            onClick={onReset}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
            title="Restart"
          >
            <RotateCcw className="w-4.5 h-4.5" />
          </button>

          {/* Pause */}
          <button
            onClick={onPause}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
            title="Pause"
          >
            <Pause className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-9 bg-white/10" />

        {/* Toggles Group */}
        <div className="flex items-center gap-2 pr-1.5">
          {/* Screen Toggle */}
          <button
            onClick={onToggleScreenShare}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
              screenShareEnabled
                ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 ring-1 ring-blue-500/30"
                : "bg-white/10 text-white/40 hover:bg-white/20",
            )}
            title="Toggle Screen Share"
          >
            {screenShareEnabled ? (
              <Monitor className="w-4 h-4" />
            ) : (
              <MonitorOff className="w-4 h-4" />
            )}
          </button>

          {/* Cam Toggle */}
          <button
            onClick={onToggleWebcam}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
              webcamEnabled
                ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 ring-1 ring-purple-500/30"
                : "bg-white/10 text-white/40 hover:bg-white/20",
            )}
            title="Toggle Webcam"
          >
            {webcamEnabled ? (
              <Video className="w-4 h-4" />
            ) : (
              <VideoOff className="w-4 h-4" />
            )}
          </button>

          {/* Mic Toggle */}
          <button
            onClick={onToggleMic}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
              micEnabled
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30"
                : "bg-white/10 text-white/40 hover:bg-white/20",
            )}
            title="Toggle Microphone"
          >
            {micEnabled ? (
              <Mic className="w-4 h-4" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
