"use client";
import React from "react";
import {
    ZoomIn, ZoomOut, Maximize, Undo2, Redo2, Grid3X3,
    Copy, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
    AlignCenterHorizontal, Trash2, Search, Layers, Paintbrush,
} from "lucide-react";

/* ─── types ─── */
export interface ToolbarProps {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    onFitToView: () => void;

    showGrid: boolean;
    onToggleGrid: () => void;
    snapToGrid: boolean;
    onToggleSnap: () => void;

    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;

    selectionCount: number;
    onBulkDelete: () => void;
    onBulkStatus: (status: string) => void;
    onDuplicate: () => void;

    onAlignRow: () => void;
    onDistribute: () => void;
    onCenterVertical: () => void;

    onOpenSearch: () => void;
    onOpenSavedViews: () => void;

    floors: number[];
    activeFloor: number;
    onFloorChange: (floor: number) => void;
    corridorPaintMode: boolean;
    onToggleCorridorPaint: () => void;
}

/* ─── small components ─── */
const Divider = () => (
    <div style={{ width: 1, height: 24, background: "#334155", margin: "0 2px" }} />
);

const TBtn = ({
    title,
    onClick,
    disabled,
    active,
    children,
}: {
    title: string;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    children: React.ReactNode;
}) => (
    <button
        type="button"
        title={title}
        onClick={onClick}
        disabled={disabled}
        style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: active ? "rgba(99,102,241,0.25)" : "transparent",
            border: active ? "1px solid rgba(99,102,241,0.5)" : "1px solid transparent",
            borderRadius: 6,
            color: disabled ? "#475569" : "#e2e8f0",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.45 : 1,
            transition: "all 0.15s",
        }}
    >
        {children}
    </button>
);

/* ─── main ─── */
export default function BuilderToolbar(props: ToolbarProps) {
    const {
        zoom,
        onZoomIn, onZoomOut, onZoomReset, onFitToView,
        showGrid, onToggleGrid, snapToGrid, onToggleSnap,
        canUndo, canRedo, onUndo, onRedo,
        selectionCount,
        onBulkDelete, onBulkStatus, onDuplicate,
        onAlignRow, onDistribute, onCenterVertical,
        onOpenSearch, onOpenSavedViews,
        floors, activeFloor, onFloorChange,
        corridorPaintMode, onToggleCorridorPaint,
    } = props;

    return (
        <div
            style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 2,
                padding: "4px 10px",
                background: "rgba(15, 23, 42, 0.92)",
                backdropFilter: "blur(12px)",
                borderRadius: 12,
                border: "1px solid #334155",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                zIndex: 90,
                pointerEvents: "auto",
                userSelect: "none",
            }}
        >
            {/* Zoom */}
            <TBtn title="Zoom In (Z)" onClick={onZoomIn}><ZoomIn size={15} /></TBtn>
            <TBtn title="Zoom Out (X)" onClick={onZoomOut}><ZoomOut size={15} /></TBtn>
            <button
                type="button"
                title="Reset Zoom"
                onClick={onZoomReset}
                style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: "2px 6px",
                    minWidth: 42,
                    textAlign: "center",
                    borderRadius: 4,
                }}
            >
                {Math.round(zoom * 100)}%
            </button>
            <TBtn title="Fit to View" onClick={onFitToView}><Maximize size={14} /></TBtn>

            <Divider />

            {/* Grid & Snap */}
            <TBtn title="Toggle Grid (G)" onClick={onToggleGrid} active={showGrid}><Grid3X3 size={15} /></TBtn>
            <TBtn title="Snap to Grid (S)" onClick={onToggleSnap} active={snapToGrid}>
                <div style={{ width: 14, height: 14, border: "2px dashed currentColor", borderRadius: 2 }} />
            </TBtn>

            <Divider />

            {/* Undo/Redo */}
            <TBtn title="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}><Undo2 size={15} /></TBtn>
            <TBtn title="Redo (Ctrl+Y)" onClick={onRedo} disabled={!canRedo}><Redo2 size={15} /></TBtn>

            <Divider />

            {/* Multi-select actions (show count badge) */}
            {selectionCount > 0 && (
                <>
                    <div style={{
                        background: "#6366f1",
                        color: "white",
                        borderRadius: 999,
                        fontSize: "0.6rem",
                        fontWeight: 800,
                        padding: "1px 7px",
                        marginRight: 2,
                    }}>
                        {selectionCount}
                    </div>
                    <TBtn title="Duplicate Selected" onClick={onDuplicate}><Copy size={14} /></TBtn>
                    <TBtn title="Delete Selected (Del)" onClick={onBulkDelete}><Trash2 size={14} /></TBtn>

                    {/* Bulk status dropdown button */}
                    <select
                        title="Set Status"
                        onChange={e => { if (e.target.value) { onBulkStatus(e.target.value); e.target.value = ""; } }}
                        defaultValue=""
                        style={{
                            width: 32, height: 32, background: "transparent", border: "1px solid transparent",
                            borderRadius: 6, color: "#e2e8f0", cursor: "pointer", fontSize: "0.6rem",
                            appearance: "none", textAlign: "center", padding: 0,
                        }}
                    >
                        <option value="" disabled>…</option>
                        <option value="vacant">Vacant</option>
                        <option value="occupied">Occupied</option>
                        <option value="maintenance">Maintenance</option>
                    </select>

                    <Divider />
                </>
            )}

            {/* Align tools */}
            <TBtn title="Align Row" onClick={onAlignRow} disabled={selectionCount < 2}>
                <AlignHorizontalDistributeCenter size={14} />
            </TBtn>
            <TBtn title="Distribute Evenly" onClick={onDistribute} disabled={selectionCount < 2}>
                <AlignVerticalDistributeCenter size={14} />
            </TBtn>
            <TBtn title="Center Vertically" onClick={onCenterVertical} disabled={selectionCount < 2}>
                <AlignCenterHorizontal size={14} />
            </TBtn>

            <Divider />

            {/* Search */}
            <TBtn title="Search (Ctrl+F)" onClick={onOpenSearch}><Search size={15} /></TBtn>
            <TBtn title="Saved Views" onClick={onOpenSavedViews}><Layers size={15} /></TBtn>

            <Divider />

            {/* Corridor paint */}
            <TBtn
                title={corridorPaintMode ? "Exit Corridor Paint" : "Paint Corridors"}
                onClick={onToggleCorridorPaint}
                active={corridorPaintMode}
            >
                <Paintbrush size={15} />
            </TBtn>

            {/* Floor selector */}
            <select
                title="Select Floor"
                value={activeFloor}
                onChange={(e) => onFloorChange(Number(e.target.value))}
                style={{
                    height: 32,
                    padding: "0 8px",
                    background: "rgba(15, 23, 42, 0.85)",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    color: "#e2e8f0",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    appearance: "none",
                }}
            >
                {floors.map((floor) => (
                    <option key={floor} value={floor}>Floor {floor}</option>
                ))}
            </select>
        </div>
    );
}
