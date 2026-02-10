"use client";
import { useCallback, useEffect, useRef } from "react";

const STORAGE_PREFIX = "vb_viewport_";

interface PersistedViewport {
    zoom: number;
    scrollX: number;
    scrollY: number;
}

/**
 * Persist zoom & scroll position per property so reopening restores them.
 */
export function usePersistedViewport(
    propertyId: string,
    viewportRef: React.RefObject<HTMLDivElement | null>,
    zoom: number,
    setZoom: (z: number) => void
) {
    const restoredRef = useRef(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Restore on mount
    useEffect(() => {
        if (restoredRef.current) return;
        restoredRef.current = true;
        try {
            const raw = localStorage.getItem(STORAGE_PREFIX + propertyId);
            if (!raw) return;
            const saved: PersistedViewport = JSON.parse(raw);
            if (saved.zoom) setZoom(saved.zoom);
            // Defer scroll until after first paint
            requestAnimationFrame(() => {
                if (viewportRef.current) {
                    viewportRef.current.scrollLeft = saved.scrollX ?? 0;
                    viewportRef.current.scrollTop = saved.scrollY ?? 0;
                }
            });
        } catch { /* ignore corrupt data */ }
    }, [propertyId, setZoom, viewportRef]);

    // Persist on scroll/zoom changes (debounced)
    const persist = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const vp = viewportRef.current;
            if (!vp) return;
            const data: PersistedViewport = {
                zoom,
                scrollX: vp.scrollLeft,
                scrollY: vp.scrollTop,
            };
            try { localStorage.setItem(STORAGE_PREFIX + propertyId, JSON.stringify(data)); } catch { }
        }, 400);
    }, [zoom, propertyId, viewportRef]);

    // Listen for scroll
    useEffect(() => {
        const vp = viewportRef.current;
        if (!vp) return;
        const handler = () => persist();
        vp.addEventListener("scroll", handler, { passive: true });
        return () => vp.removeEventListener("scroll", handler);
    }, [persist, viewportRef]);

    // Persist on zoom change
    useEffect(() => { persist(); }, [zoom, persist]);
}
