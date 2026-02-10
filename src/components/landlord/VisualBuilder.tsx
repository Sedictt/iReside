"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragStartEvent, DragMoveEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';

import { User, Plus, ArrowUpFromLine, Trash2, X, Save, Pencil, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';

// QoL feature imports
import { useUndoRedo } from './visual-builder/useUndoRedo';
import { usePersistedViewport } from './visual-builder/usePersistedViewport';
import MiniMap from './visual-builder/MiniMap';
import BuilderToolbar from './visual-builder/BuilderToolbar';
import CanvasSearch from './visual-builder/CanvasSearch';
import SavedViews, { type SavedView } from './visual-builder/SavedViews';

type UnitType = 'studio' | '1br' | '2br' | 'stairs';

interface Unit {
    id: string;
    type: UnitType;
    gridX: number;
    gridY: number;
    status: 'occupied' | 'vacant' | 'maintenance' | 'neardue';
    tenantName?: string;
    tenantIsPrivate?: boolean;
    tenantAvatarUrl?: string;
    unitNumber?: string;
    rentAmount?: number;
}

type InitialUnit = {
    id: string;
    unit_type: string;
    grid_x: number;
    grid_y: number;
    status: string;
    unit_number?: string | null;
    rent_amount?: number | null;
    tenant_name?: string | null;
    tenant_is_private?: boolean | null;
    tenant_avatar_url?: string | null;
};

type GhostState = { x: number; y: number; widthCells: number; valid: boolean };

// Config
const GRID_CELL_SIZE = 40;
const FLOOR_HEIGHT_CELLS = 4;
const UNIT_HEIGHT = FLOOR_HEIGHT_CELLS * GRID_CELL_SIZE;

const unitConfig: Record<UnitType, { cells: number; label: string }> = {
    studio: { cells: 4, label: 'Studio' },
    '1br': { cells: 5, label: '1 Bedroom' },
    '2br': { cells: 7, label: '2 Bedroom' },
    'stairs': { cells: 2, label: 'Stairs' }
};

import { createClient } from '@/utils/supabase/client';

function mapDbStatusToUi(status: string): Unit['status'] {
    if (status === 'available') return 'vacant';
    if (status === 'vacant') return 'vacant';
    if (status === 'occupied' || status === 'maintenance' || status === 'neardue') return status;
    return 'vacant';
}

export default function VisualBuilder({
    propertyId,
    initialUnits = [],
    readOnly = false,
    isFullScreen = false,
    onToggleFullScreen,
    selectedUnitId = null,
    onUnitClick,
    onUnitMessageClick,
    currentUserUnitId = null,
    currentUserInitials,
    currentUserAvatarUrl
}: {
    propertyId: string;
    initialUnits?: InitialUnit[];
    readOnly?: boolean;
    isFullScreen?: boolean;
    onToggleFullScreen?: () => void;
    selectedUnitId?: string | null;
    onUnitClick?: (unitId: string) => void;
    onUnitMessageClick?: (unitId: string) => void;
    currentUserUnitId?: string | null;
    currentUserInitials?: string;
    currentUserAvatarUrl?: string | null;
}) {
    const mapInitialUnits = (items: InitialUnit[]) => items.map((u) => ({
        id: u.id,
        type: u.unit_type as UnitType,
        gridX: u.grid_x,
        gridY: u.grid_y,
        status: mapDbStatusToUi(u.status),
        unitNumber: u.unit_number ?? undefined,
        rentAmount: u.rent_amount ?? undefined,
        tenantName: u.tenant_name ?? undefined,
        tenantIsPrivate: u.tenant_is_private ?? undefined,
        tenantAvatarUrl: u.tenant_avatar_url ?? undefined
    }));

    const [units, setUnits] = useState<Unit[]>(mapInitialUnits(initialUnits));
    const supabase = createClient();

    // Edit State
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [editForm, setEditForm] = useState<{
        unitNumber: string;
        rentAmount: string;
        status: string;
        type: UnitType;
    }>({ unitNumber: '', rentAmount: '', status: 'vacant', type: 'studio' });
    const [isSaving, setIsSaving] = useState(false);

    // Drag State
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<UnitType | null>(null);
    const [isDraggingExistingUnit, setIsDraggingExistingUnit] = useState(false); // New state to track if an existing unit is being dragged
    const [ghostState, setGhostState] = useState<GhostState | null>(null);

    // Viewport State
    const [zoom, setZoom] = useState(1);
    const viewportRef = useRef<HTMLDivElement>(null);

    // ═══ QoL: Multi-select ═══
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // ═══ QoL: Grid & Snap ═══
    const [showGrid, setShowGrid] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(true);

    // ═══ QoL: Undo / Redo ═══
    const undoRedo = useUndoRedo<Unit[]>();

    // ═══ QoL: Search & Saved Views ═══
    const [searchOpen, setSearchOpen] = useState(false);
    const [savedViewsOpen, setSavedViewsOpen] = useState(false);
    const [highlightedUnitId, setHighlightedUnitId] = useState<string | null>(null);

    // ═══ QoL: HUD visibility ═══
    const [hudVisible, setHudVisible] = useState(true);

    // ═══ QoL: Persisted viewport ═══
    usePersistedViewport(propertyId, viewportRef, zoom, setZoom);

    // Track mouse constantly for projection maths
    const mousePos = useRef({ x: 0, y: 0 });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    useEffect(() => {
        const onMove = (e: MouseEvent) => { mousePos.current = { x: e.clientX, y: e.clientY }; };
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, []);

    // Zoom Handler
    useEffect(() => {
        const container = viewportRef.current;
        if (!container) return;
        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                setZoom(z => Math.min(Math.max(0.4, z - e.deltaY * 0.001), 3));
            }
        };
        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, []);

    // Hydration check
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        if (!readOnly) return;
        setUnits(mapInitialUnits(initialUnits));
    }, [initialUnits, readOnly]);

    // ═══════════════════════════
    //  QoL HELPER FUNCTIONS
    // ═══════════════════════════

    /** Push current state to undo stack before every mutation */
    const pushUndo = useCallback(() => {
        undoRedo.push(JSON.parse(JSON.stringify(units)));
    }, [units, undoRedo]);

    /** Zoom helpers */
    const handleZoomIn = useCallback(() => setZoom(z => Math.min(3, z + 0.15)), []);
    const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.4, z - 0.15)), []);
    const handleZoomReset = useCallback(() => setZoom(1), []);
    const handleFitToView = useCallback(() => {
        if (units.length === 0 || !viewportRef.current) return;
        const vp = viewportRef.current;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const u of units) {
            const cfg = unitConfig[u.type];
            const px = u.gridX * GRID_CELL_SIZE;
            const py = (10 - u.gridY) * UNIT_HEIGHT;
            minX = Math.min(minX, px);
            maxX = Math.max(maxX, px + cfg.cells * GRID_CELL_SIZE);
            minY = Math.min(minY, py);
            maxY = Math.max(maxY, py + UNIT_HEIGHT);
        }
        const contentW = maxX - minX + 120;
        const contentH = maxY - minY + 120;
        const newZoom = Math.min(vp.clientWidth / contentW, vp.clientHeight / contentH, 2);
        setZoom(Math.max(0.4, newZoom));
        requestAnimationFrame(() => {
            vp.scrollLeft = (minX - 60) * newZoom;
            vp.scrollTop = (minY - 60) * newZoom;
        });
    }, [units]);

    /** Undo */
    const handleUndo = useCallback(() => {
        const prev = undoRedo.undo();
        if (prev) setUnits(prev);
    }, [undoRedo]);

    /** Redo */
    const handleRedo = useCallback(() => {
        const next = undoRedo.redo();
        if (next) setUnits(next);
    }, [undoRedo]);

    /** Multi-select toggle (Shift+Click handled in CanvasContent) */
    const toggleSelect = useCallback((unitId: string, additive: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(additive ? prev : []);
            if (next.has(unitId)) next.delete(unitId);
            else next.add(unitId);
            return next;
        });
    }, []);
    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    /** Bulk delete */
    const handleBulkDelete = useCallback(async () => {
        if (selectedIds.size === 0) return;
        pushUndo();
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await supabase.from('units').delete().eq('id', id);
        }
        setUnits(prev => prev.filter(u => !selectedIds.has(u.id)));
        clearSelection();
    }, [selectedIds, pushUndo, supabase, clearSelection]);

    /** Bulk status change */
    const handleBulkStatus = useCallback(async (status: string) => {
        if (selectedIds.size === 0) return;
        pushUndo();
        const dbStatus = status === 'vacant' ? 'available' : status;
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await supabase.from('units').update({ status: dbStatus }).eq('id', id);
        }
        setUnits(prev => prev.map(u =>
            selectedIds.has(u.id)
                ? { ...u, status: mapDbStatusToUi(status) }
                : u
        ));
        clearSelection();
    }, [selectedIds, pushUndo, supabase, clearSelection]);

    /** Duplicate selected units with offset */
    const handleDuplicate = useCallback(async () => {
        if (selectedIds.size === 0) return;
        pushUndo();
        const toDup = units.filter(u => selectedIds.has(u.id));
        const newUnits: Unit[] = [];
        for (const u of toDup) {
            const offsetX = u.gridX + unitConfig[u.type].cells + 1;
            const unitNumber = `${u.gridY}${Math.floor(offsetX / 2) + 10}`;
            const { data } = await supabase
                .from('units')
                .insert([{
                    property_id: propertyId,
                    unit_type: u.type,
                    grid_x: offsetX,
                    grid_y: u.gridY,
                    unit_number: unitNumber,
                    rent_amount: u.rentAmount ?? null,
                    status: 'available',
                }])
                .select();
            if (data?.[0]) {
                const n = data[0];
                newUnits.push({
                    id: n.id,
                    type: n.unit_type as UnitType,
                    gridX: n.grid_x,
                    gridY: n.grid_y,
                    status: 'vacant',
                    unitNumber: n.unit_number,
                    rentAmount: n.rent_amount ?? undefined,
                });
            }
        }
        setUnits(prev => [...prev, ...newUnits]);
        clearSelection();
    }, [selectedIds, units, pushUndo, supabase, propertyId, clearSelection]);

    /** Align selected units to same row (most common gridY) */
    const handleAlignRow = useCallback(async () => {
        if (selectedIds.size < 2) return;
        pushUndo();
        const sel = units.filter(u => selectedIds.has(u.id));
        // Find most common gridY
        const freq: Record<number, number> = {};
        for (const u of sel) freq[u.gridY] = (freq[u.gridY] || 0) + 1;
        const targetY = Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
        for (const u of sel) {
            if (u.gridY !== targetY) {
                await supabase.from('units').update({ grid_y: targetY }).eq('id', u.id);
            }
        }
        setUnits(prev => prev.map(u =>
            selectedIds.has(u.id) ? { ...u, gridY: targetY } : u
        ));
    }, [selectedIds, units, pushUndo, supabase]);

    /** Distribute selected units evenly along X */
    const handleDistribute = useCallback(async () => {
        if (selectedIds.size < 2) return;
        pushUndo();
        const sel = units.filter(u => selectedIds.has(u.id)).sort((a, b) => a.gridX - b.gridX);
        const startX = sel[0].gridX;
        const endX = sel[sel.length - 1].gridX;
        const gap = sel.length > 1 ? (endX - startX) / (sel.length - 1) : 0;
        for (let i = 0; i < sel.length; i++) {
            const newX = Math.round(startX + i * gap);
            if (sel[i].gridX !== newX) {
                await supabase.from('units').update({ grid_x: newX }).eq('id', sel[i].id);
            }
            sel[i] = { ...sel[i], gridX: newX };
        }
        const updatedMap = new Map(sel.map(u => [u.id, u.gridX]));
        setUnits(prev => prev.map(u =>
            updatedMap.has(u.id) ? { ...u, gridX: updatedMap.get(u.id)! } : u
        ));
    }, [selectedIds, units, pushUndo, supabase]);

    /** Center selected units vertically to median floor */
    const handleCenterVertical = useCallback(async () => {
        if (selectedIds.size < 2) return;
        pushUndo();
        const sel = units.filter(u => selectedIds.has(u.id));
        const floors = sel.map(u => u.gridY).sort((a, b) => a - b);
        const median = floors[Math.floor(floors.length / 2)];
        for (const u of sel) {
            if (u.gridY !== median) {
                await supabase.from('units').update({ grid_y: median }).eq('id', u.id);
            }
        }
        setUnits(prev => prev.map(u =>
            selectedIds.has(u.id) ? { ...u, gridY: median } : u
        ));
    }, [selectedIds, units, pushUndo, supabase]);

    /** Pan-to for search highlight */
    const handlePanTo = useCallback((gridX: number, gridY: number) => {
        const vp = viewportRef.current;
        if (!vp) return;
        const px = gridX * GRID_CELL_SIZE * zoom;
        const py = (10 - gridY) * UNIT_HEIGHT * zoom;
        vp.scrollLeft = px - vp.clientWidth / 2;
        vp.scrollTop = py - vp.clientHeight / 2;
        // Clear highlight after 3 seconds
        setTimeout(() => setHighlightedUnitId(null), 3000);
    }, [zoom]);

    /** Restore saved view */
    const handleRestoreView = useCallback((view: SavedView) => {
        setZoom(view.zoom);
        requestAnimationFrame(() => {
            const vp = viewportRef.current;
            if (vp) {
                vp.scrollLeft = view.scrollX;
                vp.scrollTop = view.scrollY;
            }
        });
    }, []);

    // ═══ Keyboard Shortcuts ═══
    useEffect(() => {
        if (readOnly) return;
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

            // Z → Zoom In
            if (e.key === 'z' && !e.ctrlKey && !e.metaKey) { handleZoomIn(); return; }
            // X → Zoom Out
            if (e.key === 'x' && !e.ctrlKey && !e.metaKey) { handleZoomOut(); return; }
            // F → Fit to View
            if (e.key === 'f' && !e.ctrlKey && !e.metaKey) { handleFitToView(); return; }
            // H → Toggle HUD
            if (e.key === 'h') { setHudVisible(p => !p); return; }
            // G → Toggle grid
            if (e.key === 'g') { setShowGrid(p => !p); return; }
            // S → Toggle snap
            if (e.key === 's' && !e.ctrlKey && !e.metaKey) { setSnapToGrid(p => !p); return; }
            // Delete / Backspace → Delete selected
            if (e.key === 'Delete' || e.key === 'Backspace') { handleBulkDelete(); return; }
            // Ctrl+Z → Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); return; }
            // Ctrl+Shift+Z or Ctrl+Y → Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); return; }
            // Ctrl+F → Search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setSearchOpen(true); return; }
            // Ctrl+D → Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); handleDuplicate(); return; }
            // Ctrl+A → Select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); setSelectedIds(new Set(units.map(u => u.id))); return; }
            // Escape → Clear selection / close search
            if (e.key === 'Escape') { clearSelection(); setSearchOpen(false); setSavedViewsOpen(false); return; }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [readOnly, handleZoomIn, handleZoomOut, handleFitToView, handleBulkDelete, handleUndo, handleRedo, handleDuplicate, units, clearSelection]);

    // --- Drag Logic ---

    const handleDragStart = (event: DragStartEvent) => {
        if (readOnly) return;
        const { active } = event;
        setActiveId(active.id as string);

        let type = active.data.current?.type;
        const isPreset = active.data.current?.isPreset;

        // Fallback 1: Check if it's an existing unit on canvas
        if (!type) {
            type = units.find(u => u.id === active.id)?.type;
        }

        // Fallback 2: Parse from ID (e.g., 'preset-studio')
        if (!type && (active.id as string).startsWith('preset-')) {
            type = (active.id as string).replace('preset-', '');
        }

        setActiveType(type as UnitType);
        setIsDraggingExistingUnit(!isPreset); // Set this based on whether it's a preset or existing unit
    };

    const handleDragMove = (event: DragMoveEvent) => {
        if (readOnly) return;
        const { active } = event;
        if (!activeType || !viewportRef.current) return;

        // PROJECT MOUSE TO GRID COORDS
        const rect = viewportRef.current.getBoundingClientRect();
        const scrollLeft = viewportRef.current.scrollLeft;
        const scrollTop = viewportRef.current.scrollTop;

        // Mouse relative to viewport content (0,0 of World)
        // WorldX = (MouseX - RectLeft + ScrollLeft) / Zoom
        const worldX = (mousePos.current.x - rect.left + scrollLeft) / zoom;
        const worldY = (mousePos.current.y - rect.top + scrollTop) / zoom;

        // Convert to Grid
        const gridRows = 10; // Assuming fixed height for now
        // Y is inverted: Bottom is 0 (or 1)
        // WorldY = (TotalRows - GridY) * UnitHeight
        // GridY = TotalRows - (WorldY / UnitHeight)

        let targetGridX = Math.floor(worldX / GRID_CELL_SIZE);
        let targetGridY = Math.floor((gridRows * UNIT_HEIGHT - worldY) / UNIT_HEIGHT) + 1; // +1 to floor adjustment

        // Corrections for drag offset? 
        // Ideally we want the mouse to hold the center of the unit.
        // Let's assume the user grabs center. gridX should center around mouse.
        const widthCells = unitConfig[activeType].cells;
        targetGridX -= Math.floor(widthCells / 2);

        // Clamp
        if (targetGridX < 0) targetGridX = 0;
        if (targetGridY < 1) targetGridY = 1;
        if (targetGridY > 10) targetGridY = 10;

        // Check Collision
        const isOccupied = units.some(u => {
            if (u.id === active.id) return false; // Ignore self
            if (u.gridY !== targetGridY) return false;
            const uCells = unitConfig[u.type].cells;
            return targetGridX < u.gridX + uCells && targetGridX + widthCells > u.gridX;
        });

        setGhostState({
            x: targetGridX,
            y: targetGridY,
            widthCells,
            valid: !isOccupied
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        if (readOnly) return;
        const { active, over } = event;
        setActiveId(null);
        setActiveType(null);
        setIsDraggingExistingUnit(false); // Reset
        const finalGhost = ghostState;
        setGhostState(null);

        if (!finalGhost || !finalGhost.valid || !over) return;

        pushUndo(); // ← Save state before any mutation

        // DELETE ACTION
        if (over.id === 'trash-zone' && !active.data.current?.isPreset) {
            const { error } = await supabase
                .from('units')
                .delete()
                .eq('id', active.id);

            if (!error) {
                setUnits(prev => prev.filter(u => u.id !== active.id));
            }
            return;
        }

        if (active.data.current?.isPreset) {
            // SAVE TO SUPABASE
            const unitType = activeType as UnitType;
            const unitNumber = `${finalGhost.y}${Math.floor(finalGhost.x / 2) + 10}`; // Simple generator

            const { data, error } = await supabase
                .from('units')
                .insert([{
                    property_id: propertyId,
                    unit_type: unitType,
                    grid_x: finalGhost.x,
                    grid_y: finalGhost.y,
                    unit_number: unitNumber,
                    rent_amount: unitType === 'studio' ? 1200 : unitType === '1br' ? 1800 : 2500,
                    status: 'available'
                }])
                .select();

            if (data) {
                const newUnit = data[0];
                setUnits(prev => [...prev, {
                    id: newUnit.id,
                    type: newUnit.unit_type as UnitType,
                    gridX: newUnit.grid_x,
                    gridY: newUnit.grid_y,
                    status: 'vacant',
                    unitNumber: newUnit.unit_number
                }]);
            }
        } else {
            // UPDATE IN SUPABASE
            const { error } = await supabase
                .from('units')
                .update({
                    grid_x: finalGhost.x,
                    grid_y: finalGhost.y
                })
                .eq('id', active.id);

            if (!error) {
                setUnits(prev => prev.map(u =>
                    u.id === active.id
                        ? { ...u, gridX: finalGhost.x, gridY: finalGhost.y }
                        : u
                ));
            }
        }
    };

    const handleUnitEdit = (unitId: string) => {
        if (readOnly) return;
        const unit = units.find(u => u.id === unitId);
        if (!unit || unit.type === 'stairs') return;
        setEditingUnit(unit);
        setEditForm({
            unitNumber: unit.unitNumber || '',
            rentAmount: unit.rentAmount?.toString() || '',
            status: unit.status,
            type: unit.type,
        });
    };

    const handleEditSave = async () => {
        if (!editingUnit) return;
        setIsSaving(true);
        pushUndo();

        const dbStatus = editForm.status === 'vacant' ? 'available' : editForm.status;

        const { error } = await supabase
            .from('units')
            .update({
                unit_number: editForm.unitNumber || null,
                rent_amount: editForm.rentAmount ? parseFloat(editForm.rentAmount) : null,
                status: dbStatus,
                unit_type: editForm.type,
            })
            .eq('id', editingUnit.id);

        if (!error) {
            setUnits(prev => prev.map(u =>
                u.id === editingUnit.id
                    ? {
                        ...u,
                        unitNumber: editForm.unitNumber || undefined,
                        rentAmount: editForm.rentAmount ? parseFloat(editForm.rentAmount) : undefined,
                        status: editForm.status as Unit['status'],
                        type: editForm.type,
                    }
                    : u
            ));
            setEditingUnit(null);
        }
        setIsSaving(false);
    };

    const handleEditDelete = async () => {
        if (!editingUnit) return;
        setIsSaving(true);
        pushUndo();
        const { error } = await supabase
            .from('units')
            .delete()
            .eq('id', editingUnit.id);
        if (!error) {
            setUnits(prev => prev.filter(u => u.id !== editingUnit.id));
            setEditingUnit(null);
        }
        setIsSaving(false);
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={readOnly ? undefined : handleDragStart}
            onDragMove={readOnly ? undefined : handleDragMove}
            onDragEnd={readOnly ? undefined : handleDragEnd}
        >
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#334155', position: 'relative' }}>

                {/* Viewport with Native Scroll */}
                <div
                    ref={viewportRef}
                    style={{
                        flex: 1,
                        position: 'relative',
                        overflow: 'auto',
                        background: '#0f172a',
                    }}
                >
                    {/* World Container */}
                    <div style={{
                        width: `${3000 * zoom}px`, // Large scrolling area
                        height: `${2000 * zoom}px`,
                        transform: `scale(${zoom})`,
                        transformOrigin: '0 0',
                        position: 'relative',
                    }}>
                        {/* ═══ QoL: Grid Overlay ═══ */}
                        {showGrid && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`,
                                backgroundImage: 'linear-gradient(to right, rgba(71, 85, 105, 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(71, 85, 105, 0.18) 1px, transparent 1px)',
                                pointerEvents: 'none',
                                zIndex: 1,
                            }} />
                        )}

                        <CanvasContent
                            units={units}
                            ghost={ghostState}
                            activeId={activeId}
                            readOnly={readOnly}
                            selectedUnitId={editingUnit?.id ?? selectedUnitId}
                            onUnitClick={readOnly ? onUnitClick : handleUnitEdit}
                            onUnitMessageClick={onUnitMessageClick}
                            currentUserUnitId={currentUserUnitId}
                            currentUserInitials={currentUserInitials}
                            currentUserAvatarUrl={currentUserAvatarUrl}
                            selectedIds={selectedIds}
                            onToggleSelect={toggleSelect}
                            highlightedUnitId={highlightedUnitId}
                        />

                        {/* Floor Labels */}
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} style={{ position: 'absolute', left: 10, top: (10 - i - 1) * UNIT_HEIGHT + UNIT_HEIGHT / 2, color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: '3rem', pointerEvents: 'none' }}>
                                {i + 1}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ═══ QoL: HUD Toggle Button (always visible) ═══ */}
                <button
                    type="button"
                    onClick={() => setHudVisible(p => !p)}
                    title={hudVisible ? 'Hide HUD (H)' : 'Show HUD (H)'}
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: hudVisible ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        color: hudVisible ? '#e2e8f0' : '#64748b',
                        cursor: 'pointer',
                        zIndex: 95,
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.2s',
                    }}
                >
                    {hudVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>

                {/* ═══ QoL: Mini-Map ═══ */}
                {hudVisible && (
                    <MiniMap
                        units={units}
                        viewportRef={viewportRef}
                        zoom={zoom}
                    />
                )}

                {/* ═══ QoL: Builder Toolbar (edit mode only) ═══ */}
                {hudVisible && !readOnly && (
                    <BuilderToolbar
                        zoom={zoom}
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        onZoomReset={handleZoomReset}
                        onFitToView={handleFitToView}
                        showGrid={showGrid}
                        onToggleGrid={() => setShowGrid(p => !p)}
                        snapToGrid={snapToGrid}
                        onToggleSnap={() => setSnapToGrid(p => !p)}
                        canUndo={undoRedo.canUndo}
                        canRedo={undoRedo.canRedo}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        selectionCount={selectedIds.size}
                        onBulkDelete={handleBulkDelete}
                        onBulkStatus={handleBulkStatus}
                        onDuplicate={handleDuplicate}
                        onAlignRow={handleAlignRow}
                        onDistribute={handleDistribute}
                        onCenterVertical={handleCenterVertical}
                        onOpenSearch={() => setSearchOpen(true)}
                        onOpenSavedViews={() => setSavedViewsOpen(p => !p)}
                    />
                )}

                {/* ═══ QoL: Canvas Search ═══ */}
                {hudVisible && <CanvasSearch
                    units={units}
                    open={searchOpen}
                    onClose={() => setSearchOpen(false)}
                    onHighlight={setHighlightedUnitId}
                    onPanTo={handlePanTo}
                />

                }

                {/* ═══ QoL: Saved Views ═══ */}
                {hudVisible && <SavedViews
                    propertyId={propertyId}
                    open={savedViewsOpen}
                    onClose={() => setSavedViewsOpen(false)}
                    currentZoom={zoom}
                    viewportRef={viewportRef}
                    onRestoreView={handleRestoreView}
                />}

                {/* Float Controls */}
                {hudVisible && <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', right: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 60, pointerEvents: 'none' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* Legend */}
                        <div style={{
                            padding: '0.6rem 0.9rem',
                            background: 'rgba(15, 23, 42, 0.85)',
                            borderRadius: '10px',
                            border: '1px solid #334155',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'center',
                            flexWrap: 'wrap'
                        }}>
                            <span style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(to bottom, #0f172a, #020617)', border: '1px solid #334155' }} />
                                <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Vacant</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(to bottom, #451a03, #1e293b)', border: '1px solid #92400e' }} />
                                <span style={{ color: '#fbbf24', fontSize: '0.7rem' }}>Occupied</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b', border: '1px solid #b45309' }} />
                                <span style={{ color: '#fbbf24', fontSize: '0.7rem' }}>Maintenance</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#1e293b', border: '1px solid #ef4444', boxShadow: '0 0 4px rgba(239, 68, 68, 0.4)' }} />
                                <span style={{ color: '#fca5a5', fontSize: '0.7rem' }}>Near Due</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(to right, #334155, #475569)', border: '1px solid #475569' }} />
                                <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Stairs</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', pointerEvents: 'auto' }}>
                            <div style={{ padding: '0.5rem 1rem', background: 'rgba(30, 41, 59, 0.8)', color: 'white', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid #475569' }}>
                                Ctrl + Scroll to Zoom • Scroll to Pan
                            </div>
                            <div style={{ padding: '0.5rem 1rem', background: '#1e293b', border: '1px solid #475569', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}>
                                {Math.round(zoom * 100)}%
                            </div>
                            {onToggleFullScreen && (
                                <button
                                    type="button"
                                    onClick={onToggleFullScreen}
                                    aria-pressed={isFullScreen}
                                    title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        background: '#1e293b',
                                        border: '1px solid #475569',
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        cursor: 'pointer',
                                        pointerEvents: 'auto'
                                    }}
                                >
                                    {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                    <span style={{ fontSize: '0.8rem' }}>Full Screen</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>}

                {!readOnly && (
                    <>
                        {/* Sidebar */}
                        <aside style={{ width: '280px', background: '#1e293b', borderLeft: '1px solid #475569', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
                            {editingUnit ? (
                                /* EDIT PANEL */
                                <>
                                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Pencil size={16} color="#818cf8" />
                                            <h2 style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>Edit Unit</h2>
                                        </div>
                                        <button
                                            onClick={() => setEditingUnit(null)}
                                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
                                        {/* Unit Type */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit Type</label>
                                            <select
                                                value={editForm.type}
                                                onChange={e => setEditForm(f => ({ ...f, type: e.target.value as UnitType }))}
                                                style={{ padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: '0.85rem', outline: 'none' }}
                                            >
                                                <option value="studio">Studio</option>
                                                <option value="1br">1 Bedroom</option>
                                                <option value="2br">2 Bedroom</option>
                                            </select>
                                        </div>

                                        {/* Unit Number */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit Number</label>
                                            <input
                                                type="text"
                                                value={editForm.unitNumber}
                                                onChange={e => setEditForm(f => ({ ...f, unitNumber: e.target.value }))}
                                                placeholder="e.g. 101"
                                                style={{ padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: '0.85rem', outline: 'none' }}
                                            />
                                        </div>

                                        {/* Rent Amount */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rent Amount (₱)</label>
                                            <input
                                                type="number"
                                                value={editForm.rentAmount}
                                                onChange={e => setEditForm(f => ({ ...f, rentAmount: e.target.value }))}
                                                placeholder="e.g. 1500"
                                                style={{ padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: '0.85rem', outline: 'none' }}
                                            />
                                        </div>

                                        {/* Status */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                                            <select
                                                value={editForm.status}
                                                onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                                                style={{ padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: '0.85rem', outline: 'none' }}
                                            >
                                                <option value="vacant">Vacant</option>
                                                <option value="occupied">Occupied</option>
                                                <option value="maintenance">Maintenance</option>
                                            </select>
                                        </div>

                                        {/* Grid Position (read-only info) */}
                                        <div style={{ padding: '0.75rem', background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                                            <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Position</div>
                                            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Floor {editingUnit.gridY} &bull; Column {editingUnit.gridX}</div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <button
                                            onClick={handleEditSave}
                                            disabled={isSaving}
                                            style={{
                                                padding: '0.7rem', background: '#6366f1', color: 'white', border: 'none',
                                                borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                opacity: isSaving ? 0.6 : 1
                                            }}
                                        >
                                            <Save size={16} />
                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                            onClick={handleEditDelete}
                                            disabled={isSaving}
                                            style={{
                                                padding: '0.7rem', background: 'transparent', color: '#f87171', border: '1px solid #7f1d1d',
                                                borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                opacity: isSaving ? 0.6 : 1
                                            }}
                                        >
                                            <Trash2 size={14} />
                                            Delete Unit
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* CONSTRUCTION KIT (original sidebar) */
                                <>
                                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155' }}>
                                        <h2 style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Construction Kit</h2>
                                        <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Drag rooms onto the property. Click a unit to edit it.</p>
                                    </div>
                                    <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                                        <SidebarUnit type="studio" label="Studio Apt" icon={<User size={16} />} />
                                        <SidebarUnit type="1br" label="1 Bedroom" icon={<User size={16} />} />
                                        <SidebarUnit type="2br" label="2 Bedroom" icon={<User size={16} />} />
                                        <SidebarUnit type="stairs" label="Stairwell" icon={<ArrowUpFromLine size={16} />} />
                                    </div>
                                </>
                            )}
                        </aside>

                        <AnimatePresence>
                            {isDraggingExistingUnit && (
                                <TrashZone />
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>

            {/* DRAG OVERLAY - Follows Mouse (Screen Space) */}
            {!readOnly && mounted && createPortal(
                <DragOverlay dropAnimation={null} zIndex={9999}>
                    {activeType ? (
                        <div style={{
                            width: unitConfig[activeType].cells * GRID_CELL_SIZE * zoom, // Match zoom visual
                            height: UNIT_HEIGHT * zoom,
                            background: '#6366f1',
                            opacity: 0.8,
                            borderRadius: '4px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold',
                            transformOrigin: 'top left',
                        }}>
                            {unitConfig[activeType].label}
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}

        </DndContext>
    );
}

function CanvasContent({
    units,
    ghost,
    activeId,
    readOnly,
    selectedUnitId,
    onUnitClick,
    onUnitMessageClick,
    currentUserUnitId,
    currentUserInitials,
    currentUserAvatarUrl,
    selectedIds,
    onToggleSelect,
    highlightedUnitId,
}: {
    units: Unit[];
    ghost: GhostState | null;
    activeId: string | null;
    readOnly: boolean;
    selectedUnitId: string | null;
    onUnitClick?: (unitId: string) => void;
    onUnitMessageClick?: (unitId: string) => void;
    currentUserUnitId?: string | null;
    currentUserInitials?: string;
    currentUserAvatarUrl?: string | null;
    selectedIds?: Set<string>;
    onToggleSelect?: (unitId: string, additive: boolean) => void;
    highlightedUnitId?: string | null;
}) {
    // ... (inside DraggableUnit function later in file)
    const { setNodeRef } = useDroppable({ id: 'canvas-droppable' });
    const GRID_ROWS = 10;

    return (
        <div ref={setNodeRef} style={{ width: '100%', height: '100%', position: 'relative' }}>

            {/* GHOST PREVIEW */}
            {ghost && (
                <div style={{
                    position: 'absolute',
                    left: ghost.x * GRID_CELL_SIZE,
                    top: (GRID_ROWS - ghost.y) * UNIT_HEIGHT,
                    width: ghost.widthCells * GRID_CELL_SIZE,
                    height: UNIT_HEIGHT,
                    background: ghost.valid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)', // Green or Red
                    border: ghost.valid ? '2px dashed #22c55e' : '2px dashed #ef4444',
                    borderRadius: '4px',
                    zIndex: 5,
                    transition: 'all 0.05s linear',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {ghost.valid ? (
                        <span style={{ color: '#22c55e', fontWeight: 'bold', textShadow: '0 1px 2px black' }}>PLACE HERE</span>
                    ) : (
                        <span style={{ color: '#ef4444', fontWeight: 'bold', textShadow: '0 1px 2px black' }}>OCCUPIED</span>
                    )}
                </div>
            )}

            {/* UNITS */}
            {units.map(unit => (
                <div key={unit.id} style={{ opacity: unit.id === activeId ? 0.3 : 1 }}> {/* Fade out original when dragging */}
                    <DraggableUnit
                        unit={unit}
                        totalRows={GRID_ROWS}
                        readOnly={readOnly}
                        isSelected={selectedUnitId === unit.id || (selectedIds?.has(unit.id) ?? false)}
                        isHighlighted={highlightedUnitId === unit.id}
                        onUnitClick={(id) => {
                            // Multi-select with Shift held
                            onUnitClick?.(id);
                        }}
                        onShiftClick={(id) => {
                            onToggleSelect?.(id, true);
                        }}
                        onUnitMessageClick={onUnitMessageClick}
                        currentUserUnitId={currentUserUnitId}
                        currentUserInitials={currentUserInitials}
                        currentUserAvatarUrl={currentUserAvatarUrl}
                    />
                </div>
            ))}
        </div>
    );
}



function TrashZone() {
    const { setNodeRef, isOver } = useDroppable({
        id: 'trash-zone',
    });

    return (
        <motion.div
            ref={setNodeRef}
            initial={{ opacity: 0, scale: 0.8, y: 50, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.8, y: 50, x: '-50%' }}
            style={{
                position: 'absolute',
                bottom: '4rem',
                left: '50%',
                zIndex: 100,
                width: 64, height: 64,
                background: isOver ? '#ef4444' : 'rgba(30, 41, 59, 0.9)',
                color: isOver ? 'white' : '#f87171',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: isOver ? '2px solid white' : '2px solid #ef4444',
                boxShadow: isOver ? '0 0 30px rgba(239, 68, 68, 0.6)' : '0 10px 25px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer'
            }}
        >
            <Trash2 size={28} />
        </motion.div>
    );
}

// ... SidebarUnit is mostly same ...
function SidebarUnit({ type, label, icon }: { type: UnitType, label: string, icon: React.ReactNode }) {
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: `preset-${type}`,
        data: { type, isPreset: true }
    });
    return (
        <div ref={setNodeRef} {...listeners} {...attributes} style={{
            padding: '1rem', background: '#334155', borderRadius: '8px', cursor: 'grab',
            border: '1px solid #475569', display: 'flex', alignItems: 'center', gap: '1rem',
            marginBottom: '1rem'
        }}>
            <div style={{ width: 32, height: 32, background: '#1e293b', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>{icon}</div>
            <div><div style={{ color: '#f1f5f9', fontWeight: 600 }}>{label}</div></div>
            <Plus size={16} color="#64748b" style={{ marginLeft: 'auto' }} />
        </div>
    );
}

// ... (DraggableUnit props remain)
function DraggableUnit({
    unit,
    totalRows,
    readOnly,
    isSelected,
    isHighlighted,
    onUnitClick,
    onShiftClick,
    onUnitMessageClick,
    currentUserUnitId,
    currentUserInitials,
    currentUserAvatarUrl
}: {
    unit: Unit;
    totalRows: number;
    readOnly: boolean;
    isSelected: boolean;
    isHighlighted?: boolean;
    onUnitClick?: (unitId: string) => void;
    onShiftClick?: (unitId: string) => void;
    onUnitMessageClick?: (unitId: string) => void;
    currentUserUnitId?: string | null;
    currentUserInitials?: string;
    currentUserAvatarUrl?: string | null;
}) {
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: unit.id,
        data: { type: unit.type, isPreset: false }
    });

    // Pixel math
    const pixelX = unit.gridX * GRID_CELL_SIZE;
    const pixelY = (totalRows - unit.gridY) * UNIT_HEIGHT;
    const width = unitConfig[unit.type].cells * GRID_CELL_SIZE;

    // Styles
    const isStairs = unit.type === 'stairs';
    const isOccupied = unit.status === 'occupied';
    const isVacant = unit.status === 'vacant';

    // Theme Colors
    const bgGradient = isStairs
        ? 'linear-gradient(to right, #334155, #475569, #334155)' // Industrial metallic
        : isOccupied
            ? 'linear-gradient(to bottom, #451a03, #1e293b)' // Warm amber light from top, fading to dark
            : 'linear-gradient(to bottom, #0f172a, #020617)'; // Cold dark blue

    const lightCone = isOccupied ? (
        <div style={{
            position: 'absolute', top: 0, left: '20%', right: '20%', height: '80%',
            background: 'conic-gradient(from 180deg at 50% 0%, rgba(251, 191, 36, 0.15) -25deg, transparent 25deg)',
            pointerEvents: 'none', mixBlendMode: 'screen'
        }}></div>
    ) : null;

    const [isHovered, setIsHovered] = useState(false);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    const [preferredPlacement, setPreferredPlacement] = useState<'top' | 'bottom'>('top');
    const openTimeoutRef = useRef<number | null>(null);
    const closeTimeoutRef = useRef<number | null>(null);
    const { refs, x, y, strategy, update, placement } = useFloating({
        placement: preferredPlacement,
        strategy: 'fixed',
        middleware: [
            offset(12),
            flip({ padding: 8, fallbackPlacements: ['bottom', 'top', 'right', 'left'] }),
            shift({ padding: 8 }),
            size({
                padding: 8,
                apply({ availableWidth, availableHeight, elements }) {
                    Object.assign(elements.floating.style, {
                        width: `${Math.min(220, availableWidth)}px`,
                        maxWidth: `${availableWidth}px`,
                        maxHeight: `${availableHeight}px`
                    });
                }
            })
        ],
        whileElementsMounted: autoUpdate
    });

    const basePlacement = placement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';
    const showTooltip = readOnly && isTooltipVisible;
    const showHoverGlow = isHovered && readOnly;
    const showSelectGlow = isSelected;
    const showHighlight = !!isHighlighted;
    const glowVariant: 'selected' | 'hover' | 'highlighted' | null = showHighlight ? 'highlighted' : showSelectGlow ? 'selected' : showHoverGlow ? 'hover' : null;
    const tooltipTitle = unit.id === currentUserUnitId
        ? 'This is where you are'
        : unit.tenantName && unit.tenantName !== 'Resident'
            ? unit.tenantName
            : isVacant
                ? 'Vacant'
                : unit.tenantName || 'Resident';
    const tooltipSubtitle = unit.id === currentUserUnitId
        ? 'Your unit'
        : unit.tenantName && unit.tenantName !== 'Resident'
            ? 'Resident'
            : isVacant
                ? 'Available'
                : 'Resident';
    const canMessage = readOnly
        && unit.id !== currentUserUnitId
        && unit.type !== 'stairs'
        && !isVacant
        && unit.tenantName
        && unit.tenantName !== 'Resident'
        && !unit.tenantIsPrivate;
    const showAvatar = Boolean(!unit.tenantIsPrivate && unit.tenantName && unit.tenantName !== 'Resident');
    const tooltipInitials = (unit.tenantName || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');

    useEffect(() => {
        if (!isHovered) return;
        update();
    }, [isHovered, update, preferredPlacement]);

    useEffect(() => {
        return () => {
            if (openTimeoutRef.current) window.clearTimeout(openTimeoutRef.current);
            if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
        };
    }, []);

    const openTooltip = () => {
        if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        if (openTimeoutRef.current) {
            window.clearTimeout(openTimeoutRef.current);
            openTimeoutRef.current = null;
        }
        setPreferredPlacement(unit.gridY >= 9 ? 'bottom' : 'top');
        setIsHovered(true);
        openTimeoutRef.current = window.setTimeout(() => {
            setIsTooltipVisible(true);
            update();
        }, 140);
    };

    const scheduleClose = () => {
        if (openTimeoutRef.current) {
            window.clearTimeout(openTimeoutRef.current);
            openTimeoutRef.current = null;
        }
        if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current);
        }
        closeTimeoutRef.current = window.setTimeout(() => {
            setIsTooltipVisible(false);
            setIsHovered(false);
        }, 120);
    };

    return (
        <div
            ref={(node) => {
                setNodeRef(node);
                refs.setReference(node);
            }}
            style={{
                position: 'absolute',
                top: pixelY,
                left: pixelX,
                width,
                height: UNIT_HEIGHT,
                zIndex: isHovered ? 70 : isSelected ? 65 : 10,
                cursor: readOnly ? 'pointer' : 'grab',
                boxSizing: 'border-box',
                outline: 'none'
            }}
            onClick={(e) => {
                // Prevent click when drag was in progress (pointer moved > 5px)
                if (unit.type !== 'stairs') {
                    if (e.shiftKey && onShiftClick) {
                        onShiftClick(unit.id);
                    } else {
                        onUnitClick?.(unit.id);
                    }
                }
            }}
            onPointerEnter={openTooltip}
            onPointerLeave={scheduleClose}
            {...(readOnly ? {} : listeners)}
            {...(readOnly ? {} : attributes)}
        >
            {/* Edit indicator on hover (landlord mode only) */}
            {!readOnly && isHovered && unit.type !== 'stairs' && (
                <div style={{
                    position: 'absolute',
                    top: 4,
                    right: 8,
                    background: 'rgba(99, 102, 241, 0.85)',
                    color: 'white',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    zIndex: 80,
                    pointerEvents: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                    <Pencil size={10} />
                    CLICK TO EDIT
                </div>
            )}

            {/* Main Container */}
            <div style={{
                width: '100%', height: '100%',
                background: '#1e293b',
                position: 'relative', overflow: 'visible' // visible for popouts if needed
            }}>

                    {readOnly && unit.id === currentUserUnitId && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 42,
                            height: 42,
                            borderRadius: '50%',
                            background: '#6366f1',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: '2px solid rgba(15, 23, 42, 0.9)',
                            boxShadow: '0 6px 16px rgba(15, 23, 42, 0.45)',
                            overflow: 'hidden',
                            zIndex: 40
                        }}>
                            {currentUserAvatarUrl ? (
                                <img
                                    src={currentUserAvatarUrl}
                                    alt="Your profile"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <span>{currentUserInitials || 'ME'}</span>
                            )}
                        </div>
                    )}

                {/* Floor Slab (Structure) */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 8,
                    background: '#334155', borderTop: '1px solid #94a3b8', zIndex: 2
                }}></div>

                {/* Ceiling Slabs/Light Fixture */}
                {!isStairs && <div style={{
                    position: 'absolute', top: 0, left: '40%', width: '20%', height: 6,
                    background: '#334155', borderRadius: '0 0 4px 4px', zIndex: 2
                }}></div>}

                {/* Room Interior */}
                <div style={{
                    position: 'absolute', inset: '4px', bottom: '8px', // Insert inside walls
                    background: bgGradient,
                    border: '2px solid #334155',
                    borderTop: 'none',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    padding: '8px',
                    overflow: 'hidden'
                }}>
                    {!isStairs && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                opacity: isOccupied ? 0.9 : 0.65,
                                mixBlendMode: 'screen',
                                background:
                                    'radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.18) 0%, rgba(251, 191, 36, 0.06) 35%, rgba(251, 191, 36, 0) 70%),\
                                     radial-gradient(ellipse at 50% 100%, rgba(99, 102, 241, 0.10) 0%, rgba(99, 102, 241, 0) 60%)'
                            }}
                        />
                    )}
                    {glowVariant && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                boxShadow: glowVariant === 'highlighted'
                                    ? 'inset 0 0 0 2px rgba(34, 197, 94, 0.7)'
                                    : glowVariant === 'selected'
                                    ? 'inset 0 0 0 2px rgba(96, 165, 250, 0.55)'
                                    : 'inset 0 0 0 2px rgba(37, 99, 235, 0.38)',
                                opacity: glowVariant === 'selected' || glowVariant === 'highlighted' ? 1 : 0.95
                            }}
                        />
                    )}
                    {glowVariant && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                opacity: glowVariant === 'selected' || glowVariant === 'highlighted' ? 1 : 0.85,
                                mixBlendMode: 'screen',
                                background: glowVariant === 'highlighted'
                                    ? 'radial-gradient(circle at center, rgba(34, 197, 94, 0) 40%, rgba(34, 197, 94, 0.2) 70%, rgba(34, 197, 94, 0.4) 100%)'
                                    : glowVariant === 'selected'
                                    ? 'radial-gradient(circle at center, rgba(96, 165, 250, 0) 44%, rgba(96, 165, 250, 0.18) 72%, rgba(96, 165, 250, 0.32) 100%)'
                                    : 'radial-gradient(circle at center, rgba(37, 99, 235, 0) 46%, rgba(37, 99, 235, 0.14) 74%, rgba(37, 99, 235, 0.24) 100%)'
                            }}
                        />
                    )}
                    {/* Ambient Light */}
                    {lightCone}

                    {/* Back Window */}
                    {!isStairs && (
                        <div style={{
                            position: 'absolute', top: '20%', left: '15%', width: '25%', height: '40%',
                            background: isOccupied ? '#1e293b' : '#020617',
                            border: '2px solid #334155',
                            boxShadow: isOccupied ? '0 0 10px rgba(251, 191, 36, 0.1)' : 'none'
                        }}>
                            <div style={{ width: '100%', height: '50%', borderBottom: '1px solid #334155' }}></div>
                        </div>
                    )}

                    {/* Furniture Hint (Bed/Table) */}
                    {!isStairs && (
                        <div style={{
                            position: 'absolute', bottom: 2, right: 10, width: 40, height: 12,
                            background: '#1e293b', borderRadius: '2px 2px 0 0', border: '1px solid #334155'
                        }}></div>
                    )}

                    {/* Stairs Pattern */}
                    {isStairs && <div style={{ position: 'absolute', inset: 0, opacity: 0.3, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)' }}></div>}

                    {/* Top Label + Unit Number */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, zIndex: 10 }}>
                        <div style={{
                            background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4,
                            fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {unitConfig[unit.type].label.toUpperCase()}
                        </div>
                        {unit.unitNumber && (
                            <div style={{
                                background: 'rgba(99, 102, 241, 0.3)', padding: '2px 6px', borderRadius: 4,
                                fontSize: '0.65rem', color: '#c7d2fe', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.4)',
                                letterSpacing: '0.02em'
                            }}>
                                #{unit.unitNumber}
                            </div>
                        )}
                    </div>

                    {/* Tenant / Status / Maintenance */}
                    {!isStairs && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, zIndex: 10 }}>
                            {/* Maintenance Overlay (Full Box) */}
                            {unit.status === 'maintenance' && (
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'repeating-linear-gradient(45deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.2) 10px, transparent 10px, transparent 20px)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backdropFilter: 'grayscale(100%) blur(1px)' // Dim the room
                                }}>
                                    <div style={{ background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: 4, fontWeight: 'bold', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, transform: 'rotate(-5deg)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                                        <div style={{ width: 8, height: 8, background: 'black', borderRadius: '50%' }}></div>
                                        REPAIR
                                        <div style={{ width: 8, height: 8, background: 'black', borderRadius: '50%' }}></div>
                                    </div>
                                </div>
                            )}

                            {/* Near Due Overlay (Subtle Red Pulse) */}
                            {unit.status === 'neardue' && (
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    border: '1px solid #ef4444',
                                    boxShadow: 'inset 0 0 20px rgba(239, 68, 68, 0.2)',
                                    pointerEvents: 'none',
                                    animation: 'pulse-red 2s infinite'
                                }}>
                                    <div style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: 'white', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.7rem' }}>!</div>
                                </div>
                            )}

                            {/* Standard Statuses */}
                            {unit.status === 'occupied' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <User size={14} className="text-amber-400" />
                                    <span style={{ fontSize: '0.7rem', color: '#e2e8f0', textShadow: '0 1px 2px black' }}>{unit.tenantName}</span>
                                </div>
                            )}

                            {unit.status === 'vacant' && (
                                <span style={{ fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: 4 }}>FOR RENT</span>
                            )}

                            {/* Near Due Text */}
                            {unit.status === 'neardue' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <User size={14} color="#ef4444" />
                                    <span style={{ fontSize: '0.7rem', color: '#fca5a5', textShadow: '0 1px 2px black' }}>{unit.tenantName} (Late)</span>
                                </div>
                            )}
                        </div>
                    )}

                    {typeof document !== 'undefined' && createPortal(
                        <AnimatePresence>
                            {showTooltip && (
                                <motion.div
                                    ref={refs.setFloating}
                                    initial={{ opacity: 0, scale: 0.96, y: preferredPlacement === 'top' ? 6 : -6 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.94, y: preferredPlacement === 'top' ? 4 : -4 }}
                                    transition={{ duration: 0.14, ease: 'easeOut' }}
                                    style={{
                                        position: strategy,
                                        top: y ?? 0,
                                        left: x ?? 0,
                                        visibility: x == null || y == null ? 'hidden' : 'visible',
                                        background: '#0f172a',
                                        color: '#f8fafc',
                                        borderRadius: 16,
                                        border: '1px solid rgba(148, 163, 184, 0.25)',
                                        fontSize: '0.75rem',
                                        zIndex: 9999,
                                        boxShadow: '0 18px 35px rgba(0, 0, 0, 0.55)',
                                        pointerEvents: 'auto',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transformOrigin: basePlacement === 'top' ? 'bottom center' : basePlacement === 'bottom' ? 'top center' : basePlacement === 'left' ? 'center right' : 'center left'
                                    }}
                                    onPointerEnter={openTooltip}
                                    onPointerLeave={scheduleClose}
                                >
                                    {/* Caret pointing back to hovered unit */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            width: 12,
                                            height: 12,
                                            background: '#0f172a',
                                            border: '1px solid rgba(148, 163, 184, 0.25)',
                                            transform: 'rotate(45deg)',
                                            zIndex: -1,
                                            ...(basePlacement === 'top'
                                                ? { bottom: -6, left: '50%', marginLeft: -6 }
                                                : basePlacement === 'bottom'
                                                    ? { top: -6, left: '50%', marginLeft: -6 }
                                                    : basePlacement === 'left'
                                                        ? { right: -6, top: '50%', marginTop: -6 }
                                                        : { left: -6, top: '50%', marginTop: -6 })
                                        }}
                                    />
                                    <div style={{
                                        height: 46,
                                        background: 'linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%)'
                                    }} />
                                    <div style={{
                                        flex: 1,
                                        minHeight: 0,
                                        overflow: 'auto'
                                    }}>
                                        <div style={{
                                            padding: '0 0.9rem 0.9rem',
                                            marginTop: -18,
                                            textAlign: 'center'
                                        }}>
                                            {showAvatar && (
                                                unit.tenantAvatarUrl ? (
                                                    <div style={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: '50%',
                                                        overflow: 'hidden',
                                                        border: '3px solid #0f172a',
                                                        boxShadow: '0 8px 16px rgba(15, 23, 42, 0.2)',
                                                        margin: '0 auto 0.4rem'
                                                    }}>
                                                        <img
                                                            src={unit.tenantAvatarUrl}
                                                            alt={unit.tenantName || 'Resident'}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: '50%',
                                                        background: 'rgba(99, 102, 241, 0.2)',
                                                        color: '#c7d2fe',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        border: '3px solid #0f172a',
                                                        boxShadow: '0 8px 16px rgba(15, 23, 42, 0.2)',
                                                        margin: '0 auto 0.4rem'
                                                    }}>
                                                        {tooltipInitials || 'R'}
                                                    </div>
                                                )
                                            )}
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{tooltipTitle}</div>
                                            <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{tooltipSubtitle}</div>
                                        </div>
                                        <div style={{
                                            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                                            padding: '0.6rem 0.8rem 0.75rem',
                                            display: 'grid',
                                            gridTemplateColumns: canMessage ? '1fr 1fr' : '1fr',
                                            gap: 8
                                        }}>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    if (unit.type !== 'stairs') {
                                                        onUnitClick?.(unit.id);
                                                    }
                                                }}
                                                style={{
                                                    background: '#0b1220',
                                                    color: '#e2e8f0',
                                                    border: '1px solid rgba(148, 163, 184, 0.35)',
                                                    borderRadius: 999,
                                                    padding: '0.35rem 0.5rem',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                View
                                            </button>
                                            {canMessage && (
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onUnitMessageClick?.(unit.id);
                                                    }}
                                                    style={{
                                                        background: '#2563eb',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 999,
                                                        padding: '0.35rem 0.5rem',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Message
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>,
                        document.body
                    )}
                </div>

                {/* Side Walls (Structure) */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, background: '#334155', borderRight: '1px solid #1e293b' }}></div>
                <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 4, background: '#334155', borderLeft: '1px solid #1e293b' }}></div>

            </div>
        </div>
    );
}
