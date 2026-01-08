"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { InfiniteGrid } from "./InfiniteGrid";
import { snapToGrid } from "./SnapUtils";
import { cn } from "@/lib/utils";
import { Maximize, Plus, Minus } from "lucide-react";
import { Wall } from "./Wall";
import { getWallFromPoints, getWallEndpoints, snapToNearestWall } from "@/helpers/wall-math";
import { calculateWallJoins } from "@/helpers/wall-junctions";

// ... (existing helper types)
// ...


// NEW IMPORT if needed (none)

export type FloorObjectType = "wall" | "door" | "window" | "column" | "table" | "bar";
export type WallAlignment = "center" | "left" | "right";
export type TableShape = "square" | "rectangular" | "circular" | "semicircle";
export type ChairType = "chair" | "wheelchair" | "child";

export interface SeatConfig {
    enabled: boolean;
    type: ChairType;
}

export interface FloorObject {
    id: string;
    type: FloorObjectType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    alignment?: WallAlignment; // For walls
    shape?: TableShape; // For tables/bars
    doorType?: "single" | "double"; // For doors
    swingDirection?: "left" | "right"; // For single doors
    seating?: {
        top?: SeatConfig;
        right?: SeatConfig;
        bottom?: SeatConfig;
        left?: SeatConfig;
    };
    label?: string;
    seats?: number;
    // Service Fields
    status?: "available" | "occupied" | "reserved" | "dirty";
    current_pax?: number;
    customerName?: string;

    // For architecture
    attachedWallId?: string; // ID of the wall this object is attached to
}



interface CanvasProps {
    objects: FloorObject[];
    setObjects: (objects: FloorObject[]) => void;
    selectedTool: FloorObjectType | "select" | null;
    onSelectTool: (tool: FloorObjectType | "select" | null) => void;
    selectedId: string | null;
    onSelectId: (id: string | null) => void;
    onToolUsed?: () => void;
    backgroundObjects?: FloorObject[]; // Read-only background objects (e.g., walls from architecture)
    chairSpacingCm?: number; // Spacing per chair (default 60cm)
    defaultTableSizeCm?: number; // Default size for new tables (default 70cm or 80cm)
    showDimensions?: boolean; // Show dimensions (default true)
    selectedIds?: Set<string>; // Multi-selection support
    onMultiSelect?: (ids: Set<string>) => void;
}

