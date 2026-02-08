"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  RefreshCw,
  Trash2,
  ExternalLink,
  Copy,
  AlertCircle,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { formatTime } from "./utils";
import { LayoutSelector } from "./layout-selector";
import { PostProcessor, PostProcessorRef } from "./post-processor";
import { LayoutId } from "@/lib/layouts/layout-engine";
import { RecordedState } from "@/lib/hooks/usePiPRecording";

type ReviewState = "review" | "uploading" | "success" | "error";

interface ReviewViewProps {
  reviewState: ReviewState;
  setReviewState: (state: ReviewState) => void;
  videoDescription: string;
  setVideoDescription: (description: string) => void;
  videoLinks: string[];
  setVideoLinks: (links: string[]) => void;
  recordedVideoUrl: string | null; // Keep for fallback or unused
  recordedSources?: RecordedState | null; // NEW: Dual streams
  recordingDuration: number;
  uploadProgress: number;
  shareData: { videoId: string; url: string } | null;
  uploadError: string | null;
  showDiscardDialog: boolean;
  setShowDiscardDialog: (show: boolean) => void;
  onUpload: (blob: Blob) => void; // UPDATED: Accepts processed blob
  onDiscard: () => void;
}

export function ReviewView({
  reviewState,
  setReviewState,
  videoDescription,
  setVideoDescription,
  videoLinks,
  setVideoLinks,
  recordedVideoUrl,
  recordedSources,
  recordingDuration,
  uploadProgress,
  shareData,
  uploadError,
  showDiscardDialog,
  setShowDiscardDialog,
  onUpload,
  onDiscard,
}: ReviewViewProps) {

  // Layout State
  const [layoutId, setLayoutId] = useState<LayoutId>("screen-camera-br");
  const postProcessorRef = useRef<PostProcessorRef>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Default to screen-only if no camera, or camera-only if no screen?
  // We can auto-detect in useEffect
  useEffect(() => {
    if (recordedSources) {
      if (!recordedSources.screen && recordedSources.camera) {
        setLayoutId("camera-only-center");
      } else if (recordedSources.screen && !recordedSources.camera) {
        setLayoutId("screen-only");
      }
    }
  }, [recordedSources]);


  const handleExportAndUpload = () => {
    if (postProcessorRef.current) {
      setIsProcessing(true);
      postProcessorRef.current.exportVideo();
    } else {
      // Fallback for legacy single blob?
      // Not implemented in this path, assuming dual streams for this feature.
      console.warn("PostProcessor not ready");
    }
  };

  const handleExportComplete = (url: string, blob: Blob) => {
    setIsProcessing(false);
    onUpload(blob);
  };

  const handleExportError = (err: Error) => {
    setIsProcessing(false);
    console.error("Export failed", err);
    // Show error?
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-1rem)] animate-in fade-in duration-500 p-4 lg:p-8 bg-[#0a0a0a]">
      {/* LEFT: Video Player / Layout Editor */}
      <div className="lg:col-span-2 flex flex-col gap-4 min-h-0 border border-white/10 rounded-2xl p-4 bg-[#1a1a1a]">
        <div className="flex flex-row gap-2 justify-between">
          <div className="flex flex-row justify-center items-center gap-2">
            <h2 className="text-lg font-thin text-white uppercase tracking-wide">
              Video Editor
            </h2>
            <div className="bg-white w-0.5 h-4.5" />

            <h1 className="text-sm font-bold text-[#FFFFFF]">
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h1>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-white/60 bg-[#0a0a0a] px-3 py-1.5 rounded-lg border border-white/10">
              {formatTime(recordingDuration)}
            </span>
          </div>
        </div>

        <div className="flex-1 rounded-xl overflow-hidden border border-white/10 shadow-sm hover:shadow-md transition-shadow duration-300 bg-black relative">
          {/* Main Editor Area */}
          {recordedSources ? (
            <PostProcessor
              ref={postProcessorRef}
              screenBlob={recordedSources.screen}
              cameraBlob={recordedSources.camera}
              initialLayout={layoutId}
              onExportStart={() => {/* Handled in local state if needed */ }}
              onExportProgress={(p) => {/* Optional: Show progress bar overlay */ }}
              onExportComplete={handleExportComplete}
              onExportError={handleExportError}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white/50">
              No recording sources found.
            </div>
          )}

          {/* Processing Overlay */}
          {(isProcessing || reviewState === 'uploading') && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-white font-medium">
                  {isProcessing ? "Rendering Layout..." : "Uploading..."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Actions Panel */}
      <div className="lg:col-span-1 flex flex-col min-h-0 overflow-hidden">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 shadow-sm flex flex-col h-full overflow-y-auto custom-scrollbar">

          {/* 1. Review Mode */}
          {reviewState === "review" && (
            <div className="space-y-8 animate-in fade-in duration-300 flex flex-col flex-1">

              {/* Layout Selector */}
              <div>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                  Layout Composition
                </h3>
                <LayoutSelector
                  selectedLayout={layoutId}
                  onSelect={setLayoutId}
                  disabled={isProcessing}
                />
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <label className="text-sm font-medium text-white block mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Add details about your video..."
                  className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none min-h-20 resize-none text-sm placeholder:text-white/40 transition-all duration-200 text-white"
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                />
              </div>

              <div className="flex-1 mt-4">
                <label className="text-sm font-medium text-white block mb-3">
                  Related Links (Optional)
                </label>
                <div className="space-y-2">
                  {videoLinks.map((link, index) => (
                    <input
                      key={index}
                      type="url"
                      placeholder={`Link ${index + 1}`}
                      className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none text-sm placeholder:text-white/40 transition-all duration-200"
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...videoLinks];
                        newLinks[index] = e.target.value;
                        setVideoLinks(newLinks);
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-white/10">
                <Button
                  size="lg"
                  className="w-full gap-2 bg-white text-black hover:bg-white/90 transition-all duration-200 cursor-pointer"
                  onClick={handleExportAndUpload}
                  disabled={isProcessing}
                >
                  <Upload className="w-4 h-4" />
                  {isProcessing ? "Processing..." : "Finish & Upload"}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={onDiscard}
                    variant="outline"
                    className="gap-2 transition-all duration-200 bg-transparent border border-white/10 hover:bg-white/5 cursor-pointer text-white"
                    disabled={isProcessing}
                  >
                    <RefreshCw className="w-4 h-4" /> New
                  </Button>
                  <Button
                    onClick={() => setShowDiscardDialog(true)}
                    variant="outline"
                    className="gap-2 text-red-400 hover:text-red-300 transition-all duration-200 border border-red-400/60 bg-transparent hover:bg-red-400/10 cursor-pointer"
                    disabled={isProcessing}
                  >
                    <Trash2 className="w-4 h-4" /> Discard
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Uploading Mode (Handled via overlay mostly, but keep status here too) */}
          {reviewState === "uploading" && (
            <div className="space-y-6 py-8 animate-in fade-in duration-300 flex flex-col items-center justify-center flex-1">
              {/* ... (Existing upload UI) ... */}
              <div className="space-y-4 text-center w-full">
                <div className="flex justify-center">
                  <div className="relative w-12 h-12">
                    <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="141 283" className="text-white" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-white">{uploadProgress}%</div>
                  <Progress value={uploadProgress} className="h-2.5" />
                  <p className="text-sm text-white/60">Uploading your video...</p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Success Mode */}
          {reviewState === "success" && shareData && (
            <div className="space-y-6 animate-in fade-in duration-300 flex flex-col flex-1">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span className="font-semibold">Upload Complete</span>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-white/60">Your Share Link</label>
                <div className="flex gap-2 items-stretch">
                  <div className="flex-1 bg-[#0a0a0a] px-4 py-3 rounded-lg text-xs font-mono truncate border border-white/10 text-white/80">
                    {shareData.url}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(shareData.url)} className="border-white/10 hover:bg-white/5 text-white">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-white/10 mt-auto">
                <Button className="w-full gap-2 bg-white text-black hover:bg-white/90" asChild>
                  <a href={shareData.url} target="_blank" rel="noopener noreferrer">
                    Open Link <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
                <Button variant="outline" onClick={onDiscard} className="w-full bg-transparent border-white/10 hover:bg-white/5 text-white">
                  Record Another <RotateCcw />
                </Button>
              </div>
            </div>
          )}

          {/* 4. Error Mode */}
          {reviewState === "error" && (
            <div className="space-y-6 animate-in fade-in duration-300 flex flex-col flex-1">
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-semibold">Upload Failed</span>
              </div>
              <p className="text-sm text-red-400">{uploadError || "An error occurred."}</p>
              <div className="flex flex-col gap-3 mt-auto">
                <Button onClick={handleExportAndUpload} className="w-full bg-white text-black hover:bg-white/90">Retry Upload</Button>
                <Button variant="outline" onClick={() => setReviewState("review")} className="w-full border-white/10 hover:bg-white/5 text-white">Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discard Dialog */}
      {showDiscardDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] p-6 rounded-xl shadow-xl max-w-sm w-full border border-white/10 mx-4">
            <h3 className="text-lg font-semibold mb-2 text-white">Discard Recording?</h3>
            <p className="text-sm text-white/60 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDiscardDialog(false)} className="border-white/10 hover:bg-white/5 text-white">Cancel</Button>
              <Button variant="outline" onClick={onDiscard} className="text-red-400 border-red-400/60 hover:bg-red-400/10">Confirm Discard</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
