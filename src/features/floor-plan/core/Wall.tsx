import React from "react";
import { cn } from "@/lib/utils";

interface WallProps {
    id?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    selected?: boolean;
    onMouseDown?: (e: React.MouseEvent) => void;
    className?: string;
    isGhost?: boolean;
    showDimensions?: boolean; // Show dimension annotations (cotas)
    // Joining Props
    startExtension?: number;
    endExtension?: number;
    hideStartStroke?: boolean;
    hideEndStroke?: boolean;
}

export const Wall = ({
    x,
    y,
    width,
    height,
    rotation,
    selected,
    onMouseDown,
    className,
    isGhost = false,
    showDimensions = true,
    startExtension = 0,
    endExtension = 0,
    hideStartStroke = false,
    hideEndStroke = false,
}: WallProps) => {
    // Calculate dimension text
    const dimensionOffset = 20;

    // Readable Text Logic:
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const isUpsideDown = normalizedRotation > 90 && normalizedRotation < 270;
    const textRotation = isUpsideDown ? 180 : 0;

    // Calculated Geometry including extensions
    const renderX = -startExtension;
    const renderWidth = width + startExtension + endExtension;

    // Common Stroke Class
    const strokeClass = cn(
        "stroke-neutral-500 stroke-[1]",
        selected && "stroke-primary stroke-[2]"
    );
    const fillClass = "fill-neutral-600";

    return (
        <g
            className={cn(
                "transition-colors cursor-move group",
                isGhost ? "opacity-50 pointer-events-none" : "",
                className
            )}
            transform={`translate(${x + width / 2}, ${y + height / 2}) rotate(${rotation}) translate(${-width / 2}, ${-height / 2})`}
            onMouseDown={onMouseDown}
        >
            {/* The Wall Body (Fill Only) */}
            <rect
                x={renderX}
                y={0}
                width={renderWidth}
                height={height}
                className={cn(fillClass, "stroke-none")}
            />

            {/* Decomposed Strokes (Lines) */}
            {/* Top */}
            <line x1={renderX} y1={0} x2={renderX + renderWidth} y2={0} className={strokeClass} vectorEffect="non-scaling-stroke" />

            {/* Bottom */}
            <line x1={renderX} y1={height} x2={renderX + renderWidth} y2={height} className={strokeClass} vectorEffect="non-scaling-stroke" />

            {/* Left (Start) - conditionally rendered */}
            {!hideStartStroke && (
                <line x1={renderX} y1={0} x2={renderX} y2={height} className={strokeClass} vectorEffect="non-scaling-stroke" />
            )}

            {/* Right (End) - conditionally rendered */}
            {!hideEndStroke && (
                <line x1={renderX + renderWidth} y1={0} x2={renderX + renderWidth} y2={height} className={strokeClass} vectorEffect="non-scaling-stroke" />
            )}

            {/* Dimension Line (Cota) - only shown when showDimensions is true and width is valid */}
            {showDimensions && !isNaN(width) && width > 0 && (
                <g transform={`translate(0, ${-dimensionOffset})`}>
                    <g transform={`rotate(${textRotation}, ${width / 2}, -5)`}>
                        <text
                            x={width / 2}
                            y={-5}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-foreground text-[10px] select-none font-medium"
                            style={{ fontSize: '10px' }}
                        >
                            {Math.round(width)} cm
                        </text>
                    </g>

                    {/* The Line */}
                    <line x1={0} y1={0} x2={width} y2={0} className="stroke-neutral-400 stroke-[1] opacity-60" />
                    {/* Ticks */}
                    <line x1={0} y1={-3} x2={0} y2={3} className="stroke-neutral-400 stroke-[1]" />
                    <line x1={width} y1={-3} x2={width} y2={3} className="stroke-neutral-400 stroke-[1]" />
                </g>
            )}
        </g>
    );
};
