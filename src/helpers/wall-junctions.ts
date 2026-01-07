import { FloorObject } from "@/components/floor-plan/Canvas";
import { getWallEndpoints } from "./wall-math";

interface JoinProps {
    startExtension: number;
    endExtension: number;
    hideStartStroke: boolean;
    hideEndStroke: boolean;
}

const EXTENSION_EPSILON = 2.0; // Overlap slightly to avoid sub-pixel gaps

export const calculateWallJoins = (objects: FloorObject[]): Record<string, JoinProps> => {
    const walls = objects.filter(o => o.type === "wall");
    const joins: Record<string, JoinProps> = {};

    // Initialize default joins
    walls.forEach(w => {
        joins[w.id] = { startExtension: 0, endExtension: 0, hideStartStroke: false, hideEndStroke: false };
    });

    // Detect connections
    // Naive O(N^2) - clean enough for floor plans
    for (let i = 0; i < walls.length; i++) {
        for (let j = i + 1; j < walls.length; j++) {
            const w1 = walls[i];
            const w2 = walls[j];

            const e1 = getWallEndpoints(w1);
            const e2 = getWallEndpoints(w2);

            // Check all 4 combinations
            checkConnection(w1, w2, e1.start, e2.start, 'start', 'start', joins);
            checkConnection(w1, w2, e1.start, e2.end, 'start', 'end', joins);
            checkConnection(w1, w2, e1.end, e2.start, 'end', 'start', joins);
            checkConnection(w1, w2, e1.end, e2.end, 'end', 'end', joins);
        }
    }

    return joins;
};

const checkConnection = (
    w1: FloorObject,
    w2: FloorObject,
    p1: { x: number, y: number },
    p2: { x: number, y: number },
    end1: 'start' | 'end',
    end2: 'start' | 'end',
    joins: Record<string, JoinProps>
) => {
    const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

    // If nodes are close enough (snap distance usually 10-15, but nodes should be EXACTLY same if snapped)
    // Relaxed epsilon to catch manual alignments
    if (dist < 5) {
        // They are connected.
        // Calculate angle between walls
        const r1 = w1.rotation % 180;
        const r2 = w2.rotation % 180;
        const angleDiff = Math.abs(r1 - r2);

        // Orthogonal (L-Junction)
        // 90 deg diff (or 270)
        const isOrthogonal = Math.abs(angleDiff - 90) < 5 || Math.abs(angleDiff - 270) < 5;
        const isCollinear = Math.abs(angleDiff) < 5 || Math.abs(angleDiff - 180) < 5;

        // Apply visual fixes
        if (isOrthogonal) {
            // Extend into the corner
            // Each wall extends by half its thickness (assuming center alignment primarily, but looks good usually)
            // Or extend by half of the *other* wall's thickness?
            // Actually, to fill the corner, W1 needs to extend by W2.thickness/2

            const ext1 = w2.height / 2;
            const ext2 = w1.height / 2;

            if (end1 === 'start') joins[w1.id].startExtension = Math.max(joins[w1.id].startExtension, ext1);
            else joins[w1.id].endExtension = Math.max(joins[w1.id].endExtension, ext1);

            if (end2 === 'start') joins[w2.id].startExtension = Math.max(joins[w2.id].startExtension, ext2);
            else joins[w2.id].endExtension = Math.max(joins[w2.id].endExtension, ext2);

            // Hide strokes at connection
            if (end1 === 'start') joins[w1.id].hideStartStroke = true;
            else joins[w1.id].hideEndStroke = true;

            if (end2 === 'start') joins[w2.id].hideStartStroke = true;
            else joins[w2.id].hideEndStroke = true;
        }
        else if (isCollinear) {
            // Straight join
            // Hide strokes. Extend slightly to overlap gap?
            if (end1 === 'start') {
                joins[w1.id].hideStartStroke = true;
                joins[w1.id].startExtension = Math.max(joins[w1.id].startExtension, EXTENSION_EPSILON);
            } else {
                joins[w1.id].hideEndStroke = true;
                joins[w1.id].endExtension = Math.max(joins[w1.id].endExtension, EXTENSION_EPSILON);
            }

            if (end2 === 'start') {
                joins[w2.id].hideStartStroke = true;
                joins[w2.id].startExtension = Math.max(joins[w2.id].startExtension, EXTENSION_EPSILON);
            } else {
                joins[w2.id].hideEndStroke = true;
                joins[w2.id].endExtension = Math.max(joins[w2.id].endExtension, EXTENSION_EPSILON);
            }
        }
    }
};
