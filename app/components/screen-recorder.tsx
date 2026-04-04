"use client";

import { useState } from "react";
import { usePiPRecording } from "@/lib/hooks/usePiPRecording";
import { useHistory } from "@/lib/hooks/useHistory";
import {
    requestPresignedUrl,
    uploadToS3,
    saveVideoMetadata,
} from "@/lib/upload-utils";
import { Button } from "@/components/ui/button";
import { LoadingView } from "./recording/loading-view";
import { RecorderView } from "./recording/recorder-view";
import { ReviewView, ReviewState } from "./recording/review-view";

export default function ScreenRecorder() {
    const {
        status,
        recordingDuration,
        startRecording,
        stopRecording,
        previewStream,
        canvasDimensions,
        recordedVideoUrl,
        recordedBlob,
        resetRecording,
        MAX_RECORDING_DURATION,
        permissions,
        requestCameraAndMic,
        toggleScreenShare,
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
        background,
        setBackground,
        webcamShape,
        setWebcamShape,
        webcamSize,
        setWebcamSize,
        webcamPosition,
        setWebcamPosition,
        previewMode,
        previewCanvasRef,
        previewVideoRef,
        screenSourceRef,
        cameraSourceRef,
        microphoneStream,
    } = usePiPRecording();

    const { addVideoToHistory } = useHistory();

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
            const { videoId, uploadUrl } = await requestPresignedUrl(
                blobToUpload.size,
            );

            await uploadToS3(blobToUpload, uploadUrl, (progress) => {
                setUploadProgress(progress);
            });

            await saveVideoMetadata(
                videoId,
                "",
                videoDescription,
                videoLinks,
            );

            const shareUrl = `${window.location.origin}/v/${videoId}`;
            setShareData({ videoId, url: shareUrl });
            setReviewState("success");
            addVideoToHistory(videoId);
        } catch (err) {
            console.error("Upload failed:", err);
            setUploadError(err instanceof Error ? err.message : "Upload failed");
            setReviewState("error");
        }
    };

    if (status === "stopping") {
        return <LoadingView status={status} />;
    }

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
                    background={background}
                    onSetBackground={setBackground}
                    webcamShape={webcamShape}
                    setWebcamShape={setWebcamShape}
                    webcamSize={webcamSize}
                    setWebcamSize={setWebcamSize}
                    webcamPosition={webcamPosition}
                    setWebcamPosition={setWebcamPosition}
                    previewMode={previewMode}
                    previewCanvasRef={previewCanvasRef}
                    previewVideoRef={previewVideoRef}
                    screenSourceRef={screenSourceRef}
                    cameraSourceRef={cameraSourceRef}
                    micStream={microphoneStream}
                />
            </main>
        );
    }

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
