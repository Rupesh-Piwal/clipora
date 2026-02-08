export type BackgroundType = "none" | "image" | "gradient";

export interface BackgroundOption {
    id: string;
    label: string;
    type: BackgroundType;
    value: string; // URL for image, CSS gradient string for gradient
    preview: string; // Thumbnail preview (color or small image)
}

export const BACKGROUND_GRADIENTS: BackgroundOption[] = [
    {
        id: "gradient-sunset",
        label: "Sunset",
        type: "gradient",
        value: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
        preview: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)"
    },
    {
        id: "gradient-ocean",
        label: "Ocean",
        type: "gradient",
        value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        preview: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
    },
    {
        id: "gradient-purple",
        label: "Purple Haze",
        type: "gradient",
        value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    {
        id: "gradient-green",
        label: "Emerald",
        type: "gradient",
        value: "linear-gradient(135deg, #0ba360 0%, #3cba92 100%)",
        preview: "linear-gradient(135deg, #0ba360 0%, #3cba92 100%)"
    },
    {
        id: "gradient-dark",
        label: "Midnight",
        type: "gradient",
        value: "linear-gradient(135deg, #232526 0%, #414345 100%)",
        preview: "linear-gradient(135deg, #232526 0%, #414345 100%)"
    },
    {
        id: "gradient-warm",
        label: "Warmth",
        type: "gradient",
        value: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
        preview: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)"
    },
    {
        id: "gradient-cool",
        label: "Cool Breeze",
        type: "gradient",
        value: "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
        preview: "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)"
    },
    {
        id: "gradient-neon",
        label: "Neon Life",
        type: "gradient",
        value: "linear-gradient(to right, #43e97b 0%, #38f9d7 100%)",
        preview: "linear-gradient(to right, #43e97b 0%, #38f9d7 100%)"
    },
    {
        id: "gradient-love",
        label: "Passion",
        type: "gradient",
        value: "linear-gradient(to top, #f43b47 0%, #453a94 100%)",
        preview: "linear-gradient(to top, #f43b47 0%, #453a94 100%)"
    },
    {
        id: "gradient-space",
        label: "Deep Space",
        type: "gradient",
        value: "linear-gradient(to top, #30cfd0 0%, #330867 100%)",
        preview: "linear-gradient(to top, #30cfd0 0%, #330867 100%)"
    }
];

export const BACKGROUND_IMAGES: BackgroundOption[] = [
    {
        id: "image-office",
        label: "Modern Office",
        type: "image",
        value: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop",
        preview: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=200&auto=format&fit=crop"
    },
    {
        id: "image-desk",
        label: "Wood Desk",
        type: "image",
        value: "https://images.unsplash.com/photo-1493219686098-9563d5964766?q=80&w=1920&auto=format&fit=crop",
        preview: "https://images.unsplash.com/photo-1493219686098-9563d5964766?q=80&w=200&auto=format&fit=crop"
    },
    {
        id: "image-abstract-geo",
        label: "Abstract Geo",
        type: "image",
        value: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1920&auto=format&fit=crop",
        preview: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=200&auto=format&fit=crop"
    },
    {
        id: "image-living-room",
        label: "Cozy Room",
        type: "image",
        value: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1920&auto=format&fit=crop",
        preview: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=200&auto=format&fit=crop"
    },
    {
        id: "image-nature",
        label: "Deep Forest",
        type: "image",
        value: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1920&auto=format&fit=crop",
        preview: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=200&auto=format&fit=crop"
    },
    {
        id: "image-city",
        label: "City Lights",
        type: "image",
        value: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=1920&auto=format&fit=crop",
        preview: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=200&auto=format&fit=crop"
    },
    {
        id: "image-studio",
        label: "Photo Studio",
        type: "image",
        value: "https://images.unsplash.com/photo-1590486803833-1c5dc8ce34ba?q=80&w=1920&auto=format&fit=crop",
        preview: "https://images.unsplash.com/photo-1590486803833-1c5dc8ce34ba?q=80&w=200&auto=format&fit=crop"
    },
    {
        id: "image-library",
        label: "Library",
        type: "image",
        value: "https://images.unsplash.com/photo-1507842217121-9e9628d5a235?q=80&w=1920&auto=format&fit=crop",
        preview: "https://images.unsplash.com/photo-1507842217121-9e9628d5a235?q=80&w=200&auto=format&fit=crop"
    },
    {
        id: "image-coffee",
        label: "Coffee Shop",
        type: "image",
        value: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1920&auto=format&fit=crop",
        preview: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=200&auto=format&fit=crop"
    },
    {
        id: "image-blur",
        label: "Soft Blur",
        type: "image",
        value: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1920&auto=format&fit=crop",
        preview: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=200&auto=format&fit=crop"
    }
];

export const NO_BACKGROUND: BackgroundOption = {
    id: "none",
    label: "None",
    type: "none",
    value: "#000000",
    preview: "#000000"
};
