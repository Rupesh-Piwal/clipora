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
        background?: BackgroundOption | HTMLImageElement
    ) => void;
}

// ==========================================
// UTILITIES (Deliverables)
// ==========================================

const GAP = 24;
const PADDING = 24;
const CORNER_RADIUS = 16;
const PIP_FACTOR = 0.25; // 25% of height

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

// Helper: Resolve Background
export const drawBackground = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    bg?: BackgroundOption | HTMLImageElement
) => {
    // Clear first
    ctx.clearRect(0, 0, w, h);

    if (!bg) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        return;
    }

    if (bg instanceof HTMLImageElement) {
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

    if (bg.type === "none") {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        return;
    }

    if (bg.type === "gradient") {
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        const colors = bg.value.match(/#[a-fA-F0-9]{6}/g);
        if (colors && colors.length >= 2) {
            gradient.addColorStop(0, colors[0]);
            gradient.addColorStop(1, colors[1]);
        } else {
            gradient.addColorStop(0, "#333");
            gradient.addColorStop(1, "#000");
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        return;
    }

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
};

// Helper: Clip Rounded Rect
const clipRoundedRect = (ctx: CanvasRenderingContext2D, r: Rect, radius: number) => {
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, radius);
    ctx.clip();
};

// Helper: Clip Circle
const clipCircle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
};

// Core Drawing Function
const drawVideoInRect = (
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement | null,
    rect: Rect,
    mode: "contain" | "cover",
    shape: "round-rect" | "circle" = "round-rect"
) => {
    if (!video || video.readyState < 2) return;

    ctx.save();

    // 1. Apply Shape Clip
    if (shape === "circle") {
        // For circle, rect.w should equal rect.h (diameter)
        const radius = rect.w / 2;
        const cx = rect.x + radius;
        const cy = rect.y + radius;
        clipCircle(ctx, cx, cy, radius);
    } else {
        clipRoundedRect(ctx, rect, CORNER_RADIUS);
    }

    // 2. Draw Video
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const va = vw / vh;
    const da = rect.w / rect.h;

    let sx = 0, sy = 0, sw = vw, sh = vh; // source
    let dx = rect.x, dy = rect.y, dw = rect.w, dh = rect.h; // dest

    if (mode === "cover") {
        if (va > da) {
            sw = vh * da;
            sx = (vw - sw) / 2;
        } else {
            sh = vw / da;
            sy = (vh - sh) / 2;
        }
        ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
    } else {
        // Contain logic: We need to center the video within the rect
        // BUT we must fill the "black bars" within the clip area?
        // Typically for a styled layout, "contain" means:
        // Draw black (or transparent) background first to fill the shape, then draw video.
        ctx.fillStyle = "#000";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        if (va > da) {
            // Video is wider
            const drawH = rect.w / va;
            const DrawY = rect.y + (rect.h - drawH) / 2;
            ctx.drawImage(video, 0, 0, vw, vh, rect.x, DrawY, rect.w, drawH);
        } else {
            // Video is taller
            const drawW = rect.h * va;
            const DrawX = rect.x + (rect.w - drawW) / 2;
            ctx.drawImage(video, 0, 0, vw, vh, DrawX, rect.y, drawW, rect.h);
        }
    }

    ctx.restore();
};

const drawScreenVideo = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement | null, rect: Rect) => {
    drawVideoInRect(ctx, video, rect, "contain", "round-rect");
};

const drawCameraVideo = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement | null, rect: Rect, isPip: boolean) => {
    drawVideoInRect(ctx, video, rect, "cover", isPip ? "circle" : "round-rect");
};


// ==========================================
// LAYOUT LOGIC
// ==========================================

const renderScreenCameraSideRight: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);

    // Layout 1: Screen Left, Camera Right
    // "Camera video width ~ 25-30% of canvas width"
    // "Small horizontal gap"
    // "Equal vertical alignment" (Same height, centered)

    const totalWidth = w - (PADDING * 2);
    const availableHeight = h - (PADDING * 2);

    const cameraWidth = totalWidth * 0.3; // 30%
    const screenWidth = totalWidth - cameraWidth - GAP;

    // Both utilize full available height to maximize size, but maintain aspect within containers
    const screenRect: Rect = {
        x: PADDING,
        y: PADDING,
        w: screenWidth,
        h: availableHeight
    };

    const cameraRect: Rect = {
        x: PADDING + screenWidth + GAP,
        y: PADDING,
        w: cameraWidth,
        h: availableHeight
    };

    if (screen) drawScreenVideo(ctx, screen, screenRect);
    if (camera) drawCameraVideo(ctx, camera, cameraRect, false);
};

