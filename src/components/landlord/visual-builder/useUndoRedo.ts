"use client";
import { useCallback, useRef, useState } from "react";

export interface UndoRedoStack<T> {
    push: (state: T) => void;
    undo: () => T | null;
    redo: () => T | null;
    canUndo: boolean;
    canRedo: boolean;
    clear: () => void;
}

const MAX_HISTORY = 60;

/**
 * Generic undo/redo hook.
 * Call `push(snapshot)` every time a meaningful change happens (add, delete, move, edit).
 * `undo()` / `redo()` return the state to restore (or null if nothing to undo/redo).
 */
export function useUndoRedo<T>(): UndoRedoStack<T> {
    const past = useRef<T[]>([]);
    const future = useRef<T[]>([]);
    const [, rerender] = useState(0);

    const push = useCallback((state: T) => {
        past.current.push(state);
        if (past.current.length > MAX_HISTORY) past.current.shift();
        future.current = [];
        rerender(n => n + 1);
    }, []);

    const undo = useCallback((): T | null => {
        if (past.current.length === 0) return null;
        const prev = past.current.pop()!;
        future.current.push(prev);
        rerender(n => n + 1);
        return prev;
    }, []);

    const redo = useCallback((): T | null => {
        if (future.current.length === 0) return null;
        const next = future.current.pop()!;
        past.current.push(next);
        rerender(n => n + 1);
        return next;
    }, []);

    const clear = useCallback(() => {
        past.current = [];
        future.current = [];
        rerender(n => n + 1);
    }, []);

    return {
        push,
        undo,
        redo,
        canUndo: past.current.length > 0,
        canRedo: future.current.length > 0,
        clear,
    };
}
