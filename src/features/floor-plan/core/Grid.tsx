import React from "react";
import { GRID_SIZE } from "./SnapUtils";

export const Grid = () => {
    return (
        <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-20">
            <defs>
                <pattern
                    id="grid-pattern"
                    width={GRID_SIZE}
                    height={GRID_SIZE}
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.5"
                    />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
    );
};
