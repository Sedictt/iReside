"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchUnit {
    id: string;
    unitNumber?: string;
    tenantName?: string;
    gridX: number;
    gridY: number;
    type: string;
    status: string;
}

interface CanvasSearchProps {
    units: SearchUnit[];
    open: boolean;
    onClose: () => void;
    onHighlight: (unitId: string) => void;
    onPanTo: (gridX: number, gridY: number) => void;
}

/**
 * In-canvas search by unit number or tenant name with highlight & pan-to.
 */
export default function CanvasSearch({ units, open, onClose, onHighlight, onPanTo }: CanvasSearchProps) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setQuery("");
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    // Filter
    const q = query.trim().toLowerCase();
    const results = q.length === 0 ? [] : units.filter(u => {
        if (u.type === "stairs") return false;
        const num = (u.unitNumber ?? "").toLowerCase();
        const name = (u.tenantName ?? "").toLowerCase();
        return num.includes(q) || name.includes(q);
    }).slice(0, 12);

    const handleSelect = (u: SearchUnit) => {
        onHighlight(u.id);
        onPanTo(u.gridX, u.gridY);
        onClose();
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
                left: "50%",
                transform: "translateX(-50%)",
                width: 340,
                background: "rgba(15, 23, 42, 0.96)",
                backdropFilter: "blur(12px)",
                borderRadius: 14,
                border: "1px solid #334155",
                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                zIndex: 100,
                overflow: "hidden",
            }}
        >
            {/* Search Field */}
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "0.65rem 0.9rem",
                borderBottom: "1px solid #1e293b",
            }}>
                <Search size={16} color="#64748b" />
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search unit number or tenant…"
                    style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#f1f5f9",
                        fontSize: "0.85rem",
                    }}
                />
                <button
                    type="button"
                    onClick={onClose}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 2 }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div style={{ maxHeight: 280, overflowY: "auto", padding: "4px 0" }}>
                    {results.map(u => {
                        const statusColor =
                            u.status === "occupied" ? "#fbbf24" :
                            u.status === "maintenance" ? "#eab308" :
                            u.status === "neardue" ? "#ef4444" :
                            "#64748b";

                        return (
                            <button
                                key={u.id}
                                type="button"
                                onClick={() => handleSelect(u)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    width: "100%",
                                    padding: "0.55rem 0.9rem",
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#f1f5f9",
                                    textAlign: "left",
                                    transition: "background 0.12s",
                                }}
                                onMouseOver={e => (e.currentTarget.style.background = "rgba(99,102,241,0.12)")}
                                onMouseOut={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <div style={{
                                    width: 8, height: 8, borderRadius: "50%",
                                    background: statusColor, flexShrink: 0,
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: "0.8rem" }}>
                                        #{u.unitNumber || "—"}
                                        {u.tenantName && (
                                            <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 6 }}>{u.tenantName}</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: "0.65rem", color: "#64748b" }}>
                                        Floor {u.gridY} • Col {u.gridX} • {u.type}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
            {q.length > 0 && results.length === 0 && (
                <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "0.8rem" }}>
                    No units found
                </div>
            )}
        </div>
    );
}