const renderScreenCameraSideLeft: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);

    // Layout 2: Camera Left, Screen Right
    // Mirrored

    const totalWidth = w - (PADDING * 2);
    const availableHeight = h - (PADDING * 2);

    const cameraWidth = totalWidth * 0.3;
    const screenWidth = totalWidth - cameraWidth - GAP;

    const cameraRect: Rect = {
        x: PADDING,
        y: PADDING,
        w: cameraWidth,
        h: availableHeight
    };

    const screenRect: Rect = {
        x: PADDING + cameraWidth + GAP,
        y: PADDING,
        w: screenWidth,
        h: availableHeight
    };

    if (screen) drawScreenVideo(ctx, screen, screenRect);
    if (camera) drawCameraVideo(ctx, camera, cameraRect, false);
};

const renderScreenCameraBL: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);

    // Layout 3: PiP Bottom Left
    // Screen fills most of canvas (with padding/rounded)
    // Camera is CIRCULAR, bottom-left

    const screenRect: Rect = {
        x: PADDING,
        y: PADDING,
        w: w - (PADDING * 2),
        h: h - (PADDING * 2)
    };

    if (screen) drawScreenVideo(ctx, screen, screenRect);

    if (camera) {
        // PiP Size
        const pipSize = h * PIP_FACTOR; // 25% of height
        const pipPadding = PADDING + 32; // padding from corner (inside screen rect)

        const pipRect: Rect = {
            x: pipPadding,
            y: h - pipPadding - pipSize,
            w: pipSize, // Circle diameter
            h: pipSize  // Circle diameter
        };

        // Draw border for PiP?
        // Reference image shows simple circle. Often a border helps visibility.
        // Prompt says "Circular PiP", "clipped to perfect circle".
        // Let's add a small white border for polish, consistent with "precise layout".
        // But "No UI changes" -> "Output code only". I will stick to minimal.

        // Draw Shadow?
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        drawCameraVideo(ctx, camera, pipRect, true);

        // Border
        ctx.beginPath();
        const r = pipRect.w / 2;
        ctx.arc(pipRect.x + r, pipRect.y + r, r, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "white";
        ctx.stroke();

        ctx.restore();
    }
};

const renderScreenCameraBR: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);

    // Layout 4: PiP Bottom Right

    const screenRect: Rect = {
        x: PADDING,
        y: PADDING,
        w: w - (PADDING * 2),
        h: h - (PADDING * 2)
    };

    if (screen) drawScreenVideo(ctx, screen, screenRect);

    if (camera) {
        const pipSize = h * PIP_FACTOR;
        const pipPadding = PADDING + 32;

        const pipRect: Rect = {
            x: w - pipPadding - pipSize,
            y: h - pipPadding - pipSize,
            w: pipSize,
            h: pipSize
        };

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        drawCameraVideo(ctx, camera, pipRect, true);

        // Border
        ctx.beginPath();
        const r = pipRect.w / 2;
        ctx.arc(pipRect.x + r, pipRect.y + r, r, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "white";
        ctx.stroke();

        ctx.restore();
    }
};

// --- Single Source Layouts ---

const renderCameraOnlyCenter: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);
    if (camera) {
        // Center with padding
        const rect: Rect = {
            x: PADDING,
            y: PADDING,
            w: w - (PADDING * 2),
            h: h - (PADDING * 2)
        };
        drawVideoInRect(ctx, camera, rect, "contain", "round-rect");
    }
};

const renderCameraOnlyFull: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);
    if (camera) {
        drawVideoInRect(ctx, camera, { x: 0, y: 0, w, h }, "cover", "round-rect"); // Full screen usually means no rounded corners? 
        // But let's assume raw video. But if we want consistent aesthetics?
        // "Full" usually means full canvas.
        ctx.drawImage(camera, 0, 0, w, h);
    }
};

const renderScreenOnly: LayoutMode["render"] = (ctx, screen, camera, w, h, bg) => {
    drawBackground(ctx, w, h, bg);
    if (screen) {
        const rect: Rect = {
            x: PADDING,
            y: PADDING,
            w: w - (PADDING * 2),
            h: h - (PADDING * 2)
        };
        drawScreenVideo(ctx, screen, rect);
    }
};

// ==========================================
// EXPORT
// ==========================================

export const LAYOUTS: LayoutMode[] = [
    { id: "screen-camera-br", label: "Bottom Right", icon: PictureInPicture, render: renderScreenCameraBR },
    { id: "screen-camera-bl", label: "Bottom Left", icon: PictureInPicture, render: renderScreenCameraBL },
    { id: "screen-camera-left", label: "Camera Left", icon: LayoutTemplate, render: renderScreenCameraSideLeft },
    { id: "screen-camera-right", label: "Camera Right", icon: LayoutTemplate, render: renderScreenCameraSideRight },
    { id: "camera-only-center", label: "Centered", icon: Square, render: renderCameraOnlyCenter },
    { id: "camera-only-full", label: "Full Screen", icon: RectangleHorizontal, render: renderCameraOnlyFull },
    { id: "screen-only", label: "Screen Only", icon: Monitor, render: renderScreenOnly },
];

export const getLayout = (id: LayoutId) => LAYOUTS.find(l => l.id === id) || LAYOUTS[0];

