import { FloorObject, WallAlignment } from "../components/floor-plan/Canvas";

/**
 * Calculates distance between two points
 */
export const getDistance = (p1: { x: number, y: number }, p2: { x: number, y: number }) =>
    Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

/**
 * Calculates angle in degrees between two points
 */
export const getAngle = (p1: { x: number, y: number }, p2: { x: number, y: number }) =>
    Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);

/**
 * Calculates perpendicular offset distance based on alignment
 */
export const getAlignmentOffset = (alignment: WallAlignment = "center", thickness: number) => {
    switch (alignment) {
        case "left": return -thickness / 2;
        case "right": return thickness / 2;
        default: return 0;
    }
    // Note: Sign convention must match the Canvas coordinate system
};

/**
 * Calculates the Visual Rect (x, y, width, height, rotation) for a wall
 * based on Start/End points (Reference Line) and Thickness/Alignment.
 */
export const getWallFromPoints = (
    start: { x: number, y: number },
    end: { x: number, y: number },
    thickness: number,
    alignment: WallAlignment
) => {
    const length = Math.max(20, getDistance(start, end));
    const rotation = getAngle(start, end);

    // Midpoint of Reference Line
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    const rad = rotation * (Math.PI / 180);
    // Perpendicular Vector (Left side relative to wall vector)
    const px = Math.sin(rad);
    const py = -Math.cos(rad);

    const offsetDist = getAlignmentOffset(alignment, thickness);

    // Visual Center (shifted by alignment)
    const cx = midX + px * offsetDist;
    const cy = midY + py * offsetDist;

    // x, y are top-left of the unrotated, untranslated rect relative to the rotation center?
    // No, standard SVG rotate transform is around cx, cy.
    // The rect is drawn at (cx - w/2, cy - h/2).

    return {
        x: cx - length / 2,
        y: cy - thickness / 2,
        width: length,
        height: thickness,
        rotation,
        alignment
    };
};

/**
 * Calculates the Start/End points (Nodes) of the Reference Line
 * from the Visual Rect.
 */
export const getWallEndpoints = (obj: FloorObject) => {
    const thickness = obj.height;
    const alignment = obj.alignment || "center";

    // Visual Center
    const cx = obj.x + obj.width / 2; // Width is Length
    const cy = obj.y + obj.height / 2; // Height is Thickness

    const rad = obj.rotation * (Math.PI / 180);
    const px = Math.sin(rad);
    const py = -Math.cos(rad);
    const offsetDist = getAlignmentOffset(alignment, thickness);

    // Reference Center (Inverse offset)
    const rcx = cx - px * offsetDist;
    const rcy = cy - py * offsetDist;

    // Vector to endpoints (Length/2 along rotation)
    const dx = (Math.cos(rad) * obj.width) / 2;
    const dy = (Math.sin(rad) * obj.width) / 2;

    return {
        start: { x: rcx - dx, y: rcy - dy },
        end: { x: rcx + dx, y: rcy + dy }
    };
};

/**
 * Snaps a point to the nearest wall segment.
 * Projects the point onto the wall line segment.
 */
export const snapToNearestWall = (
    point: { x: number, y: number },
    walls: FloorObject[],
    threshold: number = 20,
    objectWidth?: number
) => {
    let closestDist = Infinity;
    let snappedPoint = null;
    let snappedRotation = 0;
    let snappedWallId = null;

    for (const wall of walls) {
        if (wall.type !== 'wall') continue;

        const { start, end } = getWallEndpoints(wall);

        // Project point onto line segment [start, end]
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const l2 = dx * dx + dy * dy;

        if (l2 === 0) continue; // Start and end are same

        let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / l2;

        // Default clamp [0, 1]
        let tMin = 0;
        let tMax = 1;

        // If object width provided, constrain so object stays INSIDE wall
        if (objectWidth) {
            const wallLen = Math.sqrt(l2);
            const padT = (objectWidth / 2) / wallLen;

            if (padT >= 0.5) {
                // Object bigger than wall? Snap to center
                tMin = 0.5;
                tMax = 0.5;
            } else {
                tMin = padT;
                tMax = 1 - padT;
            }
        }

        t = Math.max(tMin, Math.min(tMax, t)); // Clamp to valid range

        const projX = start.x + t * dx;
        const projY = start.y + t * dy;

        const dist = Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));

        if (dist < closestDist && dist <= threshold) {
            closestDist = dist;
            snappedPoint = { x: projX, y: projY };
            snappedRotation = wall.rotation; // Inherit wall rotation
            snappedWallId = wall.id;
        }
    }

    if (snappedPoint) {
        return {
            x: snappedPoint.x,
            y: snappedPoint.y,
            rotation: snappedRotation,
            wallId: snappedWallId
        };
    }

    return null;
};
