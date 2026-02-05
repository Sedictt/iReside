"use client";

import { useEffect, useRef, useState } from "react";
import { X, Eraser } from "lucide-react";
import styles from "./LandlordSigningModal.module.css";

interface LandlordSigningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSign: (signatureDataUrl: string) => void;
    tenantName: string;
    propertyName: string;
}

export default function LandlordSigningModal({
    isOpen,
    onClose,
    onSign,
    tenantName,
    propertyName
}: LandlordSigningModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                const parent = canvas.parentElement;
                if (parent) {
                    canvas.width = parent.offsetWidth;
                    canvas.height = parent.offsetHeight;
                }
                ctx.lineWidth = 2;
                ctx.lineCap = "round";
                ctx.strokeStyle = "#1e293b";
            }
        }
    }, [isOpen]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        setIsDrawing(true);
        setHasSignature(true);
        const { x, y } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const { x, y } = getCoordinates(e, canvas);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                setHasSignature(false);
            }
        }
    };

    const handleSign = () => {
        if (!hasSignature || !canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL("image/png");
        onSign(dataUrl);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>Countersign Lease</h3>
                    <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                </div>
                <div className={styles.content}>
                    <p className={styles.description}>
                        You are countersigning the lease for <strong>{tenantName}</strong> at <strong>{propertyName}</strong>.
                    </p>
                    <div className={styles.canvasContainer}>
                        <canvas
                            ref={canvasRef}
                            className={styles.canvas}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                        {!hasSignature && <div className={styles.placeholder}>Landlord Sign Here</div>}
                    </div>
                    <div className={styles.controls}>
                        <button className={styles.clearBtn} onClick={clearSignature}><Eraser size={14} /> Clear</button>
                    </div>
                </div>
                <div className={styles.footer}>
                    <button className={styles.signBtn} onClick={handleSign} disabled={!hasSignature}>
                        Confirm Signature
                    </button>
                </div>
            </div>
        </div>
    );
}
