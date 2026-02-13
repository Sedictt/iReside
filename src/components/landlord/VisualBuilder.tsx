"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragStartEvent, DragMoveEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';

import { User, Plus, ArrowUpFromLine, Trash2, X, Save, Pencil, Maximize2, Minimize2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

// QoL feature imports
import { useUndoRedo } from './visual-builder/useUndoRedo';
import { usePersistedViewport } from './visual-builder/usePersistedViewport';
import MiniMap from './visual-builder/MiniMap';
import BuilderToolbar from './visual-builder/BuilderToolbar';
import CanvasSearch from './visual-builder/CanvasSearch';
import SavedViews, { type SavedView } from './visual-builder/SavedViews';

type UnitType = 'studio' | '1br' | '2br' | '3br' | 'dorm' | 'stairs';
type MapTileType = 'corridor';

interface Unit {
    id: string;
    type: UnitType;
    gridX: number;
    gridY: number;
    floor: number;
    status: 'occupied' | 'vacant' | 'maintenance' | 'neardue';
    tenantName?: string;
    tenantIsPrivate?: boolean;
    tenantAvatarUrl?: string;
    unitNumber?: string;
    rentAmount?: number;
}

interface MapTile {
    id: string;
    type: MapTileType;
    gridX: number;
    gridY: number;
    floor: number;
}

type UnitNote = {
    id: string;
    text: string;
    createdAt: string;
};

type InitialUnit = {
    id: string;
    unit_type: string;
    grid_x: number;
    grid_y: number;
    map_x?: number | null;
    map_y?: number | null;
    map_floor?: number | null;
    status: string;
    unit_number?: string | null;
    rent_amount?: number | null;
    tenant_name?: string | null;
    tenant_is_private?: boolean | null;
    tenant_avatar_url?: string | null;
};

type InitialTile = {
    id: string;
    tile_type: string;
    grid_x: number;
    grid_y: number;
    floor?: number | null;
};

type GhostState = { x: number; y: number; widthCells: number; heightCells: number; valid: boolean };

// Config
const GRID_CELL_SIZE = 40;

const DEFAULT_UNIT_CONFIG = { width: 3, height: 2, label: 'Unit' };
const unitConfig: Record<string, { width: number; height: number; label: string }> = {
    studio: { width: 2, height: 2, label: 'Studio' },
    '1br': { width: 3, height: 2, label: '1 Bedroom' },
    '2br': { width: 4, height: 3, label: '2 Bedroom' },
    '3br': { width: 5, height: 3, label: '3 Bedroom' },
    dorm: { width: 2, height: 2, label: 'Dorm' },
    stairs: { width: 2, height: 2, label: 'Stairs' }
};

const getUnitConfig = (type: string) => unitConfig[type] ?? DEFAULT_UNIT_CONFIG;

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
    initialTiles = [],
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
    initialTiles?: InitialTile[];
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
        gridX: u.map_x ?? u.grid_x,
        gridY: u.map_y ?? u.grid_y,
        floor: u.map_floor ?? 1,
        status: mapDbStatusToUi(u.status),
        unitNumber: u.unit_number ?? undefined,
        rentAmount: u.rent_amount ?? undefined,
        tenantName: u.tenant_name ?? undefined,
        tenantIsPrivate: u.tenant_is_private ?? undefined,
        tenantAvatarUrl: u.tenant_avatar_url ?? undefined
    }));

    const mapInitialTiles = (items: InitialTile[]) => items
        .filter((tile) => tile.tile_type === 'corridor')
        .map((tile) => ({
            id: tile.id,
            type: 'corridor' as MapTileType,
            gridX: tile.grid_x,
            gridY: tile.grid_y,
            floor: tile.floor ?? 1
        }));

    const [units, setUnits] = useState<Unit[]>(mapInitialUnits(initialUnits));
    const [tiles, setTiles] = useState<MapTile[]>(mapInitialTiles(initialTiles));
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

    // Floor + corridor paint state
    const [activeFloor, setActiveFloor] = useState(1);
    const [paintMode, setPaintMode] = useState<'none' | 'corridor'>('none');
    const paintedCellsRef = useRef<Set<string>>(new Set());

    // ═══ QoL: Multi-select ═══
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // ═══ QoL: Notes & Metadata ═══
    const [notesByUnit, setNotesByUnit] = useState<Record<string, UnitNote[]>>({});
    const [noteDraft, setNoteDraft] = useState('');
    const [lastUpdatedByUnit, setLastUpdatedByUnit] = useState<Record<string, string>>({});

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

    // ═══ QoL: Filters ═══
    const [statusFilter, setStatusFilter] = useState<Set<Unit['status']>>(
        new Set(['vacant', 'occupied', 'maintenance', 'neardue'])
    );
    const [priceFilter, setPriceFilter] = useState<{ min: string; max: string }>({ min: '', max: '' });
    const [showStairs, setShowStairs] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(false);

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
        setTiles(mapInitialTiles(initialTiles));
    }, [initialUnits, initialTiles, readOnly]);

    useEffect(() => {
        setLastUpdatedByUnit(prev => {
            const next = { ...prev };
            let changed = false;
            for (const unit of units) {
                if (!next[unit.id]) {
                    next[unit.id] = new Date().toISOString();
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [units]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const key = `unit-notes-${propertyId}`;
        const stored = window.localStorage.getItem(key);
        if (stored) {
            try {
                setNotesByUnit(JSON.parse(stored));
            } catch {
                setNotesByUnit({});
            }
        }
    }, [propertyId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const key = `unit-notes-${propertyId}`;
        window.localStorage.setItem(key, JSON.stringify(notesByUnit));
    }, [notesByUnit, propertyId]);

    // ═══════════════════════════
    //  QoL HELPER FUNCTIONS
    // ═══════════════════════════

    /** Push current state to undo stack before every mutation */
    const pushUndo = useCallback(() => {
        undoRedo.push(JSON.parse(JSON.stringify(units)));
    }, [units, undoRedo]);

    const touchUnits = useCallback((ids: string[]) => {
        const now = new Date().toISOString();
        setLastUpdatedByUnit(prev => {
            const next = { ...prev };
            ids.forEach((id) => { next[id] = now; });
            return next;
        });
    }, []);

    /** Zoom helpers */
    const handleZoomIn = useCallback(() => setZoom(z => Math.min(3, z + 0.15)), []);
    const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.4, z - 0.15)), []);
    const handleZoomReset = useCallback(() => setZoom(1), []);
    const handleFitToView = useCallback(() => {
        if (!viewportRef.current) return;
        const vp = viewportRef.current;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const floorUnits = units.filter((unit) => unit.floor === activeFloor);
        const floorTiles = tiles.filter((tile) => tile.floor === activeFloor);

        for (const u of floorUnits) {
            const cfg = getUnitConfig(u.type);
            const px = u.gridX * GRID_CELL_SIZE;
            const py = u.gridY * GRID_CELL_SIZE;
            minX = Math.min(minX, px);
            maxX = Math.max(maxX, px + cfg.width * GRID_CELL_SIZE);
            minY = Math.min(minY, py);
            maxY = Math.max(maxY, py + cfg.height * GRID_CELL_SIZE);
        }

        for (const tile of floorTiles) {
            const px = tile.gridX * GRID_CELL_SIZE;
            const py = tile.gridY * GRID_CELL_SIZE;
            minX = Math.min(minX, px);
            maxX = Math.max(maxX, px + GRID_CELL_SIZE);
            minY = Math.min(minY, py);
            maxY = Math.max(maxY, py + GRID_CELL_SIZE);
        }

        if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;
        const contentW = maxX - minX + 120;
        const contentH = maxY - minY + 120;
        const newZoom = Math.min(vp.clientWidth / contentW, vp.clientHeight / contentH, 2);
        setZoom(Math.max(0.4, newZoom));
        requestAnimationFrame(() => {
            vp.scrollLeft = (minX - 60) * newZoom;
            vp.scrollTop = (minY - 60) * newZoom;
        });
    }, [units, tiles, activeFloor]);

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
        touchUnits(ids);
        clearSelection();
    }, [selectedIds, pushUndo, supabase, clearSelection, touchUnits]);

    /** Duplicate selected units with offset */
    const handleDuplicate = useCallback(async () => {
        if (selectedIds.size === 0) return;
        pushUndo();
        const toDup = units.filter(u => selectedIds.has(u.id));
        const newUnits: Unit[] = [];
        for (const u of toDup) {
            const cfg = getUnitConfig(u.type);
            const offsetX = u.gridX + cfg.width + 1;
            const unitNumber = `${u.gridY}${Math.floor(offsetX / 2) + 10}`;
            const { data } = await supabase
                .from('units')
                .insert([{
                    property_id: propertyId,
                    unit_type: u.type,
                    grid_x: offsetX,
                    grid_y: u.gridY,
                    map_x: offsetX,
                    map_y: u.gridY,
                    map_floor: u.floor,
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
                    floor: n.map_floor ?? u.floor,
                    status: 'vacant',
                    unitNumber: n.unit_number,
                    rentAmount: n.rent_amount ?? undefined,
                });
            }
        }
        setUnits(prev => [...prev, ...newUnits]);
        touchUnits(newUnits.map(n => n.id));
        clearSelection();
    }, [selectedIds, units, pushUndo, supabase, propertyId, clearSelection, touchUnits]);

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
                await supabase.from('units').update({ grid_y: targetY, map_y: targetY }).eq('id', u.id);
            }
        }
        setUnits(prev => prev.map(u =>
            selectedIds.has(u.id) ? { ...u, gridY: targetY } : u
        ));
        touchUnits(Array.from(selectedIds));
    }, [selectedIds, units, pushUndo, supabase, touchUnits]);

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
                await supabase.from('units').update({ grid_x: newX, map_x: newX }).eq('id', sel[i].id);
            }
            sel[i] = { ...sel[i], gridX: newX };
        }
        const updatedMap = new Map(sel.map(u => [u.id, u.gridX]));
        setUnits(prev => prev.map(u =>
            updatedMap.has(u.id) ? { ...u, gridX: updatedMap.get(u.id)! } : u
        ));
        touchUnits(Array.from(selectedIds));
    }, [selectedIds, units, pushUndo, supabase, touchUnits]);

    /** Center selected units vertically to median floor */
    const handleCenterVertical = useCallback(async () => {
        if (selectedIds.size < 2) return;
        pushUndo();
        const sel = units.filter(u => selectedIds.has(u.id));
        const floors = sel.map(u => u.gridY).sort((a, b) => a - b);
        const median = floors[Math.floor(floors.length / 2)];
        for (const u of sel) {
            if (u.gridY !== median) {
                await supabase.from('units').update({ grid_y: median, map_y: median }).eq('id', u.id);
            }
        }
        setUnits(prev => prev.map(u =>
            selectedIds.has(u.id) ? { ...u, gridY: median } : u
        ));
        touchUnits(Array.from(selectedIds));
    }, [selectedIds, units, pushUndo, supabase, touchUnits]);

    const handleAddNote = useCallback((unitId: string) => {
        const text = noteDraft.trim();
        if (!text) return;
        setNotesByUnit(prev => {
            const next = { ...prev };
            const nextNote: UnitNote = {
                id: crypto.randomUUID(),
                text,
                createdAt: new Date().toISOString(),
            };
            next[unitId] = [...(next[unitId] || []), nextNote];
            return next;
        });
        setNoteDraft('');
    }, [noteDraft]);

    const handleRemoveNote = useCallback((unitId: string, noteId: string) => {
        setNotesByUnit(prev => {
            const next = { ...prev };
            next[unitId] = (next[unitId] || []).filter(n => n.id !== noteId);
            return next;
        });
    }, []);

    const handleNudgeSelected = useCallback(async (dx: number, dy: number) => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        const moving = units.filter(u => selectedIds.has(u.id));
        const stationary = units.filter(u => !selectedIds.has(u.id));

        const nextPositions = new Map<string, { x: number; y: number }>();
        for (const u of moving) {
            const nextX = u.gridX + dx;
            const nextY = u.gridY + dy;
            if (nextX < 0 || nextY < 0) return;
            nextPositions.set(u.id, { x: nextX, y: nextY });
        }

        const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => (
            a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
        );

        for (const u of moving) {
            const target = nextPositions.get(u.id)!;
            const cfg = getUnitConfig(u.type);
            const candidate = { x: target.x, y: target.y, w: cfg.width, h: cfg.height };

            for (const other of stationary) {
                if (other.floor !== u.floor) continue;
                const otherCfg = getUnitConfig(other.type);
                const otherRect = { x: other.gridX, y: other.gridY, w: otherCfg.width, h: otherCfg.height };
                if (overlaps(candidate, otherRect)) return;
            }

            for (const other of moving) {
                if (other.id === u.id || other.floor !== u.floor) continue;
                const targetOther = nextPositions.get(other.id)!;
                const otherCfg = getUnitConfig(other.type);
                const otherRect = { x: targetOther.x, y: targetOther.y, w: otherCfg.width, h: otherCfg.height };
                if (overlaps(candidate, otherRect)) return;
            }

            for (const tile of tiles) {
                if (tile.floor !== u.floor) continue;
                const tileRect = { x: tile.gridX, y: tile.gridY, w: 1, h: 1 };
                if (overlaps(candidate, tileRect)) return;
            }
        }

        pushUndo();
        setUnits(prev => prev.map(u =>
            selectedIds.has(u.id)
                ? { ...u, gridX: nextPositions.get(u.id)!.x, gridY: nextPositions.get(u.id)!.y }
                : u
        ));
        for (const u of moving) {
            const target = nextPositions.get(u.id)!;
            await supabase.from('units').update({
                grid_x: target.x,
                grid_y: target.y,
                map_x: target.x,
                map_y: target.y
            }).eq('id', u.id);
        }
        touchUnits(ids);
    }, [selectedIds, units, tiles, pushUndo, supabase, touchUnits]);

    /** Pan-to for search highlight */
    const handlePanTo = useCallback((gridX: number, gridY: number, floor: number) => {
        const vp = viewportRef.current;
        if (!vp) return;
        if (floor !== activeFloor) setActiveFloor(floor);
        const px = gridX * GRID_CELL_SIZE * zoom;
        const py = gridY * GRID_CELL_SIZE * zoom;
        vp.scrollLeft = px - vp.clientWidth / 2;
        vp.scrollTop = py - vp.clientHeight / 2;
        // Clear highlight after 3 seconds
        setTimeout(() => setHighlightedUnitId(null), 3000);
    }, [zoom, activeFloor]);

    /** Restore saved view */
    const handleRestoreView = useCallback((view: SavedView) => {
        setZoom(view.zoom);
        if (view.floor) setActiveFloor(view.floor);
        requestAnimationFrame(() => {
            const vp = viewportRef.current;
            if (vp) {
                vp.scrollLeft = view.scrollX;
                vp.scrollTop = view.scrollY;
            }
        });
    }, []);

    const toggleCorridorPaint = useCallback(() => {
        setPaintMode((prev) => (prev === 'corridor' ? 'none' : 'corridor'));
        setSelectedIds(new Set());
        setEditingUnit(null);
    }, []);

    const resolveGridFromPointer = useCallback((clientX: number, clientY: number) => {
        const vp = viewportRef.current;
        if (!vp) return null;
        const rect = vp.getBoundingClientRect();
        const worldX = (clientX - rect.left + vp.scrollLeft) / zoom;
        const worldY = (clientY - rect.top + vp.scrollTop) / zoom;
        const gridX = Math.floor(worldX / GRID_CELL_SIZE);
        const gridY = Math.floor(worldY / GRID_CELL_SIZE);
        if (gridX < 0 || gridY < 0) return null;
        return { gridX, gridY };
    }, [zoom]);

    const handlePaintCell = useCallback(async (gridX: number, gridY: number, action: 'add' | 'remove') => {
        const key = `${activeFloor}:${gridX}:${gridY}`;
        if (paintedCellsRef.current.has(key)) return;
        paintedCellsRef.current.add(key);

        const overlapsUnit = units.some((unit) => {
            if (unit.floor !== activeFloor) return false;
            const cfg = getUnitConfig(unit.type);
            return gridX >= unit.gridX
                && gridX < unit.gridX + cfg.width
                && gridY >= unit.gridY
                && gridY < unit.gridY + cfg.height;
        });

        if (overlapsUnit) return;

        if (action === 'add') {
            const exists = tiles.some((tile) => tile.floor === activeFloor && tile.gridX === gridX && tile.gridY === gridY && tile.type === 'corridor');
            if (exists) return;
            const tempId = `temp-${crypto.randomUUID()}`;
            const optimistic: MapTile = { id: tempId, type: 'corridor', gridX, gridY, floor: activeFloor };
            setTiles((prev) => [...prev, optimistic]);

            const { data, error } = await supabase
                .from('unit_map_tiles')
                .insert([{
                    property_id: propertyId,
                    floor: activeFloor,
                    grid_x: gridX,
                    grid_y: gridY,
                    tile_type: 'corridor'
                }])
                .select();

            if (error || !data?.[0]) {
                setTiles((prev) => prev.filter((tile) => tile.id !== tempId));
                return;
            }

            setTiles((prev) => prev.map((tile) => tile.id === tempId
                ? { ...tile, id: data[0].id }
                : tile
            ));
        } else {
            const target = tiles.find((tile) => tile.floor === activeFloor && tile.gridX === gridX && tile.gridY === gridY && tile.type === 'corridor');
            if (!target) return;
            setTiles((prev) => prev.filter((tile) => tile.id !== target.id));
            await supabase
                .from('unit_map_tiles')
                .delete()
                .eq('id', target.id);
        }
    }, [activeFloor, tiles, units, supabase, propertyId]);

    const handlePaintStart = useCallback(() => {
        paintedCellsRef.current.clear();
    }, []);

    const handlePaintEnd = useCallback(() => {
        paintedCellsRef.current.clear();
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
            // Arrow keys → Nudge selected
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                const step = e.shiftKey ? 2 : 1;
                const delta = e.key === 'ArrowUp'
                    ? { dx: 0, dy: step }
                    : e.key === 'ArrowDown'
                        ? { dx: 0, dy: -step }
                        : e.key === 'ArrowLeft'
                            ? { dx: -step, dy: 0 }
                            : { dx: step, dy: 0 };
                handleNudgeSelected(delta.dx, delta.dy);
                return;
            }
            // + / - / 0 → Quick zoom
            if (e.key === '+' || e.key === '=') { handleZoomIn(); return; }
            if (e.key === '-') { handleZoomOut(); return; }
            if (e.key === '0') { handleZoomReset(); return; }
            // Escape → Clear selection / close search
            if (e.key === 'Escape') { clearSelection(); setSearchOpen(false); setSavedViewsOpen(false); return; }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [readOnly, handleZoomIn, handleZoomOut, handleZoomReset, handleFitToView, handleBulkDelete, handleUndo, handleRedo, handleDuplicate, handleNudgeSelected, units, clearSelection]);

    // --- Drag Logic ---

    const handleDragStart = (event: DragStartEvent) => {
        if (readOnly || paintMode !== 'none') return;
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
        if (readOnly || paintMode !== 'none') return;
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

        // Convert to Grid (top-down)
        let targetGridX = Math.floor(worldX / GRID_CELL_SIZE);
        let targetGridY = Math.floor(worldY / GRID_CELL_SIZE);

        const cfg = getUnitConfig(activeType);
        const widthCells = cfg.width;
        const heightCells = cfg.height;
        targetGridX -= Math.floor(widthCells / 2);
        targetGridY -= Math.floor(heightCells / 2);

        if (targetGridX < 0) targetGridX = 0;
        if (targetGridY < 0) targetGridY = 0;

        const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => (
            a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
        );

        const candidate = { x: targetGridX, y: targetGridY, w: widthCells, h: heightCells };

        const isOccupied = units.some(u => {
            if (u.id === active.id) return false;
            if (u.floor !== activeFloor) return false;
            const otherCfg = getUnitConfig(u.type);
            const other = { x: u.gridX, y: u.gridY, w: otherCfg.width, h: otherCfg.height };
            return overlaps(candidate, other);
        }) || tiles.some((tile) => {
            if (tile.floor !== activeFloor) return false;
            const other = { x: tile.gridX, y: tile.gridY, w: 1, h: 1 };
            return overlaps(candidate, other);
        });

        setGhostState({
            x: targetGridX,
            y: targetGridY,
            widthCells,
            heightCells,
            valid: !isOccupied
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        if (readOnly || paintMode !== 'none') return;
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

            const tempId = `temp-${crypto.randomUUID()}`;
            const optimisticUnit: Unit = {
                id: tempId,
                type: unitType,
                gridX: finalGhost.x,
                gridY: finalGhost.y,
                floor: activeFloor,
                status: 'vacant',
                unitNumber,
                rentAmount: unitType === 'studio' ? 1200 : unitType === '1br' ? 1800 : 2500,
            };

            setUnits(prev => [...prev, optimisticUnit]);

            const { data, error } = await supabase
                .from('units')
                .insert([{
                    property_id: propertyId,
                    unit_type: unitType,
                    grid_x: finalGhost.x,
                    grid_y: finalGhost.y,
                    map_x: finalGhost.x,
                    map_y: finalGhost.y,
                    map_floor: activeFloor,
                    unit_number: unitNumber,
                    rent_amount: unitType === 'studio' ? 1200 : unitType === '1br' ? 1800 : 2500,
                    status: 'available'
                }])
                .select();

            if (error) {
                setUnits(prev => prev.filter(u => u.id !== tempId));
                return;
            }

            if (data?.[0]) {
                const newUnit = data[0];
                setUnits(prev => prev.map(u =>
                    u.id === tempId
                        ? {
                            id: newUnit.id,
                            type: newUnit.unit_type as UnitType,
                            gridX: newUnit.grid_x,
                            gridY: newUnit.grid_y,
                            floor: newUnit.map_floor ?? activeFloor,
                            status: 'vacant',
                            unitNumber: newUnit.unit_number,
                            rentAmount: newUnit.rent_amount ?? undefined,
                        }
                        : u
                ));
                touchUnits([newUnit.id]);
            }
        } else {
            // UPDATE IN SUPABASE
            const prevUnit = units.find(u => u.id === active.id);
            setUnits(prev => prev.map(u =>
                u.id === active.id
                    ? { ...u, gridX: finalGhost.x, gridY: finalGhost.y }
                    : u
            ));

            const { error } = await supabase
                .from('units')
                .update({
                    grid_x: finalGhost.x,
                    grid_y: finalGhost.y,
                    map_x: finalGhost.x,
                    map_y: finalGhost.y
                })
                .eq('id', active.id);

            if (error && prevUnit) {
                setUnits(prev => prev.map(u =>
                    u.id === active.id
                        ? { ...u, gridX: prevUnit.gridX, gridY: prevUnit.gridY }
                        : u
                ));
            }
            if (!error) touchUnits([active.id as string]);
        }
    };

    const handleUnitEdit = (unitId: string) => {
        if (readOnly) return;
        const unit = units.find(u => u.id === unitId);
        if (!unit || unit.type === 'stairs') return;
        setSelectedIds(new Set([unitId]));
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
            touchUnits([editingUnit.id]);
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

    const validationIssues = useMemo(() => {
        const issues = new Map<string, string[]>();
        const addIssue = (id: string, issue: string) => {
            issues.set(id, [...(issues.get(id) || []), issue]);
        };

        for (const unit of units) {
            if (unit.type === 'stairs') continue;
            if (!unit.unitNumber) addIssue(unit.id, 'Missing unit number');
            if (!unit.rentAmount) addIssue(unit.id, 'Missing rent amount');
        }

        for (let i = 0; i < units.length; i++) {
            for (let j = i + 1; j < units.length; j++) {
                const a = units[i];
                const b = units[j];
                if (a.floor !== b.floor) continue;
                const aCfg = getUnitConfig(a.type);
                const bCfg = getUnitConfig(b.type);
                const overlap = a.gridX < b.gridX + bCfg.width
                    && a.gridX + aCfg.width > b.gridX
                    && a.gridY < b.gridY + bCfg.height
                    && a.gridY + aCfg.height > b.gridY;
                if (overlap) {
                    addIssue(a.id, `Overlaps with ${b.unitNumber || b.id}`);
                    addIssue(b.id, `Overlaps with ${a.unitNumber || a.id}`);
                }
            }
        }

        return issues;
    }, [units]);

    const floorOptions = useMemo(() => {
        const floors = new Set<number>([1]);
        units.forEach((unit) => floors.add(unit.floor));
        tiles.forEach((tile) => floors.add(tile.floor));
        return Array.from(floors).sort((a, b) => a - b);
    }, [units, tiles]);

    useEffect(() => {
        if (!floorOptions.includes(activeFloor)) {
            setActiveFloor(floorOptions[0] ?? 1);
        }
    }, [activeFloor, floorOptions]);

    useEffect(() => {
        setSelectedIds(new Set());
        setEditingUnit(null);
    }, [activeFloor]);

    const floorUnits = useMemo(() => units.filter((unit) => unit.floor === activeFloor), [units, activeFloor]);
    const floorTiles = useMemo(() => tiles.filter((tile) => tile.floor === activeFloor), [tiles, activeFloor]);

    const filteredUnits = useMemo(() => {
        const min = priceFilter.min ? parseFloat(priceFilter.min) : null;
        const max = priceFilter.max ? parseFloat(priceFilter.max) : null;
        return floorUnits.filter((unit) => {
            if (unit.type === 'stairs') return showStairs;
            if (!statusFilter.has(unit.status)) return false;
            if (min !== null && (unit.rentAmount ?? 0) < min) return false;
            if (max !== null && (unit.rentAmount ?? 0) > max) return false;
            return true;
        });
    }, [floorUnits, statusFilter, priceFilter, showStairs]);

    const worldSize = useMemo(() => {
        let maxX = 0;
        let maxY = 0;

        for (const unit of floorUnits) {
            const cfg = getUnitConfig(unit.type);
            maxX = Math.max(maxX, unit.gridX + cfg.width);
            maxY = Math.max(maxY, unit.gridY + cfg.height);
        }

        for (const tile of floorTiles) {
            maxX = Math.max(maxX, tile.gridX + 1);
            maxY = Math.max(maxY, tile.gridY + 1);
        }

        return {
            width: Math.max(1200, (maxX + 6) * GRID_CELL_SIZE),
            height: Math.max(800, (maxY + 6) * GRID_CELL_SIZE)
        };
    }, [floorUnits, floorTiles]);

    const detailUnitId = editingUnit?.id ?? (selectedIds.size === 1 ? Array.from(selectedIds)[0] : null);
    const detailUnit = detailUnitId ? units.find(u => u.id === detailUnitId) : null;
    const detailIssues = detailUnitId ? (validationIssues.get(detailUnitId) || []) : [];
    const detailNotes = detailUnitId ? (notesByUnit[detailUnitId] || []) : [];
    const detailUpdatedAt = detailUnitId ? lastUpdatedByUnit[detailUnitId] : undefined;
    const detailLease = detailUnit?.status === 'occupied' ? 'Active' : 'None';
    const detailRent = detailUnit?.rentAmount ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(detailUnit.rentAmount) : 'Not set';

    useEffect(() => {
        setNoteDraft('');
    }, [detailUnitId]);

    const allowDrag = !readOnly && paintMode === 'none';

    return (
        <DndContext
            sensors={sensors}
            onDragStart={allowDrag ? handleDragStart : undefined}
            onDragMove={allowDrag ? handleDragMove : undefined}
            onDragEnd={allowDrag ? handleDragEnd : undefined}
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
                        width: `${worldSize.width * zoom}px`,
                        height: `${worldSize.height * zoom}px`,
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
                            units={filteredUnits}
                            tiles={floorTiles}
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
                            validationIssues={validationIssues}
                            paintMode={paintMode}
                            onPaintCell={handlePaintCell}
                            onPaintStart={handlePaintStart}
                            onPaintEnd={handlePaintEnd}
                            resolveGridFromPointer={resolveGridFromPointer}
                        />

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

                {hudVisible && floorOptions.length > 1 && readOnly && (
                    <div style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        padding: '6px 10px',
                        zIndex: 90
                    }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700 }}>Floor</span>
                        <select
                            value={activeFloor}
                            onChange={(event) => setActiveFloor(Number(event.target.value))}
                            style={{
                                background: 'rgba(15, 23, 42, 0.85)',
                                border: '1px solid #334155',
                                borderRadius: 6,
                                color: '#e2e8f0',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                cursor: 'pointer'
                            }}
                        >
                            {floorOptions.map((floor) => (
                                <option key={floor} value={floor}>Floor {floor}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* ═══ QoL: Mini-Map ═══ */}
                {hudVisible && (
                    <MiniMap
                        units={filteredUnits}
                        tiles={floorTiles}
                        viewportRef={viewportRef}
                        zoom={zoom}
                        worldWidth={worldSize.width}
                        worldHeight={worldSize.height}
                        rightOffset={readOnly ? 12 : 292}
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
                        floors={floorOptions}
                        activeFloor={activeFloor}
                        onFloorChange={setActiveFloor}
                        corridorPaintMode={paintMode === 'corridor'}
                        onToggleCorridorPaint={toggleCorridorPaint}
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
                    currentFloor={activeFloor}
                    viewportRef={viewportRef}
                    onRestoreView={handleRestoreView}
                />}

                {/* Float Controls */}
                {hudVisible && <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', right: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 60, pointerEvents: 'none' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* Filters */}
                        <div style={{ position: 'relative', pointerEvents: 'auto' }}>
                            <button
                                type="button"
                                onClick={() => setFiltersOpen(p => !p)}
                                style={{
                                    padding: '0.45rem 0.8rem',
                                    background: filtersOpen ? 'rgba(37, 99, 235, 0.25)' : 'rgba(15, 23, 42, 0.7)',
                                    color: filtersOpen ? '#dbeafe' : '#94a3b8',
                                    borderRadius: 10,
                                    border: `1px solid ${filtersOpen ? '#60a5fa' : '#334155'}`,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Filters
                            </button>
                            {filtersOpen && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '120%',
                                    left: 0,
                                    width: 280,
                                    padding: '0.75rem',
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    borderRadius: 12,
                                    border: '1px solid #334155',
                                    boxShadow: '0 14px 30px rgba(0,0,0,0.4)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.6rem',
                                    zIndex: 120
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter(new Set(['vacant', 'occupied', 'maintenance', 'neardue']))}
                                                style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, fontSize: '0.65rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                                            >
                                                All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setStatusFilter(new Set());
                                                }}
                                                style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, fontSize: '0.65rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {(['vacant', 'occupied', 'maintenance', 'neardue'] as Unit['status'][]).map((status) => (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setStatusFilter(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(status)) next.delete(status); else next.add(status);
                                                    return next;
                                                })}
                                                style={{
                                                    padding: '0.3rem 0.55rem',
                                                    borderRadius: 999,
                                                    border: `1px solid ${statusFilter.has(status) ? '#60a5fa' : '#334155'}`,
                                                    background: statusFilter.has(status) ? 'rgba(37, 99, 235, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                                                    color: statusFilter.has(status) ? '#dbeafe' : '#94a3b8',
                                                    fontSize: '0.65rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setShowStairs(p => !p)}
                                            style={{
                                                padding: '0.3rem 0.55rem',
                                                borderRadius: 999,
                                                border: `1px solid ${showStairs ? '#60a5fa' : '#334155'}`,
                                                background: showStairs ? 'rgba(37, 99, 235, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                                                color: showStairs ? '#dbeafe' : '#94a3b8',
                                                fontSize: '0.65rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            stairs
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input
                                            type="number"
                                            value={priceFilter.min}
                                            onChange={(e) => setPriceFilter(prev => ({ ...prev, min: e.target.value }))}
                                            placeholder="Min rent"
                                            style={{
                                                width: 90,
                                                padding: '0.35rem 0.5rem',
                                                background: '#0f172a',
                                                border: '1px solid #334155',
                                                borderRadius: 6,
                                                color: '#e2e8f0',
                                                fontSize: '0.65rem'
                                            }}
                                        />
                                        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>to</span>
                                        <input
                                            type="number"
                                            value={priceFilter.max}
                                            onChange={(e) => setPriceFilter(prev => ({ ...prev, max: e.target.value }))}
                                            placeholder="Max rent"
                                            style={{
                                                width: 90,
                                                padding: '0.35rem 0.5rem',
                                                background: '#0f172a',
                                                border: '1px solid #334155',
                                                borderRadius: 6,
                                                color: '#e2e8f0',
                                                fontSize: '0.65rem'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

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
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(to bottom, #3f915f, #0a1d14)', border: '1px solid #1f4d35' }} />
                                <span style={{ color: '#b7d9c2', fontSize: '0.7rem' }}>Vacant</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(to bottom, #5a7fb3, #0c1522)', border: '1px solid #2c4c7a' }} />
                                <span style={{ color: '#b8c7dd', fontSize: '0.7rem' }}>Occupied</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#a34b4b', border: '1px solid #5a2b2b' }} />
                                <span style={{ color: '#d7b3b3', fontSize: '0.7rem' }}>Maintenance</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#b86b3a', border: '1px solid #6a3a1c', boxShadow: '0 0 4px rgba(184, 107, 58, 0.3)' }} />
                                <span style={{ color: '#e4c0a8', fontSize: '0.7rem' }}>Near Due</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(to right, #334155, #475569)', border: '1px solid #475569' }} />
                                <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Stairs</span>
                            </div>
                        </div>

                            <div style={{ display: 'flex', gap: '0.5rem', pointerEvents: 'auto' }}>
                            <div style={{ padding: '0.5rem 1rem', background: 'rgba(30, 41, 59, 0.8)', color: 'white', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid #475569' }}>
                                Ctrl + Scroll to Zoom • Arrow keys to Nudge • Alt + Paint to Erase
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
                                                <option value="3br">3 Bedroom</option>
                                                <option value="dorm">Dorm</option>
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
                                            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Floor {editingUnit.floor} &bull; Row {editingUnit.gridY} &bull; Column {editingUnit.gridX}</div>
                                        </div>

                                        {detailUnit && (
                                            <div style={{ padding: '0.75rem', background: '#0f172a', borderRadius: 8, border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Details</div>
                                                <div style={{ color: '#e2e8f0', fontSize: '0.8rem', display: 'grid', gap: 4 }}>
                                                    <div><span style={{ color: '#94a3b8' }}>Tenant:</span> {detailUnit.tenantName || (detailUnit.status === 'vacant' ? 'Vacant' : 'Unknown')}</div>
                                                    <div><span style={{ color: '#94a3b8' }}>Lease:</span> {detailLease}</div>
                                                    <div><span style={{ color: '#94a3b8' }}>Rent:</span> {detailRent}</div>
                                                    <div><span style={{ color: '#94a3b8' }}>Last updated:</span> {detailUpdatedAt ? new Date(detailUpdatedAt).toLocaleString() : 'Unknown'}</div>
                                                </div>
                                            </div>
                                        )}

                                        {detailUnit && (
                                            <div style={{ padding: '0.75rem', background: '#0f172a', borderRadius: 8, border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <AlertTriangle size={14} color="#f87171" />
                                                    Validation
                                                </div>
                                                {detailIssues.length === 0 ? (
                                                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No issues detected.</div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        {detailIssues.map((issue, index) => (
                                                            <div key={`${issue}-${index}`} style={{ color: '#fecaca', fontSize: '0.75rem' }}>• {issue}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {detailUnit && (
                                            <div style={{ padding: '0.75rem', background: '#0f172a', borderRadius: 8, border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Notes</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                                                    {detailNotes.length === 0 && (
                                                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No notes yet.</div>
                                                    )}
                                                    {detailNotes.map((note) => (
                                                        <div key={note.id} style={{ padding: '0.5rem', borderRadius: 6, background: 'rgba(15, 23, 42, 0.7)', border: '1px solid #1f2a44' }}>
                                                            <div style={{ color: '#e2e8f0', fontSize: '0.75rem', marginBottom: 4 }}>{note.text}</div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{new Date(note.createdAt).toLocaleString()}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveNote(detailUnit.id, note.id)}
                                                                    style={{ background: 'transparent', border: 'none', color: '#fca5a5', fontSize: '0.65rem', cursor: 'pointer' }}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <input
                                                        type="text"
                                                        value={noteDraft}
                                                        onChange={(e) => setNoteDraft(e.target.value)}
                                                        placeholder="Add a note"
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.45rem 0.6rem',
                                                            background: '#0f172a',
                                                            border: '1px solid #334155',
                                                            borderRadius: 6,
                                                            color: '#e2e8f0',
                                                            fontSize: '0.75rem'
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddNote(detailUnit.id)}
                                                        style={{
                                                            padding: '0.45rem 0.75rem',
                                                            background: '#2563eb',
                                                            border: 'none',
                                                            borderRadius: 6,
                                                            color: 'white',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        )}
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
                                        <SidebarUnit type="3br" label="3 Bedroom" icon={<User size={16} />} />
                                        <SidebarUnit type="dorm" label="Dorm" icon={<User size={16} />} />
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
                            width: getUnitConfig(activeType).width * GRID_CELL_SIZE * zoom,
                            height: getUnitConfig(activeType).height * GRID_CELL_SIZE * zoom,
                            background: '#6366f1',
                            opacity: 0.8,
                            borderRadius: '4px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold',
                            transformOrigin: 'top left',
                        }}>
                            {getUnitConfig(activeType).label}
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
    tiles,
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
    validationIssues,
    paintMode,
    onPaintCell,
    onPaintStart,
    onPaintEnd,
    resolveGridFromPointer,
}: {
    units: Unit[];
    tiles: MapTile[];
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
    validationIssues?: Map<string, string[]>;
    paintMode: 'none' | 'corridor';
    onPaintCell: (gridX: number, gridY: number, action: 'add' | 'remove') => void;
    onPaintStart: () => void;
    onPaintEnd: () => void;
    resolveGridFromPointer: (clientX: number, clientY: number) => { gridX: number; gridY: number } | null;
}) {
    // ... (inside DraggableUnit function later in file)
    const { setNodeRef } = useDroppable({ id: 'canvas-droppable' });
    const isPaintingRef = useRef(false);
    const paintActionRef = useRef<'add' | 'remove'>('add');

    const handlePointerDown = (event: React.PointerEvent) => {
        if (readOnly || paintMode === 'none') return;
        event.preventDefault();
        event.stopPropagation();
        isPaintingRef.current = true;
        paintActionRef.current = event.altKey || event.button === 2 ? 'remove' : 'add';
        onPaintStart();
        const grid = resolveGridFromPointer(event.clientX, event.clientY);
        if (grid) onPaintCell(grid.gridX, grid.gridY, paintActionRef.current);
    };

    const handlePointerMove = (event: React.PointerEvent) => {
        if (!isPaintingRef.current || readOnly || paintMode === 'none') return;
        event.preventDefault();
        const grid = resolveGridFromPointer(event.clientX, event.clientY);
        if (grid) onPaintCell(grid.gridX, grid.gridY, paintActionRef.current);
    };

    const handlePointerUp = () => {
        if (!isPaintingRef.current) return;
        isPaintingRef.current = false;
        onPaintEnd();
    };

    useEffect(() => {
        const handleWindowUp = () => handlePointerUp();
        window.addEventListener('pointerup', handleWindowUp);
        return () => window.removeEventListener('pointerup', handleWindowUp);
    }, []);

    return (
        <div
            ref={setNodeRef}
            style={{ width: '100%', height: '100%', position: 'relative', cursor: paintMode === 'none' ? 'default' : 'crosshair' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContextMenu={(event) => {
                if (paintMode !== 'none') event.preventDefault();
            }}
        >

            {/* GHOST PREVIEW */}
            {ghost && (
                <div style={{
                    position: 'absolute',
                    left: ghost.x * GRID_CELL_SIZE,
                    top: ghost.y * GRID_CELL_SIZE,
                    width: ghost.widthCells * GRID_CELL_SIZE,
                    height: ghost.heightCells * GRID_CELL_SIZE,
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

            {/* CORRIDOR TILES */}
            {tiles.map((tile) => (
                <div
                    key={tile.id}
                    style={{
                        position: 'absolute',
                        left: tile.gridX * GRID_CELL_SIZE,
                        top: tile.gridY * GRID_CELL_SIZE,
                        width: GRID_CELL_SIZE,
                        height: GRID_CELL_SIZE,
                        background: 'linear-gradient(135deg, #1f2937, #0f172a)',
                        border: '1px solid #334155',
                        borderRadius: 4,
                        boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.08)',
                        zIndex: 2
                    }}
                />
            ))}

            {/* UNITS */}
            {units.map(unit => (
                <div key={unit.id} style={{ opacity: unit.id === activeId ? 0.3 : 1 }}> {/* Fade out original when dragging */}
                    <DraggableUnit
                        unit={unit}
                        readOnly={readOnly}
                        isSelected={selectedUnitId === unit.id || (selectedIds?.has(unit.id) ?? false)}
                        isHighlighted={highlightedUnitId === unit.id}
                        validationIssues={validationIssues?.get(unit.id) || []}
                        onUnitClick={(id) => {
                            if (paintMode !== 'none') return;
                            onUnitClick?.(id);
                        }}
                        onShiftClick={(id) => {
                            if (paintMode !== 'none') return;
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
    readOnly,
    isSelected,
    isHighlighted,
    validationIssues,
    onUnitClick,
    onShiftClick,
    onUnitMessageClick,
    currentUserUnitId,
    currentUserInitials,
    currentUserAvatarUrl
}: {
    unit: Unit;
    readOnly: boolean;
    isSelected: boolean;
    isHighlighted?: boolean;
    validationIssues?: string[];
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
    const cfg = getUnitConfig(unit.type);
    const pixelX = unit.gridX * GRID_CELL_SIZE;
    const pixelY = unit.gridY * GRID_CELL_SIZE;
    const width = cfg.width * GRID_CELL_SIZE;
    const height = cfg.height * GRID_CELL_SIZE;

    // Styles
    const isStairs = unit.type === 'stairs';
    const isOccupied = unit.status === 'occupied';
    const isVacant = unit.status === 'vacant';

    const statusTone = unit.status === 'vacant'
        ? { primary: '#3f915f', dark: '#0a1d14', glow: 'rgba(63, 145, 95, 0.14)' }
        : unit.status === 'occupied'
            ? { primary: '#5a7fb3', dark: '#0c1522', glow: 'rgba(90, 127, 179, 0.14)' }
            : unit.status === 'neardue'
                ? { primary: '#b86b3a', dark: '#24140c', glow: 'rgba(184, 107, 58, 0.14)' }
                : { primary: '#a34b4b', dark: '#230d0d', glow: 'rgba(163, 75, 75, 0.14)' };

    // Theme Colors
    const bgGradient = isStairs
        ? 'linear-gradient(to right, #334155, #475569, #334155)'
        : `linear-gradient(to bottom, ${statusTone.primary}, ${statusTone.dark})`;

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
    const validationCount = validationIssues?.length || 0;
    const hasValidation = validationCount > 0;
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
                height,
                zIndex: isHovered ? 70 : isSelected ? 65 : 10,
                cursor: readOnly ? 'pointer' : 'grab',
                boxSizing: 'border-box',
                outline: hasValidation ? '2px solid rgba(248, 113, 113, 0.75)' : 'none',
                outlineOffset: hasValidation ? 2 : 0
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

            {hasValidation && (
                <div
                    title={validationIssues?.join('\n')}
                    style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        background: 'rgba(127, 29, 29, 0.9)',
                        color: '#fee2e2',
                        border: '1px solid rgba(248, 113, 113, 0.6)',
                        borderRadius: 999,
                        padding: '2px 6px',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        zIndex: 90
                    }}
                >
                    <AlertTriangle size={10} />
                    {validationCount}
                </div>
            )}

            {/* Main Container */}
            <div style={{
                width: '100%',
                height: '100%',
                background: bgGradient,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 8,
                border: '1px solid #334155',
                boxShadow: 'inset 0 0 18px rgba(15, 23, 42, 0.5)'
            }}>
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
                        }}
                    />
                )}

                {readOnly && unit.id === currentUserUnitId && (
                    <div style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: '#6366f1',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
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

                {unit.status === 'maintenance' && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'repeating-linear-gradient(45deg, rgba(163, 75, 75, 0.22), rgba(163, 75, 75, 0.22) 10px, transparent 10px, transparent 20px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'grayscale(100%) blur(1px)'
                    }}>
                        <div style={{ background: '#a34b4b', color: 'white', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.7rem' }}>
                            MAINTENANCE
                        </div>
                    </div>
                )}

                {unit.status === 'neardue' && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        border: '1px solid #b86b3a',
                        boxShadow: 'inset 0 0 20px rgba(184, 107, 58, 0.2)',
                        pointerEvents: 'none',
                        animation: 'pulse-red 2s infinite'
                    }} />
                )}

                <div style={{
                    position: 'absolute',
                    inset: 0,
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 6,
                    zIndex: 5
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{
                            background: 'rgba(0,0,0,0.45)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: '0.6rem',
                            color: '#e2e8f0',
                            fontWeight: 700,
                            border: '1px solid rgba(255,255,255,0.12)'
                        }}>
                            {getUnitConfig(unit.type).label.toUpperCase()}
                        </div>
                        {unit.unitNumber && (
                            <div style={{
                                background: 'rgba(99, 102, 241, 0.3)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: '0.65rem',
                                color: '#c7d2fe',
                                fontWeight: 700,
                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                letterSpacing: '0.02em'
                            }}>
                                #{unit.unitNumber}
                            </div>
                        )}
                    </div>

                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#e2e8f0',
                        textShadow: '0 1px 2px rgba(0,0,0,0.45)'
                    }}>
                        {isStairs ? 'STAIRS' : unit.status === 'vacant' ? 'VACANT' : unit.tenantName || 'RESIDENT'}
                    </div>

                    {!isStairs && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6rem', color: '#e2e8f0' }}>
                            <span style={{ opacity: 0.8 }}>{unit.status.toUpperCase()}</span>
                            {unit.tenantName && unit.tenantName !== 'Resident' && (
                                <span style={{ opacity: 0.8 }}>{unit.tenantName}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

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
    );
}
