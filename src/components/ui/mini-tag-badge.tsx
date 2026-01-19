"use client";

import { TAG_ICONS } from "@/lib/tag-icons";

interface Tag {
    id: string;
    name: string;
    color?: string;
    icon?: string;
}

interface MiniTagBadgeProps {
    tag: Tag;
    size?: "sm" | "md";
}

export function MiniTagBadge({ tag, size = "md" }: MiniTagBadgeProps) {
    const IconComponent = TAG_ICONS[tag.icon || "Tag"] || TAG_ICONS["Tag"];
    const dimensions = size === "sm" ? "h-7 w-7" : "h-9 w-9";
    const iconSize = size === "sm" ? 14 : 18;
    const tagColor = tag.color || "#888888";

    return (
        <div className="relative group/tag">
            <div
                className={`${dimensions} rounded-full flex items-center justify-center shadow-sm border cursor-default transition-transform hover:scale-110`}
                style={{
                    backgroundColor: `${tagColor}15`,
                    color: tagColor,
                    borderColor: `${tagColor}30`
                }}
            >
                <IconComponent size={iconSize} strokeWidth={2.5} />
            </div>
            {/* Instant tooltip */}
            <span
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white rounded-md whitespace-nowrap opacity-0 group-hover/tag:opacity-100 pointer-events-none transition-opacity duration-100 z-50"
                style={{ backgroundColor: tagColor }}
            >
                {tag.name}
            </span>
        </div>
    );
}

interface MiniTagBadgesProps {
    tags: Tag[];
    size?: "sm" | "md";
    maxVisible?: number;
}

export function MiniTagBadges({ tags, size = "md", maxVisible = 5 }: MiniTagBadgesProps) {
    if (!tags || tags.length === 0) return null;

    const visibleTags = tags.slice(0, maxVisible);
    const hiddenCount = tags.length - maxVisible;

    return (
        <div className="flex gap-1">
            {visibleTags.map(tag => (
                <MiniTagBadge key={tag.id} tag={tag} size={size} />
            ))}
            {hiddenCount > 0 && (
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-muted text-muted-foreground">
                    +{hiddenCount}
                </div>
            )}
        </div>
    );
}
