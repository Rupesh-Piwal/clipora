"use client";

import { useState, useEffect } from "react";
import {
  Mic,
  Video,
  VideoOff,
  RotateCcw,
  Pause,
  Trash2,
  Pen,
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
  recordingDuration?: number; // Pass duration for the timer if available
  onReset?: () => void;
  onPause?: () => void;
  onDelete?: () => void;
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
  onDelete,
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
      <div className="flex items-center justify-center gap-8 pb-10">
        {/* Record/Start Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onStartRecording}
            className="w-[180px] h-20 bg-[#f84d4d] hover:bg-[#ff5f5f] text-white rounded-[24px] flex items-center justify-center gap-2 transition-all duration-200 shadow-lg group"
          >
            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-[#f84d4d] rounded-full group-hover:scale-90 transition-transform" />
            </div>
            <span className="text-xl font-bold tracking-tight">Record</span>
          </button>
          <span className="text-sm font-medium text-gray-400">Start</span>
        </div>

        {/* Mic Toggle */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onToggleMic}
            className={cn(
              "w-20 h-20 flex items-center justify-center rounded-[24px] transition-all duration-200",
              micEnabled
                ? "bg-[#2a2a2a] text-white hover:bg-[#333333]"
                : "bg-[#2a2a2a]/40 text-gray-600 hover:bg-[#2a2a2a]/60",
            )}
          >
            <Mic className={cn("w-8 h-8", !micEnabled && "opacity-40")} />
          </button>
          <span className="text-sm font-medium text-gray-400">Mic</span>
        </div>

        {/* Cam Toggle */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onToggleWebcam}
            className={cn(
              "w-20 h-20 flex items-center justify-center rounded-[24px] transition-all duration-200",
              webcamEnabled
                ? "bg-[#2a2a2a] text-white hover:bg-[#333333]"
                : "bg-[#2a2a2a]/40 text-gray-600 hover:bg-[#2a2a2a]/60",
            )}
          >
            {webcamEnabled ? (
              <Video className="w-8 h-8" />
            ) : (
              <VideoOff className="w-8 h-8 opacity-40" />
            )}
          </button>
          <span className="text-sm font-medium text-gray-400">Cam</span>
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

          {/* Delete */}
          {/* <button
            onClick={onDelete}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            title="Delete"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button> */}
        </div>

        {/* Divider */}
        {/* <div className="w-px h-9 bg-white/10" /> */}

        {/* Tools Group */}
        {/* <div className="text-white/40">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:text-white hover:bg-white/10 transition-all duration-200">
            <Pen className="w-5 h-5" />
          </button>
        </div> */}

        {/* Divider */}
        <div className="w-px h-9 bg-white/10" />

        {/* Toggles Group */}
        <div className="flex items-center gap-2 pr-1.5">
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
          {/* <button
            onClick={onToggleMic}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
              micEnabled
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30"
                : "bg-white/10 text-white/40 hover:bg-white/20",
            )}
            title="Toggle Microphone"
          >
            <Mic className={cn("w-4 h-4", !micEnabled && "opacity-40")} />
          </button> */}
        </div>
      </div>
    </div>
  );
}