export const Canvas = ({
    objects,
    setObjects,
    selectedTool,
    onSelectTool,
    selectedId,
    onSelectId,
    backgroundObjects = [],
    chairSpacingCm = 60,
    defaultTableSizeCm = 70,
    showDimensions = true,
    selectedIds,
    onMultiSelect
}: CanvasProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState({ x: -500, y: -500, zoom: 1 });

    const [isPanning, setIsPanning] = useState(false);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [viewStart, setViewStart] = useState({ x: 0, y: 0 });
    const [objectDragOffset, setObjectDragOffset] = useState({ x: 0, y: 0 });

    // BIM Ghost State
    const [ghostState, setGhostState] = useState<{ x: number, y: number, rotation: number, type: FloorObjectType, width: number, height: number, wallId?: string } | null>(null);

    // Node Editing
    const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

    // Calculate Wall Joins
    const wallJoins = useMemo(() => calculateWallJoins(objects), [objects]);

    const [creationStart, setCreationStart] = useState<{ x: number, y: number } | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

    const [containerDims, setContainerDims] = useState({ width: 1000, height: 800 });

    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);
    const [lastMousePos, setLastMousePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

    const renderWindow = (obj: FloorObject, key: string, props: any) => {
        const frameWidth = 4;

        return (
            <g key={key} {...props}>
                {/* Wall Cutout (White Background) - Only if attached to a wall */}
                {obj.attachedWallId && (
                    <rect
                        x={obj.x}
                        y={obj.y}
                        width={obj.width}
                        height={obj.height}
                        fill="#fff"
                        stroke="none"
                    />
                )}

                {/* Glass Pane - Transparent with simple lines */}
                <rect
                    x={obj.x}
                    y={obj.y + (obj.height / 2) - 2}
                    width={obj.width}
                    height={4}
                    fill="none"
                    stroke={props.selected ? undefined : "#000"}
                    strokeWidth={1}
                />
                {/* Side Frames */}
                <rect x={obj.x} y={obj.y} width={frameWidth} height={obj.height} fill="#fff" stroke={props.selected ? undefined : "#000"} strokeWidth={1} />
                <rect x={obj.x + obj.width - frameWidth} y={obj.y} width={frameWidth} height={obj.height} fill="#fff" stroke={props.selected ? undefined : "#000"} strokeWidth={1} />
            </g>
        );
    };

    const renderDoor = (obj: FloorObject, key: string, props: any) => {
        const isDouble = obj.doorType === "double";

        // Door Panel Dimensions
        const panelThick = 5;
        const doorWidth = isDouble ? obj.width / 2 : obj.width; // Width of ONE door panel

        // Colors
        const panelFill = "#fff"; // Keep panel white to look solid? Or empty? Usually solid.
        const strokeColor = "#000";

        // Helper for Single Door
        const renderSingleDoor = () => {
            // Hinge at top-left (x, y)
            // Panel extends down (y + doorWidth)
            // Arc goes from Tip (x, y + doorWidth) to Latch (x + doorWidth, y)
            return (
                <g>
                    {/* Swing Arc */}
                    <path
                        d={`M ${obj.x} ${obj.y + doorWidth} Q ${obj.x + doorWidth} ${obj.y + doorWidth} ${obj.x + doorWidth} ${obj.y}`}
                        fill="none" stroke={strokeColor} strokeWidth={1} strokeDasharray="4 2" vectorEffect="non-scaling-stroke"
                    />
                    {/* Door Panel */}
                    <rect x={obj.x} y={obj.y} width={panelThick} height={doorWidth} fill={panelFill} stroke={strokeColor} strokeWidth={2} />
                </g>
            );
        };

        // Helper for Double Door
        const renderDoubleDoor = () => {
            const midX = obj.x + (obj.width / 2);
            // Left Panel: Hinge at (x, y). Extends to (x, y + doorWidth). Arc to (midX, y)
            // Right Panel: Hinge at (x + width, y). Extends to (x + width, y + doorWidth). Arc to (midX, y)

            return (
                <g>
                    {/* Left Arc */}
                    <path d={`M ${obj.x} ${obj.y + doorWidth} Q ${midX} ${obj.y + doorWidth} ${midX} ${obj.y}`} fill="none" stroke={strokeColor} strokeWidth={1} strokeDasharray="4 2" vectorEffect="non-scaling-stroke" />
                    {/* Right Arc */}
                    <path d={`M ${obj.x + obj.width} ${obj.y + doorWidth} Q ${midX} ${obj.y + doorWidth} ${midX} ${obj.y}`} fill="none" stroke={strokeColor} strokeWidth={1} strokeDasharray="4 2" vectorEffect="non-scaling-stroke" />

                    {/* Left Panel */}
                    <rect x={obj.x} y={obj.y} width={panelThick} height={doorWidth} fill={panelFill} stroke={strokeColor} strokeWidth={2} />
                    {/* Right Panel */}
                    <rect x={obj.x + obj.width - panelThick} y={obj.y} width={panelThick} height={doorWidth} fill={panelFill} stroke={strokeColor} strokeWidth={2} />
                </g>
            );
        };

        return (
            <g key={key} {...props}>
                {/* Wall Cutout (White background mask) - Only if attached */}
                {obj.attachedWallId && (
                    <rect
                        x={obj.x}
                        y={obj.y}
                        width={obj.width}
                        height={obj.height}
                        fill="#fff"
                        stroke="none"
                    />
                )}

                {isDouble ? renderDoubleDoor() : renderSingleDoor()}
                {/* Visual Jambs/Stops at the wall line */}
                <rect x={obj.x} y={obj.y} width={2} height={obj.height} fill={strokeColor} />
                <rect x={obj.x + obj.width - 2} y={obj.y} width={2} height={obj.height} fill={strokeColor} />
            </g>
        );
    };

    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setContainerDims({ width, height });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Delete selected element with Delete or Backspace
            if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
                // Prevent backspace from navigating back
                e.preventDefault();
                setObjects(objects.filter(o => o.id !== selectedId));
                onSelectId(null);
                return;
            }

            // Escape to cancel/deselect
            if (e.key === "Escape") {
                if (creationStart) {
                    setCreationStart(null);
                } else if (draggingHandle) {
                    setDraggingHandle(null);
                } else if (draggedId) {
                    setDraggedId(null);
                } else if (selectedId) {
                    onSelectId(null);
                } else if (selectedTool !== "select") {
                    onSelectTool("select");
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [creationStart, draggingHandle, draggedId, selectedId, selectedTool, onSelectTool, objects, setObjects, onSelectId]);

    // --- Helpers ---
    const toWorldClass = (screenX: number, screenY: number) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = screenX - rect.left;
        const offsetY = screenY - rect.top;
        return {
            x: view.x + (offsetX / view.zoom),
            y: view.y + (offsetY / view.zoom)
        };
    };

    // --- Viewport Logic ---
    // Track if user has manually interacted with the view (pan/zoom)
    const userHasInteracted = useRef(false);

    const pan = (e: React.MouseEvent) => {
        if (!isPanning) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setView(prev => ({
            ...prev,
            x: viewStart.x - (dx / view.zoom),
            y: viewStart.y - (dy / view.zoom)
        }));
    };

    const stopPan = () => setIsPanning(false);

    const fitToScreen = () => {
        const allObjects = [...objects, ...backgroundObjects];
        if (allObjects.length === 0) {
            setView({ x: -500, y: -500, zoom: 1 });
            return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        allObjects.forEach(obj => {
            minX = Math.min(minX, obj.x);
            minY = Math.min(minY, obj.y);
            maxX = Math.max(maxX, obj.x + obj.width);
            maxY = Math.max(maxY, obj.y + obj.height);
        });
        const padding = 100;
        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;
        const zoomX = containerDims.width / width;
        const zoomY = containerDims.height / height;
        const newZoom = Math.min(Math.min(zoomX, zoomY), 2); // Cap zoom at 2x 
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        const newX = midX - (containerDims.width / 2) / newZoom;
        const newY = midY - (containerDims.height / 2) / newZoom;
        setView({ x: newX, y: newY, zoom: newZoom });
    };

    // Auto-fit on initial load with debounce to handle async data loading (tables then architecture)
    useEffect(() => {
        const hasData = objects.length > 0 || backgroundObjects.length > 0;
        if (hasData && !userHasInteracted.current) {
            const timer = setTimeout(() => {
                if (!userHasInteracted.current) {
                    fitToScreen();
                }
            }, 300); // 300ms debounce to wait for all data
            return () => clearTimeout(timer);
        }
    }, [objects, backgroundObjects]); // Re-run if data changes

    const handleWheel = (e: React.WheelEvent) => {
        userHasInteracted.current = true;
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = view.x + (mouseX / view.zoom);
        const worldY = view.y + (mouseY / view.zoom);
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newZoom = Math.min(Math.max(view.zoom + delta, 0.1), 10);
        const newViewX = worldX - (mouseX / newZoom);
        const newViewY = worldY - (mouseY / newZoom);
        setView({ x: newViewX, y: newViewY, zoom: newZoom });
    };

    const startPan = (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            userHasInteracted.current = true;
            setIsPanning(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            setViewStart({ x: view.x, y: view.y });
        }
    };

    const zoomIn = () => setView(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 10) }));
    const zoomOut = () => setView(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }));

    // --- Mouse Handlers ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (isPanning) return;
        const { x, y } = toWorldClass(e.clientX, e.clientY);
        const snapped = { x: snapToGrid(x), y: snapToGrid(y) };

        // Pan
        if (selectedTool === "select" || e.button === 1 || e.altKey) {
            if (e.button === 1 || e.altKey) {
                e.preventDefault();
                startPan(e);
                return;
            }
        }

        // Selection (Marquee) - Background Click
        if (selectedTool === "select" && e.button === 0 && !e.altKey) {
            // Deselect all (unless shift?? No, click background usually clears)
            // But checking here implies we missed objects (z-index).
            onSelectId(null);
            // Also clear multi
            onMultiSelect?.(new Set());

            // Start Marquee
            setIsSelecting(true);
            setSelectionBox({ start: { x, y }, end: { x, y } });
        }

        // Creation - Only on left click
        if (selectedTool && selectedTool !== "select" && e.button === 0) {
            if (selectedTool === "wall") {
                if (!creationStart) {
                    setCreationStart(snapped);
                } else {
                    const wallData = getWallFromPoints(creationStart, snapped, 15, "center"); // Default creation
                    const newId = crypto.randomUUID();
                    setObjects([...objects, { id: newId, type: "wall", ...wallData }]);
                    setCreationStart(null);
                    onSelectId(newId);
                }
            } else {
                const newId = crypto.randomUUID();
                let objWidth = 20;
                let objHeight = 60;
                let finalX = snapped.x;
                let finalY = snapped.y;
                let finalRotation = 0;
                let finalWallId: string | undefined = undefined;

                if (selectedTool === "table" || selectedTool === "bar") {
                    objWidth = defaultTableSizeCm;
                    objHeight = defaultTableSizeCm;
                    finalX = snapped.x - objWidth / 2;
                    finalY = snapped.y - objHeight / 2;
                } else if (selectedTool === "door" || selectedTool === "window") {
                    // Strict Snap Check
                    if (!ghostState) return;

                    // Use Ghost State
                    objWidth = ghostState.width;
                    objHeight = ghostState.height;
                    finalX = ghostState.x - ghostState.width / 2; // Top-Left from Center
                    finalY = ghostState.y - ghostState.height / 2;
                    finalRotation = ghostState.rotation;
                    finalWallId = ghostState.wallId;
                } else if (selectedTool === "column") {
                    objWidth = 40;
                    objHeight = 40;
                    finalX = snapped.x - objWidth / 2;
                    finalY = snapped.y - objHeight / 2;
                }

                // Center on mouse position
                const newObject: FloorObject = {
                    id: newId,
                    type: selectedTool,
                    x: finalX,
                    y: finalY,
                    width: objWidth,
                    height: objHeight,
                    rotation: finalRotation,
                    attachedWallId: finalWallId
                };

                // Add shape for tables/bars... (existing)
                // ...
                if (selectedTool === "table" || selectedTool === "bar") {
                    newObject.shape = "rectangular";
                    newObject.seating = {
                        top: { enabled: true, type: "chair" },
                        right: { enabled: true, type: "chair" },
                        bottom: { enabled: true, type: "chair" },
                        left: { enabled: true, type: "chair" },
                    };
                }

                setObjects([...objects, newObject]);
                onSelectId(newId);
            }
        }
    };

    const handleObjectMouseDown = (e: React.MouseEvent, id: string, objX: number, objY: number) => {
        if (e.button === 1 || e.altKey) {
            e.preventDefault();
            startPan(e);
            return;
        }

        e.stopPropagation();
        if (e.button !== 0 || selectedTool !== "select") return;

        // Multi-select Logic
        const currentSelectedIds = new Set(selectedIds || []);
        let newSelectedIds = new Set(currentSelectedIds);

        if (e.shiftKey) {
            if (newSelectedIds.has(id)) newSelectedIds.delete(id);
            else newSelectedIds.add(id);
        } else {
            // If clicking an object already in selection (and no Shift), KEEP selection (for dragging group)
            // If clicking unselected object, clear and select only this
            if (!newSelectedIds.has(id)) {
                newSelectedIds.clear();
                newSelectedIds.add(id);
            }
        }

        // Sync props
        onMultiSelect?.(newSelectedIds);
        if (newSelectedIds.size === 1) onSelectId(Array.from(newSelectedIds)[0]);
        else if (newSelectedIds.size === 0) onSelectId(null);
        // If multiple, maybe keep current selectedId as primary? or last clicked?
        if (newSelectedIds.has(id)) onSelectId(id);

        setDraggedId(id);
        const { x, y } = toWorldClass(e.clientX, e.clientY);
        const snapped = { x: snapToGrid(x), y: snapToGrid(y) };
        setObjectDragOffset({ x: snapped.x - objX, y: snapped.y - objY });
        setLastMousePos(snapped);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const { x, y } = toWorldClass(e.clientX, e.clientY);
        const snapped = { x: snapToGrid(x), y: snapToGrid(y) };
        setMousePos(snapped);

        if (isPanning) {
            pan(e);
            return;
        }

        // Update Marquee Box
        if (isSelecting && selectionBox) {
            setSelectionBox(prev => prev ? { ...prev, end: { x, y } } : null);
            return;
        }

        // Handle Resizing (Node Dragging)
        if (draggingHandle && selectedId) {
            const obj = objects.find(o => o.id === selectedId);
            if (obj && obj.type === 'wall') {
                const endpoints = getWallEndpoints(obj);
                const oldStart = endpoints.start;
                const oldEnd = endpoints.end;

                let newStart = endpoints.start;
                let newEnd = endpoints.end;

                if (draggingHandle === 'start') {
                    newStart = snapped;
                } else {
                    newEnd = snapped;
                }

                const newGeo = getWallFromPoints(newStart, newEnd, obj.height, obj.alignment || "center");

                // Pre-calc vector math for children projection
                const oldDx = oldEnd.x - oldStart.x;
                const oldDy = oldEnd.y - oldStart.y;
                const oldLenSq = oldDx * oldDx + oldDy * oldDy;

                const newDx = newEnd.x - newStart.x;
                const newDy = newEnd.y - newStart.y;

                setObjects(objects.map(o => {
                    if (o.id === selectedId) {
                        return { ...o, ...newGeo };
                    }

                    // Reactive Child Update: Project old position ratio onto new wall vector
                    if (o.attachedWallId === selectedId) {
                        const cx = o.x + o.width / 2;
                        const cy = o.y + o.height / 2;

                        // Projection: t = Dot(Object-Start, Wall-Vector) / LengthSquared
                        let t = 0.5;
                        if (oldLenSq > 0.1) {
                            t = ((cx - oldStart.x) * oldDx + (cy - oldStart.y) * oldDy) / oldLenSq;
                        }

                        const newCx = newStart.x + t * newDx;
                        const newCy = newStart.y + t * newDy;

                        return {
                            ...o,
                            x: newCx - o.width / 2,
                            y: newCy - o.height / 2,
                            rotation: newGeo.rotation
                        };
                    }
                    return o;
                }));
            }
            return;
        }

        // Handle Moving (Group/Single)
        if (draggedId) {
            const dx = snapped.x - lastMousePos.x;
            const dy = snapped.y - lastMousePos.y;
            setLastMousePos(snapped);

            const draggedObj = objects.find(o => o.id === draggedId);

            // Constrained sliding for attached objects
            if (draggedObj?.attachedWallId) {
                const wall = [...objects, ...backgroundObjects].find(w => w.id === draggedObj.attachedWallId);

                if (wall) {
                    // Use snapToNearestWall but RESTRICTED to this specific wall
                    // Pass object width to enforce containment
                    // We artificially create a "walls" list with just fit one wall
                    const snapResult = snapToNearestWall({ x, y }, [wall], Infinity, draggedObj.width);

                    if (snapResult) {
                        setObjects(objects.map(obj => {
                            if (obj.id === draggedId) {
                                return {
                                    ...obj,
                                    x: snapResult.x - obj.width / 2,
                                    y: snapResult.y - obj.height / 2
                                    // Rotation is already correct (attached)
                                };
                            }
                            return obj;
                        }));
                    }
                }
                return; // Skip normal drag
            }

            // Normal Drag (Unconstrained) - Supporting Reactive Parental Movement
            const movingIds = (selectedIds && selectedIds.size > 0 && selectedIds.has(draggedId))
                ? selectedIds
                : new Set([draggedId]);

            setObjects(objects.map(obj => {
                // If object is explicitly selected/dragged
                const isMoving = movingIds.has(obj.id);
                // If object is attached to a wall that is moving (and object itself isn't selected)
                const parentWallIsMoving = obj.attachedWallId && movingIds.has(obj.attachedWallId);

                if (isMoving || parentWallIsMoving) {
                    return { ...obj, x: obj.x + dx, y: obj.y + dy };
                }
                return obj;
            }));
        }

        // Smart Snap Ghost Update
        if (!draggingHandle && !draggedId && (selectedTool === "door" || selectedTool === "window")) {
            // Default width for new objects
            const defaultWidth = 100;

            // Find nearest wall with width constraint
            const snapResult = snapToNearestWall({ x, y }, [...objects, ...backgroundObjects], 50, defaultWidth);

            if (snapResult) {
                const width = defaultWidth;
                const height = 15; // Thickness

                setGhostState({
                    x: snapResult.x,
                    y: snapResult.y,
                    rotation: snapResult.rotation,
                    type: selectedTool,
                    width,
                    height,
                    wallId: snapResult.wallId || undefined
                });
            } else {
                setGhostState(null); // Disappear if too far
            }
        } else if (selectedTool !== "door" && selectedTool !== "window") {
            if (ghostState) setGhostState(null);
        }
    };

    const handleMouseUp = () => {
        if (isSelecting && selectionBox) {
            // Finalize Selection
            // Normalize box
            const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
            const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
            const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
            const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);

            const hitIds = objects.filter(obj => {
                const cx = obj.x + obj.width / 2;
                const cy = obj.y + obj.height / 2;
                // Simple centroid check for now. Can be better.
                return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
            }).map(o => o.id);

            const newSet = new Set(hitIds);
            onMultiSelect?.(newSet);
            // Sync single select
            if (hitIds.length === 1) onSelectId(hitIds[0]);
            else if (hitIds.length > 0) onSelectId(hitIds[0]); // Select first?
            else onSelectId(null);
        }

        setIsSelecting(false);
        setSelectionBox(null);
        stopPan();
        setDraggedId(null);
        setDraggingHandle(null);
        setLastMousePos({ x: 0, y: 0 });
    };

    // Use default 'center' for Ghost Wall
    const ghostWall = (selectedTool === "wall" && creationStart && mousePos)
        ? getWallFromPoints(creationStart, mousePos, 15, "center")
        : null;

    const viewBox = `${view.x} ${view.y} ${containerDims.width / view.zoom} ${containerDims.height / view.zoom}`;

    const renderHandles = () => {
        if (!selectedId) return null;
        const obj = objects.find(o => o.id === selectedId);
        if (!obj || obj.type !== 'wall') return null;

        const { start, end } = getWallEndpoints(obj);

        const Handle = ({ x, y, type }: { x: number, y: number, type: 'start' | 'end' }) => (
            <circle
                cx={x}
                cy={y}
                r={6 / view.zoom}
                className="fill-white stroke-primary stroke-[2px] cursor-pointer transition-colors hover:fill-orange-100"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    if (e.button === 0) {
                        setDraggingHandle(type);
                    }
                }}
                vectorEffect="non-scaling-stroke"
            />
        );

        return (
            <g>
                <Handle x={start.x} y={start.y} type="start" />
                <Handle x={end.x} y={end.y} type="end" />
            </g>
        );
    };

    // Ghost Render Helper
    // Ghost Render Helper
    const renderGhost = () => {
        if (!ghostState) return null;

        // Calculate Top-Left for rendering based on Center (ghostState.x, y)
        const tlX = ghostState.x - ghostState.width / 2;
        const tlY = ghostState.y - ghostState.height / 2;

        const mockObj: FloorObject = {
            id: 'ghost',
            type: ghostState.type,
            x: tlX,
            y: tlY,
            width: ghostState.width,
            height: ghostState.height,
            rotation: ghostState.rotation,
            attachedWallId: ghostState.wallId || 'ghost' // Force cutout rendering even if ID is elusive
        };

        const transform = `rotate(${ghostState.rotation}, ${ghostState.x}, ${ghostState.y})`;

        return (
            <g opacity={0.8} style={{ pointerEvents: 'none' }} transform={transform}>
                {ghostState.type === 'window'
                    ? renderWindow(mockObj, 'ghost', { selected: false, vectorEffect: 'non-scaling-stroke' })
                    : renderDoor(mockObj, 'ghost', { vectorEffect: 'non-scaling-stroke' })}
            </g>
        );
    };

    return (
        <div className="relative h-full w-full overflow-hidden bg-transparent select-none">
            <div
                ref={containerRef}
                className="absolute inset-0 h-full w-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setCreationStart(null);
                    setDraggedId(null);
                    onSelectId(null);
                    onSelectTool("select");
                }}
                onWheel={handleWheel}
            >
                <svg
                    viewBox={viewBox}
                    className={cn(
                        "w-full h-full block touch-none",
                        selectedTool === "select" ? "cursor-default" : "cursor-crosshair",
                        isPanning && "cursor-grabbing"
                    )}
                    preserveAspectRatio="xMidYMid slice"
                >
                    <InfiniteGrid />

                    <g>
                        {/* Background Objects (Architecture) */}
                        {backgroundObjects.map(obj => {
                            const commonProps = {
                                transform: `rotate(${obj.rotation}, ${obj.x + obj.width / 2}, ${obj.y + obj.height / 2})`,
                                // No interaction for background
                                vectorEffect: "non-scaling-stroke" as any
                            };

                            if (obj.type === "column") {
                                return (
                                    <ellipse
                                        key={obj.id}
                                        cx={obj.x + obj.width / 2}
                                        cy={obj.y + obj.height / 2}
                                        rx={obj.width / 2}
                                        ry={obj.height / 2}
                                        fill="#e5e5e5"
                                        stroke="#a3a3a3"
                                        {...commonProps}
                                    />
                                );
                            }
                            if (obj.type === "window") {
                                return renderWindow(obj, obj.id, commonProps);
                            }
                            if (obj.type === "door") {
                                return renderDoor(obj, obj.id, commonProps);
                            }
                            if (obj.type === "wall") {
                                return <Wall key={obj.id} {...obj} selected={false} onMouseDown={() => { }} />;
                            }
                            return null;
                        })}

                        {/* Ghost Wall */}
                        {ghostWall && <Wall {...ghostWall} isGhost showDimensions={showDimensions} />}

                        {/* Door/Window Ghost Preview */}
                        {renderGhost()}


                        {/* Hover Snap Point (Pre-creation) */}
                        {
                            selectedTool === 'wall' && !creationStart && mousePos && (
                                <circle
                                    cx={mousePos.x}
                                    cy={mousePos.y}
                                    r={4 / view.zoom}
                                    className="fill-primary/60"
                                    vectorEffect="non-scaling-stroke"
                                />
                            )
                        }

                        {/* Ghost Table/Bar Preview */}
                        {
                            (selectedTool === 'table' || selectedTool === 'bar') && mousePos && (
                                <g className="pointer-events-none">
                                    <rect
                                        x={mousePos.x - 40}
                                        y={mousePos.y - 40}
                                        width={80}
                                        height={80}
                                        rx={selectedTool === 'bar' ? 8 : 4}
                                        fill={selectedTool === 'bar' ? "#fefce8" : "#fafafa"}
                                        stroke={selectedTool === 'bar' ? "#ca8a04" : "#a1a1aa"}
                                        strokeWidth={1}
                                        strokeDasharray="4 2"
                                        opacity={0.7}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                    {['top', 'right', 'bottom', 'left'].map((side) => {
                                        const chairSize = 14;
                                        const chairOffset = 10;
                                        let cx = mousePos.x, cy = mousePos.y;

                                        switch (side) {
                                            case 'top': cx = mousePos.x; cy = mousePos.y - 40 - chairOffset - chairSize / 2; break;
                                            case 'bottom': cx = mousePos.x; cy = mousePos.y + 40 + chairOffset + chairSize / 2; break;
                                            case 'left': cx = mousePos.x - 40 - chairOffset - chairSize / 2; cy = mousePos.y; break;
                                            case 'right': cx = mousePos.x + 40 + chairOffset + chairSize / 2; cy = mousePos.y; break;
                                        }

                                        return (
                                            <rect
                                                key={`ghost-chair-${side}`}
                                                x={cx - 7}
                                                y={cy - 5}
                                                width={14}
                                                height={10}
                                                rx={2}
                                                fill="#f5f5f4"
                                                stroke="#a8a29e"
                                                strokeWidth={0.5}
                                                opacity={0.6}
                                            />
                                        );
                                    })}
                                </g>
                            )
                        }

                        {/* Start Visualization */}
                        {
                            creationStart && (
                                <circle
                                    cx={creationStart.x}
                                    cy={creationStart.y}
                                    r={4 / view.zoom}
                                    className="fill-primary animate-pulse"
                                    vectorEffect="non-scaling-stroke"
                                />
                            )
                        }

                        {/* Objects */}
                        {
                            objects.map(obj => {
                                const isSelected = selectedIds ? selectedIds.has(obj.id) : (selectedId === obj.id);
                                // Disable interaction with existing objects if we are in creation mode (except select)
                                // This allows clicks to pass through to the Canvas for "snapping" logic
                                const isInteracting = selectedTool === "select";
                                const pointerEvents = isInteracting ? "auto" : "none";

                                if (obj.type === "wall") {
                                    const joins = wallJoins[obj.id] || {};
                                    return (
                                        <Wall
                                            key={obj.id}
                                            {...obj}
                                            {...joins}
                                            selected={isSelected}
                                            onMouseDown={(e) => handleObjectMouseDown(e, obj.id, obj.x, obj.y)}
                                            showDimensions={showDimensions}
                                            className={cn(isInteracting ? "cursor-move" : "pointer-events-none")}
                                        />
                                    );
                                }

                                const commonProps = {
                                    transform: `rotate(${obj.rotation}, ${obj.x + obj.width / 2}, ${obj.y + obj.height / 2})`,
                                    onMouseDown: (e: React.MouseEvent) => handleObjectMouseDown(e, obj.id, obj.x, obj.y),
                                    className: cn(
                                        "transition-colors",
                                        isInteracting ? "cursor-move hover:stroke-primary" : "pointer-events-none",
                                        (draggedId === obj.id || isSelected) && "stroke-primary stroke-[2]"
                                    ),
                                    vectorEffect: "non-scaling-stroke" as any
                                };

                                if (obj.type === "column") {
                                    const shape = obj.shape || "rectangular";
                                    const fill = "#52525b"; // neutral-600
                                    const stroke = "#71717a"; // neutral-500

                                    if (shape === "circular") {
                                        return (
                                            <ellipse
                                                key={obj.id}
                                                cx={obj.x + obj.width / 2}
                                                cy={obj.y + obj.height / 2}
                                                rx={obj.width / 2}
                                                ry={obj.height / 2}
                                                fill={fill}
                                                stroke={stroke}
                                                {...commonProps}
                                            />
                                        );
                                    }
                                    if (shape === "semicircle") {
                                        // Flat side at bottom
                                        const rX = obj.width / 2;
                                        const rY = obj.height; // Height is radius depth
                                        const startX = obj.x;
                                        const startY = obj.y + obj.height;
                                        const endX = obj.x + obj.width;
                                        const endY = obj.y + obj.height;

                                        // M BL -> L BR -> A (large-arc-flag=0 usually for semi) to BL
                                        // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
                                        // Sweep 1 for "outward" arc
                                        const d = `M ${startX},${startY} L ${endX},${endY} A ${rX},${rY} 0 0,1 ${startX},${startY} Z`;

                                        return <path key={obj.id} d={d} fill={fill} stroke={stroke} {...commonProps} />;
                                    }

                                    return (
                                        <rect
                                            key={obj.id}
                                            x={obj.x}
                                            y={obj.y}
                                            width={obj.width}
                                            height={obj.height}
                                            fill={fill}
                                            stroke={stroke}
                                            {...commonProps}
                                        />
                                    );
                                }
                                if (obj.type === "window") {
                                    return renderWindow(obj, obj.id, { ...commonProps, selected: isSelected });
                                }
                                if (obj.type === "door") {
                                    return renderDoor(obj, obj.id, commonProps);
                                }
                                if (obj.type === "table" || obj.type === "bar") {
                                    const isCircular = obj.shape === "circular";
                                    const isBar = obj.type === "bar";
                                    const centerX = obj.x + obj.width / 2;
                                    const centerY = obj.y + obj.height / 2;

                                    // Calculate how many chairs fit
                                    const getChairCount = (sideLength: number) => Math.max(1, Math.floor(sideLength / chairSpacingCm));


                                    // Render single chair
                                    const renderSingleChair = (key: string, cx: number, cy: number, rotation: number, seatConfig: SeatConfig) => {
                                        const s = seatConfig.type === 'wheelchair' ? 60 : seatConfig.type === 'child' ? 25 : 40;
                                        // Unified colors
                                        const fill = "#f5f5f4";
                                        const stroke = "#a8a29e";
                                        const darkFill = "#d6d3d1"; // For wheel details etc
                                        const ve = "non-scaling-stroke"; // User wants chairs to have fixed fine lines

                                        if (seatConfig.type === 'wheelchair') {
                                            return (
                                                <g key={key} transform={`rotate(${rotation}, ${cx}, ${cy})`}>
                                                    <circle cx={cx - s * 0.35} cy={cy + s * 0.25} r={s * 0.15} fill={darkFill} stroke={stroke} strokeWidth={1} vectorEffect={ve} />
                                                    <circle cx={cx + s * 0.35} cy={cy + s * 0.25} r={s * 0.15} fill={darkFill} stroke={stroke} strokeWidth={1} vectorEffect={ve} />
                                                    <circle cx={cx - s * 0.25} cy={cy - s * 0.3} r={s * 0.08} fill={darkFill} />
                                                    <circle cx={cx + s * 0.25} cy={cy - s * 0.3} r={s * 0.08} fill={darkFill} />
                                                    <rect x={cx - s * 0.4} y={cy - s * 0.3} width={s * 0.8} height={s * 0.5} rx={3} fill={fill} stroke={stroke} strokeWidth={1} vectorEffect={ve} />
                                                    <rect x={cx - s * 0.35} y={cy + s * 0.15} width={s * 0.7} height={s * 0.2} rx={2} fill={fill} stroke={stroke} strokeWidth={1} vectorEffect={ve} />
                                                    <rect x={cx - s * 0.5} y={cy - s * 0.2} width={s * 0.12} height={s * 0.35} rx={2} fill={darkFill} />
                                                    <rect x={cx + s * 0.38} y={cy - s * 0.2} width={s * 0.12} height={s * 0.35} rx={2} fill={darkFill} />
                                                </g>
                                            );
                                        } else if (seatConfig.type === 'child') {
                                            return (
                                                <g key={key} transform={`rotate(${rotation}, ${cx}, ${cy})`}>
                                                    <line x1={cx - s * 0.3} y1={cy - s * 0.3} x2={cx - s * 0.35} y2={cy + s * 0.4} stroke={stroke} strokeWidth={2} vectorEffect={ve} />
                                                    <line x1={cx + s * 0.3} y1={cy - s * 0.3} x2={cx + s * 0.35} y2={cy + s * 0.4} stroke={stroke} strokeWidth={2} vectorEffect={ve} />
                                                    <rect x={cx - s * 0.35} y={cy - s * 0.3} width={s * 0.7} height={s * 0.5} rx={2} fill={fill} stroke={stroke} strokeWidth={1} vectorEffect={ve} />
                                                    <ellipse cx={cx} cy={cy - s * 0.4} rx={s * 0.4} ry={s * 0.18} fill={fill} stroke={stroke} strokeWidth={1} vectorEffect={ve} />
                                                </g>
                                            );
                                        } else {
                                            return (
                                                <g key={key} transform={`rotate(${rotation}, ${cx}, ${cy})`}>
                                                    <rect x={cx - s * 0.4} y={cy - s * 0.35} width={s * 0.8} height={s * 0.55} rx={3} fill={fill} stroke={stroke} strokeWidth={1} vectorEffect={ve} />
                                                    <rect x={cx - s * 0.35} y={cy + s * 0.15} width={s * 0.7} height={s * 0.25} rx={3} fill="#e7e5e4" stroke={stroke} strokeWidth={1} vectorEffect={ve} />
                                                    <circle cx={cx - s * 0.3} cy={cy - s * 0.38} r={s * 0.06} fill="#78716c" />
                                                    <circle cx={cx + s * 0.3} cy={cy - s * 0.38} r={s * 0.06} fill="#78716c" />
                                                </g>
                                            );
                                        }
                                    };

                                    const renderChairsForSide = (side: 'top' | 'right' | 'bottom' | 'left', seatConfig?: SeatConfig) => {
                                        if (!seatConfig?.enabled) return null;
                                        const sideLength = (side === 'top' || side === 'bottom') ? obj.width : obj.height;
                                        const count = getChairCount(sideLength);
                                        const s = seatConfig.type === 'wheelchair' ? 60 : seatConfig.type === 'child' ? 25 : 40;
                                        const halfChair = s / 2;
                                        const overlap = s * 0.2;
                                        const chairs = [];
                                        for (let i = 0; i < count; i++) {
                                            const spacing = sideLength / (count + 1);
                                            const offset = spacing * (i + 1);
                                            let cx = 0, cy = 0, rot = 0;
                                            switch (side) {
                                                case 'top': cx = obj.x + offset; cy = obj.y - halfChair + overlap; rot = 180; break;
                                                case 'bottom': cx = obj.x + offset; cy = obj.y + obj.height + halfChair - overlap; rot = 0; break;
                                                case 'left': cx = obj.x - halfChair + overlap; cy = obj.y + offset; rot = 90; break;
                                                case 'right': cx = obj.x + obj.width + halfChair - overlap; cy = obj.y + offset; rot = -90; break;
                                            }
                                            chairs.push(renderSingleChair(`${obj.id}-${side}-${i}`, cx, cy, rot, seatConfig));
                                        }
                                        return chairs;
                                    };

                                    return (
                                        <g key={obj.id} transform={`rotate(${obj.rotation}, ${centerX}, ${centerY})`}>
                                            {renderChairsForSide('top', obj.seating?.top)}
                                            {renderChairsForSide('right', obj.seating?.right)}
                                            {renderChairsForSide('bottom', obj.seating?.bottom)}
                                            {renderChairsForSide('left', obj.seating?.left)}

                                            {isCircular ? (
                                                <ellipse
                                                    cx={centerX}
                                                    cy={centerY}
                                                    rx={obj.width / 2}
                                                    ry={obj.height / 2}
                                                    fill={obj.status === "occupied" ? "#fee2e2" : (isBar ? "#fefce8" : "#fafafa")}
                                                    stroke={isSelected ? undefined : (obj.status === "occupied" ? "#ef4444" : "#a8a29e")}
                                                    strokeWidth={isSelected ? 3 : (obj.status === "occupied" ? 2 : 1.5)}
                                                    className={cn(
                                                        "transition-colors",
                                                        isInteracting ? "cursor-move hover:stroke-primary" : "pointer-events-none",
                                                        isSelected && "stroke-primary"
                                                    )}
                                                    onMouseDown={(e) => handleObjectMouseDown(e, obj.id, obj.x, obj.y)}
                                                />
                                            ) : (
                                                <rect
                                                    x={obj.x}
                                                    y={obj.y}
                                                    width={obj.width}
                                                    height={obj.height}
                                                    rx={isBar ? 8 : 4}
                                                    fill={obj.status === "occupied" ? "#fee2e2" : (isBar ? "#fefce8" : "#fafafa")}
                                                    stroke={isSelected ? undefined : (obj.status === "occupied" ? "#ef4444" : "#a8a29e")}
                                                    strokeWidth={isSelected ? 3 : (obj.status === "occupied" ? 2 : 1.5)}
                                                    className={cn(
                                                        "transition-colors",
                                                        isInteracting ? "cursor-move hover:stroke-primary" : "pointer-events-none",
                                                        isSelected && "stroke-primary"
                                                    )}
                                                    onMouseDown={(e) => handleObjectMouseDown(e, obj.id, obj.x, obj.y)}
                                                />
                                            )}

                                            {/* Label Counter Rotated */}
                                            {obj.label && (
                                                <text
                                                    x={centerX}
                                                    y={centerY}
                                                    // Rotate in opposite direction of table so text stays upright relative to canvas
                                                    transform={`rotate(${-obj.rotation}, ${centerX}, ${centerY})`}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fontSize={Math.min(obj.width, obj.height) * 0.22}
                                                    fontWeight="600"
                                                    fill="#71717a"
                                                    className="pointer-events-none select-none"
                                                >
                                                    {obj.status === "occupied" && obj.customerName ? obj.customerName : obj.label}
                                                </text>
                                            )}
                                        </g>
                                    );
                                }
                            })
                        }
                    </g>
                    {/* Marquee Selection Box */}
                    {isSelecting && selectionBox && (
                        <rect
                            x={Math.min(selectionBox.start.x, selectionBox.end.x)}
                            y={Math.min(selectionBox.start.y, selectionBox.end.y)}
                            width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
                            height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
                            fill="rgba(59, 130, 246, 0.1)"
                            stroke="#3b82f6"
                            strokeWidth={1}
                            vectorEffect="non-scaling-stroke"
                        />
                    )}


                    {renderHandles()}
                </svg>

                <div className="absolute bottom-6 left-6 flex flex-col gap-2 items-start">
                    <div className="rounded-md bg-background/50 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
                        {Math.round(view.zoom * 100)}%
                    </div>
                    <div className="flex gap-2">
                        <button onClick={zoomIn} className="bg-background/90 p-2 rounded-md shadow-sm border hover:bg-accent">
                            <Plus size={18} />
                        </button>
                        <button onClick={zoomOut} className="bg-background/90 p-2 rounded-md shadow-sm border hover:bg-accent">
                            <Minus size={18} />
                        </button>
                        <button onClick={fitToScreen} className="bg-background/90 p-2 rounded-md shadow-sm border hover:bg-accent flex items-center gap-2">
                            <Maximize size={18} />
                        </button>
                    </div>
                </div>

                {selectedTool === 'wall' && creationStart && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-primary/20 backdrop-blur border border-primary text-primary px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                        Haz clic para finalizar el muro
                    </div>
                )}
            </div>
        </div>
    );
};
