"use client";
import React, { useState, useEffect } from "react";
import { Bookmark, Plus, X, Trash2, MapPin } from "lucide-react";

const STORAGE_KEY = "vb_saved_views_";

export interface SavedView {
    id: string;
    name: string;
    scrollX: number;
    scrollY: number;
    zoom: number;
    floor?: number;
}

interface SavedViewsProps {
    propertyId: string;
    open: boolean;
    onClose: () => void;
    currentZoom: number;
    currentFloor: number;
    viewportRef: React.RefObject<HTMLDivElement | null>;
    onRestoreView: (view: SavedView) => void;
}

/**
 * Saved views / bookmarks per property. Store in localStorage.
 */
export default function SavedViews({
    propertyId,
    open,
    onClose,
    currentZoom,
    currentFloor,
    viewportRef,
    onRestoreView,
}: SavedViewsProps) {
    const [views, setViews] = useState<SavedView[]>([]);
    const [newName, setNewName] = useState("");

    const storageKey = STORAGE_KEY + propertyId;

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) setViews(JSON.parse(raw));
        } catch { /* ignore */ }
    }, [storageKey, open]);

    const persist = (updated: SavedView[]) => {
        setViews(updated);
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch { }
    };

    const handleSave = () => {
        const vp = viewportRef.current;
        if (!vp || !newName.trim()) return;
        const view: SavedView = {
            id: crypto.randomUUID(),
            name: newName.trim(),
            scrollX: vp.scrollLeft,
            scrollY: vp.scrollTop,
            zoom: currentZoom,
            floor: currentFloor,
        };
        persist([...views, view]);
        setNewName("");
    };

    const handleDelete = (id: string) => {
        persist(views.filter(v => v.id !== id));
    };

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            style={{
                position: "absolute",
                top: 60,
                right: 12,
                width: 280,
                background: "rgba(15, 23, 42, 0.96)",
                backdropFilter: "blur(12px)",
                borderRadius: 14,
                border: "1px solid #334155",
                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                zIndex: 100,
                overflow: "hidden",
            }}
        >
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.65rem 0.9rem",
                borderBottom: "1px solid #1e293b",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#f1f5f9", fontSize: "0.85rem" }}>
                    <Bookmark size={14} color="#6366f1" />
                    Saved Views
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 2 }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Add new view */}
            <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "0.5rem 0.75rem",
                borderBottom: "1px solid #1e293b",
            }}>
                <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                    placeholder="Bookmark name…"
                    style={{
                        flex: 1,
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: 6,
                        color: "#f1f5f9",
                        fontSize: "0.75rem",
                        padding: "0.35rem 0.5rem",
                        outline: "none",
                    }}
                />
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!newName.trim()}
                    style={{
                        width: 28, height: 28,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: newName.trim() ? "#6366f1" : "#1e293b",
                        border: "none",
                        borderRadius: 6,
                        color: "white",
                        cursor: newName.trim() ? "pointer" : "not-allowed",
                        opacity: newName.trim() ? 1 : 0.4,
                    }}
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* List */}
            <div style={{ maxHeight: 250, overflowY: "auto", padding: "4px 0" }}>
                {views.length === 0 && (
                    <div style={{ padding: "1rem", textAlign: "center", color: "#475569", fontSize: "0.75rem" }}>
                        No saved views yet
                    </div>
                )}
                {views.map(v => (
                    <div
                        key={v.id}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "0.45rem 0.75rem",
                        }}
                    >
                        <MapPin size={12} color="#818cf8" />
                        <button
                            type="button"
                            onClick={() => { onRestoreView(v); onClose(); }}
                            style={{
                                flex: 1,
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "#e2e8f0",
                                textAlign: "left",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                padding: 0,
                            }}
                        >
                            {v.name}
                            <span style={{ color: "#64748b", fontWeight: 400, marginLeft: 6, fontSize: "0.65rem" }}>
                                {Math.round(v.zoom * 100)}%
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDelete(v.id)}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: "#64748b", padding: 2,
                            }}
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
