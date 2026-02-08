import { LAYOUTS, LayoutId } from "@/lib/layouts/layout-engine";
import { cn } from "@/lib/utils";
import { Monitor, Video, LayoutTemplate, Square, PictureInPicture, Grid2X2, RectangleHorizontal } from "lucide-react";

interface LayoutSelectorProps {
    selectedLayout: LayoutId;
    onSelect: (id: LayoutId) => void;
    disabled?: boolean;
}

export function LayoutSelector({ selectedLayout, onSelect, disabled }: LayoutSelectorProps) {

    const groups = [
        {
            label: "Screen + Camera",
            layouts: LAYOUTS.filter(l => l.id.startsWith("screen-camera")),
        },
        {
            label: "Camera Only",
            layouts: LAYOUTS.filter(l => l.id.startsWith("camera-only")),
        },
        {
            label: "Screen Only",
            layouts: LAYOUTS.filter(l => l.id.startsWith("screen-only")),
        },
    ];

    return (
        <div className="space-y-6">
            {groups.map((group) => (
                <div key={group.label} className="space-y-3">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                        {group.label}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {group.layouts.map((layout) => {
                            const Icon = layout.icon;
                            const isSelected = selectedLayout === layout.id;

                            return (
                                <button
                                    key={layout.id}
                                    onClick={() => onSelect(layout.id)}
                                    disabled={disabled}
                                    className={cn(
                                        "relative group flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all duration-200 text-left",
                                        isSelected
                                            ? "bg-white/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                                            : "bg-[#1a1a1a] border-white/5 hover:border-white/10 hover:bg-white/5",
                                        disabled && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className={cn(
                                        "p-3 rounded-full transition-colors",
                                        isSelected ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-white/40 group-hover:text-white/60"
                                    )}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <span className={cn(
                                        "text-xs font-medium transition-colors",
                                        isSelected ? "text-white" : "text-white/40 group-hover:text-white/60"
                                    )}>
                                        {layout.label}
                                    </span>

                                    {isSelected && (
                                        <div className="absolute inset-0 rounded-xl border-2 border-indigo-500 pointer-events-none" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
