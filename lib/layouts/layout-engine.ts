import { ComponentType } from "react";
import { Monitor, Video, LayoutTemplate, Square, PictureInPicture, Grid2X2, RectangleHorizontal } from "lucide-react";

export type LayoutId =
    | "screen-camera-br"
    | "screen-camera-bl"
    | "screen-camera-left"
    | "screen-camera-right"
    | "camera-only-center"
    | "camera-only-full"
    | "screen-only";

export interface LayoutMode {
    id: LayoutId;
    label: string;
    icon: ComponentType<{ className?: string }>;
    render: (
        ctx: CanvasRenderingContext2D,
        screenVideo: HTMLVideoElement | null,
        cameraVideo: HTMLVideoElement | null,
        width: number,
        height: number
    ) => void;
}

// Helper: Draw video keeping aspect ratio to cover or contain
const drawVideo = (
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    x: number,
    y: number,
    w: number,
    h: number,
    mode: "cover" | "contain" = "contain"
) => {
    if (video.readyState < 2) return; // Not ready

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const videoAspect = vw / vh;
    const destAspect = w / h;

    let sx = 0, sy = 0, sw = vw, sh = vh;

    if (mode === "cover") {
        if (videoAspect > destAspect) {
            sw = vh * destAspect;
            sx = (vw - sw) / 2;
        } else {
            sh = vw / destAspect;
            sy = (vh - sh) / 2;
        }
    } else {
        // contain
        if (videoAspect > destAspect) {
            // video is wider than slot - fit width
            const drawH = w / videoAspect;
            const drawY = y + (h - drawH) / 2;
            ctx.drawImage(video, 0, 0, vw, vh, x, drawY, w, drawH);
            return;
        } else {
            // video is taller than slot - fit height
            const drawW = h * videoAspect;
            const drawX = x + (w - drawW) / 2;
            ctx.drawImage(video, 0, 0, vw, vh, drawX, y, drawW, h);
            return;
        }
    }

    ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h);
};

// ==========================================
// RENDER FUNCTIONS
// ==========================================

const renderScreenCameraBR: LayoutMode["render"] = (ctx, screen, camera, w, h) => {
    // 1. Draw Screen (Background) - Contain/Cover? Usually Screen recording is "contain" with black bars if mismatched, or fill. 
    // Codebase usually treats screen as full canvas. let's use contain for safety to not crop controls.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    if (screen) drawVideo(ctx, screen, 0, 0, w, h, "contain");

    // 2. Draw Camera (Bottom Right)
    if (camera) {
        const camW = w * 0.2; // 20% width
        const camH = camW * (camera.videoHeight / camera.videoWidth) || camW * (9 / 16); // Maintain aspect or default
        const padding = 32; // 16px padding requested, but 32 looks better on 1080p usually. Request said 16px.
        const x = w - camW - 16;
        const y = h - camH - 16;

        // Circle mask or rect? Request implies rect/overlay. Let's stick to rect for now as per "Camera width: 20%".
        // Usually circular bubbles are popular but spec didn't strictly say circle. Image shows circle in some, rect in others?
        // "Camera overlay at bottom-right". Let's do rounded rect.

        ctx.save();
        // Rounded rect clip
        ctx.beginPath();
        ctx.roundRect(x, y, camW, camH, 16);
        ctx.clip();
        drawVideo(ctx, camera, x, y, camW, camH, "cover");
        ctx.restore();

        // Border
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
};

const renderScreenCameraBL: LayoutMode["render"] = (ctx, screen, camera, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    if (screen) drawVideo(ctx, screen, 0, 0, w, h, "contain");

    if (camera) {
        const camW = w * 0.2;
        const camH = camW * (camera.videoHeight / camera.videoWidth) || camW * (9 / 16);
        const x = 16;
        const y = h - camH - 16;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, camW, camH, 16);
        ctx.clip();
        drawVideo(ctx, camera, x, y, camW, camH, "cover");
        ctx.restore();
    }
};

const renderScreenCameraSideLeft: LayoutMode["render"] = (ctx, screen, camera, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const camW = w * 0.3; // 30% width
    const screenW = w - camW;

    // Camera Left
    if (camera) {
        // Center vertically in the strip
        drawVideo(ctx, camera, 0, 0, camW, h, "cover");
    }

    // Screen Right
    if (screen) {
        drawVideo(ctx, screen, camW, 0, screenW, h, "contain");
    }
};

const renderScreenCameraSideRight: LayoutMode["render"] = (ctx, screen, camera, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const camW = w * 0.3;
    const screenW = w - camW;

    // Screen Left
    if (screen) {
        drawVideo(ctx, screen, 0, 0, screenW, h, "contain");
    }

    // Camera Right
    if (camera) {
        drawVideo(ctx, camera, screenW, 0, camW, h, "cover");
    }
};

const renderCameraOnlyCenter: LayoutMode["render"] = (ctx, screen, camera, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    if (camera) {
        // "Camera fills most of the frame" - maybe 80% size? or just contain with black bars?
        // "Maintain aspect ratio"
        drawVideo(ctx, camera, 0, 0, w, h, "contain");
    }
};

const renderCameraOnlyFull: LayoutMode["render"] = (ctx, screen, camera, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    if (camera) {
        // "Fill entire frame" -> cover
        drawVideo(ctx, camera, 0, 0, w, h, "cover");
    }
};

const renderScreenOnly: LayoutMode["render"] = (ctx, screen, camera, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    if (screen) {
        drawVideo(ctx, screen, 0, 0, w, h, "contain");
    }
};

// ==========================================
// EXPORT
// ==========================================

export const LAYOUTS: LayoutMode[] = [
    // Group 1: Screen + Camera
    { id: "screen-camera-br", label: "Bottom Right", icon: PictureInPicture, render: renderScreenCameraBR },
    { id: "screen-camera-bl", label: "Bottom Left", icon: PictureInPicture, render: renderScreenCameraBL }, // Icon reuse ok?
    { id: "screen-camera-left", label: "Camera Left", icon: LayoutTemplate, render: renderScreenCameraSideLeft },
    { id: "screen-camera-right", label: "Camera Right", icon: LayoutTemplate, render: renderScreenCameraSideRight },

    // Group 2: Camera Only
    { id: "camera-only-center", label: "Centered", icon: Square, render: renderCameraOnlyCenter },
    { id: "camera-only-full", label: "Full Screen", icon: RectangleHorizontal, render: renderCameraOnlyFull },

    // Group 3: Screen Only
    { id: "screen-only", label: "Screen Only", icon: Monitor, render: renderScreenOnly },
];

export const getLayout = (id: LayoutId) => LAYOUTS.find(l => l.id === id) || LAYOUTS[0];
