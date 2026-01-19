import React from "react";
import { GRID_SIZE } from "./SnapUtils";

export const InfiniteGrid = () => {
    // We render a huge rectangle to simulate infinity. 
    // The pattern handles the repetition relative to world coordinates.
    const HUGE_SIZE = 500000;

    return (
        <g className="pointer-events-none opacity-20">
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
                        strokeWidth="1" // Crisp 1px (in world units, will scale naturally but 'non-scaling-stroke' can keep it thin if desired)
                        vectorEffect="non-scaling-stroke" // Ensure grid stays thin when zooming in? Or let it thicken? 
                    // Usually CAD grids stay thin.
                    />
                </pattern>
            </defs>
            <rect
                x={-HUGE_SIZE}
                y={-HUGE_SIZE}
                width={HUGE_SIZE * 2}
                height={HUGE_SIZE * 2}
                fill="url(#grid-pattern)"
            />
        </g>
    );
};
