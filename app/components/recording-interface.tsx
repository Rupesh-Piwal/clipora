"use client";

import { useState } from "react";
import { usePiPRecording } from "@/lib/hooks/usePiPRecording";
import {
  requestPresignedUrl,
  uploadToS3,
  saveVideoMetadata,
} from "@/lib/upload-utils";
import { LoadingView } from "./recording/loading-view";
import { RecorderView } from "./recording/recorder-view";
import { ReviewView } from "./recording/review-view";
import { Button } from "@/components/ui/button";

type ReviewState = "review" | "uploading" | "success" | "error";

export default function RecordingInterface() {
  // --- Hook Integration ---
  const {
    status,
    recordingDuration,
    startRecording,
    stopRecording,
    previewStream,

    canvasDimensions,
    recordedVideoUrl,
    recordedBlob,
    recordedSources,
    resetRecording,
    MAX_RECORDING_DURATION,
    permissions,
    requestCameraAndMic,
    toggleScreenShare,
    // New exports
    webcamPreviewStream,
    screenPreviewStream,
    canRecord,
    cameraEnabled,
    micEnabled,
    toggleCamera,
    toggleMic,
    permissionError,
    permissionErrorType,
    countdownValue,
    cancelCountdown,
    background,
    setBackground,
  } = usePiPRecording();

  // Review / Upload State
  const [reviewState, setReviewState] = useState<ReviewState>("review");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareData, setShareData] = useState<{
    videoId: string;
    url: string;
  } | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [videoDescription, setVideoDescription] = useState("");
  const [videoLinks, setVideoLinks] = useState<string[]>(["", "", ""]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // --- Actions ---

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleDiscard = () => {
    resetRecording();
    setReviewState("review");
    setShowDiscardDialog(false);
    setUploadProgress(0);
    setVideoDescription("");
    setVideoLinks(["", "", ""]);
    setShareData(null);
    setUploadError(null);
  };

  const handleUpload = async (blobToUpload: Blob) => {
    if (!blobToUpload) return;

    setReviewState("uploading");
    setUploadError(null);
    setUploadProgress(0);

    try {
      // 1. Get Presigned URL
      const { videoId, uploadUrl } = await requestPresignedUrl(
        blobToUpload.size,
      );

      // 2. Upload to S3
      await uploadToS3(blobToUpload, uploadUrl, (progress) => {
        setUploadProgress(progress);
      });

      // 3. Success - Save metadata to DB
      await saveVideoMetadata(
        videoId,
        "",
        videoDescription,
        videoLinks,
      );

      const shareUrl = `${window.location.origin}/v/${videoId}`;
      setShareData({ videoId, url: shareUrl });
      setReviewState("success");
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setReviewState("error");
    }
  };

  // --- Views ---

  // 1. LOADING / STOPPING
  if (status === "stopping") {
    return <LoadingView status={status} />;
  }

  // 2. RECORDING / IDLE / INITIALIZING (countdown) VIEW
  if (status === "idle" || status === "recording" || status === "initializing") {
    return (
      <main className="flex-1 max-w-8xl mx-auto h-screen bg-[#000101]">
        <RecorderView
          status={status}
          webcamEnabled={cameraEnabled}
          previewStream={previewStream}
          recordingDuration={recordingDuration}
          MAX_RECORDING_DURATION={MAX_RECORDING_DURATION}
          canvasDimensions={canvasDimensions}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onToggleWebcam={() => toggleCamera(!cameraEnabled)}
          micEnabled={micEnabled}
          onToggleMic={() => toggleMic(!micEnabled)}
          permissions={permissions}
          onRequestCameraMic={requestCameraAndMic}
          onRequestScreen={toggleScreenShare}
          webcamPreviewStream={webcamPreviewStream}
          screenPreviewStream={screenPreviewStream}
          canRecord={canRecord}
          permissionError={permissionError}
          permissionErrorType={permissionErrorType}
          countdownValue={countdownValue}
          onCancelCountdown={cancelCountdown}
          background={background}
          onSetBackground={setBackground}
        />
      </main>
    );
  }

  // 3. COMPLETED / UPLOAD VIEW
  if (status === "completed") {
    return (
      <main className="flex-1 w-full h-screen bg-background">
        <ReviewView
          reviewState={reviewState}
          setReviewState={setReviewState}
          videoDescription={videoDescription}
          setVideoDescription={setVideoDescription}
          videoLinks={videoLinks}
          setVideoLinks={setVideoLinks}
          recordedVideoUrl={recordedVideoUrl}
          recordedBlob={recordedBlob}
          recordingDuration={recordingDuration}
          uploadProgress={uploadProgress}
          shareData={shareData}
          uploadError={uploadError}
          showDiscardDialog={showDiscardDialog}
          setShowDiscardDialog={setShowDiscardDialog}
          onUpload={handleUpload}
          onDiscard={handleDiscard}
        />
      </main>
    );
  }



  // 4. ERROR STATE
  if (status === "error") {
    return (
      <main className="flex-1 w-full h-screen bg-background">
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload Page
          </Button>
        </div>
      </main>
    );
  }

  return null;
}
