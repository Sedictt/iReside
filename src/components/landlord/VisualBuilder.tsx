"use client";
import React, { useState, useRef, useEffect } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragStartEvent, DragMoveEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { User, Plus, ArrowUpFromLine, Trash2 } from 'lucide-react';

type UnitType = 'studio' | '1br' | '2br' | 'stairs';

interface Unit {
    id: string;
    type: UnitType;
    gridX: number;
    gridY: number;
    status: 'occupied' | 'vacant' | 'maintenance' | 'neardue';
    tenantName?: string;
    unitNumber?: string;
    rentAmount?: number;
}

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

export default function VisualBuilder({ propertyId, initialUnits = [] }: { propertyId: string, initialUnits?: any[] }) {
    const [units, setUnits] = useState<Unit[]>(initialUnits.map(u => ({
        id: u.id,
        type: u.unit_type as UnitType,
        gridX: u.grid_x,
        gridY: u.grid_y,
        status: u.status === 'available' ? 'vacant' : u.status as any,
        unitNumber: u.unit_number,
        rentAmount: u.rent_amount
    })));
    const supabase = createClient();

    // Drag State
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<UnitType | null>(null);
    const [isDraggingExistingUnit, setIsDraggingExistingUnit] = useState(false); // New state to track if an existing unit is being dragged
    const [ghostState, setGhostState] = useState<{ x: number, y: number, widthCells: number, valid: boolean } | null>(null);

    // Viewport State
    const [zoom, setZoom] = useState(1);
    const viewportRef = useRef<HTMLDivElement>(null);

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
    useEffect(() => setMounted(true), []);

    // --- Drag Logic ---

    const handleDragStart = (event: DragStartEvent) => {
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
        const { active, over } = event;
        setActiveId(null);
        setActiveType(null);
        setIsDraggingExistingUnit(false); // Reset
        const finalGhost = ghostState;
        setGhostState(null);

        if (!finalGhost || !finalGhost.valid || !over) return;

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

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
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
                        <CanvasContent units={units} ghost={ghostState} activeId={activeId} />

                        {/* Floor Labels */}
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} style={{ position: 'absolute', left: 10, top: (10 - i - 1) * UNIT_HEIGHT + UNIT_HEIGHT / 2, color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: '3rem', pointerEvents: 'none' }}>
                                {i + 1}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Float Controls */}
                <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', right: '2rem', display: 'flex', justifyContent: 'space-between', zIndex: 60, pointerEvents: 'none' }}>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ padding: '0.5rem 1rem', background: 'rgba(30, 41, 59, 0.8)', color: 'white', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid #475569' }}>
                            Ctrl + Scroll to Zoom • Scroll to Pan
                        </div>
                        <div style={{ padding: '0.5rem 1rem', background: '#1e293b', border: '1px solid #475569', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}>
                            {Math.round(zoom * 100)}%
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <aside style={{ width: '280px', background: '#1e293b', borderLeft: '1px solid #475569', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155' }}>
                        <h2 style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Construction Kit</h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Drag rooms onto the property.</p>
                    </div>
                    <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                        <SidebarUnit type="studio" label="Studio Apt" icon={<User size={16} />} />
                        <SidebarUnit type="1br" label="1 Bedroom" icon={<User size={16} />} />
                        <SidebarUnit type="2br" label="2 Bedroom" icon={<User size={16} />} />
                        <SidebarUnit type="stairs" label="Stairwell" icon={<ArrowUpFromLine size={16} />} />
                    </div>
                </aside>

                <AnimatePresence>
                    {isDraggingExistingUnit && (
                        <TrashZone />
                    )}
                </AnimatePresence>
            </div>

            {/* DRAG OVERLAY - Follows Mouse (Screen Space) */}
            {mounted && createPortal(
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

function CanvasContent({ units, ghost, activeId }: { units: Unit[], ghost: any, activeId: string | null }) {
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
                    <DraggableUnit unit={unit} totalRows={GRID_ROWS} />
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
function DraggableUnit({ unit, totalRows }: { unit: Unit, totalRows: number }) {
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

    return (
        <div ref={setNodeRef} style={{
            position: 'absolute', top: pixelY, left: pixelX, width, height: UNIT_HEIGHT,
            zIndex: 10, cursor: 'grab', boxSizing: 'border-box',
        }} {...listeners} {...attributes}>

            {/* Main Container */}
            <div style={{
                width: '100%', height: '100%',
                background: '#1e293b',
                position: 'relative', overflow: 'visible' // visible for popouts if needed
            }}>

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
                    padding: '8px'
                }}>
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

                    {/* Top Label */}
                    <div style={{
                        alignSelf: 'flex-start',
                        background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4,
                        fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        {unitConfig[unit.type].label.toUpperCase()}
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
                </div>

                {/* Side Walls (Structure) */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, background: '#334155', borderRight: '1px solid #1e293b' }}></div>
                <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 4, background: '#334155', borderLeft: '1px solid #1e293b' }}></div>

            </div>
        </div>
    );
}
