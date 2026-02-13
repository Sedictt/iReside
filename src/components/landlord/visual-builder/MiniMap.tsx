"use client";
import React, { useEffect, useRef, useCallback } from "react";

const GRID_CELL_SIZE = 40;

const unitConfig: Record<string, { width: number; height: number }> = {
    studio: { width: 2, height: 2 },
    "1br": { width: 3, height: 2 },
    "2br": { width: 4, height: 3 },
    "3br": { width: 5, height: 3 },
    dorm: { width: 2, height: 2 },
    stairs: { width: 2, height: 2 },
};

const getUnitConfig = (type: string) => unitConfig[type] ?? { width: 3, height: 2 };

interface MiniUnit {
    id: string;
    type: string;
    gridX: number;
    gridY: number;
    status: string;
}

interface MiniTile {
    id: string;
    type: string;
    gridX: number;
    gridY: number;
}

interface MiniMapProps {
    units: MiniUnit[];
    tiles?: MiniTile[];
    viewportRef: React.RefObject<HTMLDivElement | null>;
    zoom: number;
    worldWidth?: number;
    worldHeight?: number;
    rightOffset?: number;
}

const MINI_W = 180;
const MINI_H = 120;

/**
 * Thumbnail overview of the full canvas with a draggable viewport rectangle.
 */
export default function MiniMap({
    units,
    tiles = [],
    viewportRef,
    zoom,
    worldWidth = 3000,
    worldHeight = 2000,
    rightOffset = 292,
}: MiniMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDragging = useRef(false);

    const scaleX = MINI_W / worldWidth;
    const scaleY = MINI_H / worldHeight;

    const draw = useCallback(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, MINI_W, MINI_H);

        // Background
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, MINI_W, MINI_H);

        // Draw grid lines faintly
        ctx.strokeStyle = "rgba(71, 85, 105, 0.2)";
        ctx.lineWidth = 0.5;
        const cols = Math.ceil(worldWidth / GRID_CELL_SIZE);
        const rows = Math.ceil(worldHeight / GRID_CELL_SIZE);
        for (let c = 0; c <= cols; c++) {
            const x = c * GRID_CELL_SIZE * scaleX;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MINI_H); ctx.stroke();
        }
        for (let r = 0; r <= rows; r++) {
            const y = r * GRID_CELL_SIZE * scaleY;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MINI_W, y); ctx.stroke();
        }

        // Draw corridor tiles
        for (const tile of tiles) {
            const px = tile.gridX * GRID_CELL_SIZE * scaleX;
            const py = tile.gridY * GRID_CELL_SIZE * scaleY;
            const size = GRID_CELL_SIZE * scaleX;
            ctx.fillStyle = "#1f2937";
            ctx.fillRect(px, py, size, size);
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 0.3;
            ctx.strokeRect(px, py, size, size);
        }

        // Draw units
        for (const u of units) {
            const cfg = getUnitConfig(u.type);
            const px = u.gridX * GRID_CELL_SIZE * scaleX;
            const py = u.gridY * GRID_CELL_SIZE * scaleY;
            const pw = cfg.width * GRID_CELL_SIZE * scaleX;
            const ph = cfg.height * GRID_CELL_SIZE * scaleY;

            ctx.fillStyle =
                u.status === "vacant" ? "#3f915f" :
                u.status === "occupied" ? "#5a7fb3" :
                u.status === "neardue" ? "#b86b3a" :
                u.status === "maintenance" ? "#a34b4b" :
                u.type === "stairs" ? "#475569" :
                "#334155";
            ctx.fillRect(px, py, pw, ph);
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 0.3;
            ctx.strokeRect(px, py, pw, ph);
        }

        // Viewport rectangle
        const vp = viewportRef.current;
        if (vp) {
            const vx = (vp.scrollLeft / zoom) * scaleX;
            const vy = (vp.scrollTop / zoom) * scaleY;
            const vw = (vp.clientWidth / zoom) * scaleX;
            const vh = (vp.clientHeight / zoom) * scaleY;

            ctx.strokeStyle = "#60a5fa";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(vx, vy, vw, vh);
            ctx.fillStyle = "rgba(96, 165, 250, 0.08)";
            ctx.fillRect(vx, vy, vw, vh);
        }
    }, [units, tiles, viewportRef, zoom, scaleX, scaleY, worldWidth, worldHeight]);

    // Redraw on each animation frame-ish (scroll changes, etc.)
    useEffect(() => {
        let rafId: number;
        const loop = () => {
            draw();
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [draw]);

    const panTo = useCallback((e: React.MouseEvent | MouseEvent) => {
        const vp = viewportRef.current;
        const canvas = canvasRef.current;
        if (!vp || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Convert minimap coords to world coords, center viewport
        const worldX = mx / scaleX;
        const worldY = my / scaleY;
        vp.scrollLeft = worldX * zoom - vp.clientWidth / 2;
        vp.scrollTop = worldY * zoom - vp.clientHeight / 2;
    }, [viewportRef, zoom, scaleX, scaleY]);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        panTo(e);
    }, [panTo]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => { if (isDragging.current) panTo(e); };
        const onMouseUp = () => { isDragging.current = false; };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [panTo]);

    return (
        <div
            style={{
                position: "absolute",
                bottom: 12,
                right: rightOffset,
                width: MINI_W,
                height: MINI_H,
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid #334155",
                boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                zIndex: 80,
                cursor: "crosshair",
                background: "#0f172a",
            }}
            onMouseDown={onMouseDown}
        >
            <canvas ref={canvasRef} width={MINI_W} height={MINI_H} style={{ display: "block" }} />
            <div
                style={{
                    position: "absolute",
                    top: 4,
                    left: 6,
                    color: "rgba(148, 163, 184, 0.5)",
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    pointerEvents: "none",
                    userSelect: "none",
                }}
            >
                Mini-Map
            </div>
        </div>
    );
}
