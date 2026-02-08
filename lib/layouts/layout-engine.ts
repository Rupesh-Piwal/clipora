import { ComponentType } from "react";
import { Monitor, Video, LayoutTemplate, Square, PictureInPicture, Grid2X2, RectangleHorizontal } from "lucide-react";
import { BackgroundOption } from "../backgrounds";

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
        height: number,
        background?: BackgroundOption | HTMLImageElement // Option metadata OR preloaded image element
    ) => void;
}

// Helper: Draw Background
const drawBackground = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    bg?: BackgroundOption | HTMLImageElement
) => {
    // 1. Default to black
    if (!bg) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        return;
    }

    // 2. Handle HTMLImageElement (Preloaded) - logic from post-processor
    if (bg instanceof HTMLImageElement) {
        // Draw cover
        const aspect = w / h;
        const imgAspect = bg.naturalWidth / bg.naturalHeight;
        let sx = 0, sy = 0, sw = bg.naturalWidth, sh = bg.naturalHeight;

        if (imgAspect > aspect) {
            sw = bg.naturalHeight * aspect;
            sx = (bg.naturalWidth - sw) / 2;
        } else {
            sh = bg.naturalWidth / aspect;
            sy = (bg.naturalHeight - sh) / 2;
        }
        ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, w, h);
        return;

    }

    // 3. Handle BackgroundOption
    if (bg.type === "none") {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        return;
    }

    if (bg.type === "gradient") {
        // Parse gradient string roughly or use a fixed implementation for the known presets?
        // Presets are simplistic linear-gradients.
        // Value format: "linear-gradient(135deg, #color1 0%, #color2 100%)"
        // Canvas gradients are x1,y1,x2,y2. 
        // Mapping CSS angles to Canvas coords is non-trivial for general cases.
        // For this specific feature with known presets, we can approximate or use a simple vertical/diagonal.
        // Let's implement a robust enough parser for the 10 presets (mostly 135deg or vertical).

        const gradient = ctx.createLinearGradient(0, 0, w, h); // Default diagonal top-left to bottom-right
        // Simple parsing for the predefined constants
        // Regex to find colors
        const colors = bg.value.match(/#[a-fA-F0-9]{6}/g);
        if (colors && colors.length >= 2) {
            gradient.addColorStop(0, colors[0]);
            gradient.addColorStop(1, colors[1]);
        } else {
            // Fallback
            gradient.addColorStop(0, "#333");
            gradient.addColorStop(1, "#000");
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        return;
    }

    // If type image but passed as option (not loaded element) => can't draw immediately.
    // Should fallback to black, caller must preload.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
};

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

const renderScreenCameraBR: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);

    if (screen) drawVideo(ctx, screen, 0, 0, w, h, "contain");

    // 2. Draw Camera (Bottom Right)
    if (camera) {
        const camW = w * 0.2; // 20% width
        const camH = camW * (camera.videoHeight / camera.videoWidth) || camW * (9 / 16); // Maintain aspect or default
        const padding = 32; // 16px padding requested, but 32 looks better on 1080p usually. Request said 16px.
        const x = w - camW - 16;
        const y = h - camH - 16;

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

const renderScreenCameraBL: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);

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

const renderScreenCameraSideLeft: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);

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

const renderScreenCameraSideRight: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);

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

const renderCameraOnlyCenter: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);
    if (camera) {
        // "Camera fills most of the frame" - maybe 80% size? or just contain with black bars?
        // "Maintain aspect ratio"
        drawVideo(ctx, camera, 0, 0, w, h, "contain");
    }
};

const renderCameraOnlyFull: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    // If full screen camera, background is hidden anyway unless camera transparent (unlikely)
    // But good practice to draw it.
    drawBackground(ctx, w, h, bg);
    if (camera) {
        // "Fill entire frame" -> cover
        drawVideo(ctx, camera, 0, 0, w, h, "cover");
    }
};

const renderScreenOnly: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);
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
