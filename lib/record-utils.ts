import { DEFAULT_RECORDING_CONFIG, DEFAULT_VIDEO_CONFIG } from "@/constants";
import { MediaStreams, RecordingHandlers } from "./types";

/**
 * Requests access to screen capture and optional microphone audio.
 * @param withMic - Whether to include microphone audio stream
 * @returns Object containing display stream, mic stream (if requested), and boolean flag for display audio
 */
export const getMediaStreams = async (
  withMic: boolean
): Promise<MediaStreams> => {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: DEFAULT_VIDEO_CONFIG,
    //     const DEFAULT_RECORDING_CONFIG = {
    //   mimeType: "video/webm;codecs=vp9,opus",
    //   audioBitsPerSecond: 128000,
    //   videoBitsPerSecond: 2500000,
    // };
    audio: true,
  });

  const hasDisplayAudio = displayStream.getAudioTracks().length > 0;

  let micStream: MediaStream | null = null;

  if (withMic) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStream
      .getAudioTracks()
      .forEach((track: MediaStreamTrack) => (track.enabled = true));
  }

  return { displayStream, micStream, hasDisplayAudio };
};

/**
 * Creates an audio mixer using Web Audio API to merge system audio and microphone input.
 * Balances volume levels: System (0.7) and Mic (1.5).
 * @param ctx - AudioContext instance
 * @param displayStream - The screen capture stream (leaves untouched, used for audio extraction)
 * @param micStream - Optional microphone stream
 * @param hasDisplayAudio - Whether the screen capture includes system audio
 * @returns MediaStreamAudioDestinationNode containing the mixed audio
 */
export const createAudioMixer = (
  ctx: AudioContext,
  displayStream: MediaStream,
  micStream: MediaStream | null,
  hasDisplayAudio: boolean
) => {

  // if (!hasDisplayAudio && !micStream) return null;

  const destination = ctx.createMediaStreamDestination();

  const mix = (stream: MediaStream | null, gainValue: number) => {
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;
    const source = ctx.createMediaStreamSource(stream);
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    source.connect(gain).connect(destination);
  };

  if (hasDisplayAudio) mix(displayStream, 0.7);
  if (micStream) mix(micStream, 1.5);

  // If nothing was connected, return null
  if (destination.stream.getAudioTracks().length === 0) {
    return null;
  }

  return destination;
};

/**
 * Initializes a MediaRecorder with the given stream.
 * Fallback to default options if specific config fails.
 * @param stream - The stream to record (usually the mixed or canvas stream)
 */
export const setupMediaRecorder = (stream: MediaStream) => {
  try {
    return new MediaRecorder(stream, DEFAULT_RECORDING_CONFIG);
  } catch {
    return new MediaRecorder(stream);
  }
};

/**
 * Calculates the duration of a video file from its URL.
 * Creates a temporary hidden video element to read metadata.
 * @param url - Blob URL or source URL of the video
 * @returns Promise resolving to duration in seconds or null on error
 */
export const getVideoDuration = (url: string): Promise<number | null> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration =
        isFinite(video.duration) && video.duration > 0
          ? Math.round(video.duration)
          : null;
      URL.revokeObjectURL(video.src);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };
    video.src = url;
  });

/**
 * Wrapper to set up MediaRecorder with event handlers.
 * @param stream - The final stream to record
 * @param handlers - Object containing onDataAvailable and onStop callbacks
 * @returns The configured MediaRecorder instance
 */
export const setupRecording = (
  stream: MediaStream,
  handlers: RecordingHandlers
): MediaRecorder => {
  const recorder = new MediaRecorder(stream, DEFAULT_RECORDING_CONFIG);
  recorder.ondataavailable = handlers.onDataAvailable;
  recorder.onstop = handlers.onStop;
  return recorder;
};

/**
 * Stops all tracks in the provided streams and the recorder itself.
 * Essential for releasing camera/mic hardware access.
 * @param recorder - The active MediaRecorder instance
 * @param stream - The composite stream being recorded
 * @param originalStreams - Array of source streams (webcam, screen) to also stop
 */
export const cleanupRecording = (
  recorder: MediaRecorder | null,
  stream: MediaStream | null,
  originalStreams: MediaStream[] = []
) => {
  if (recorder?.state !== "inactive") {
    recorder?.stop();
  }

  stream?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
  originalStreams.forEach((s) =>
    s.getTracks().forEach((track: MediaStreamTrack) => track.stop())
  );
};

/**
 * Combines recorded chunks into a single Blob and generates a playback URL.
 * @param chunks - Array of recorded binary chunks
 * @returns Object with final Blob and locally accessible URL
 */
export const createRecordingBlob = (
  chunks: Blob[]
): { blob: Blob; url: string } => {
  const blob = new Blob(chunks, { type: "video/webm" });
  const url = URL.createObjectURL(blob);
  console.log("blob", blob);
  console.log("url", url);
  console.log("chunks", chunks);

  return { blob, url };
};

/**
 * Simple calculation for elapsed recording time.
 * @param startTime - Timestamp when recording started
 * @returns Elapsed seconds
 */
export const calculateRecordingDuration = (startTime: number | null): number =>
  startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
