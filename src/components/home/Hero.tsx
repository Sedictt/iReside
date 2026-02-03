"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import styles from "../../app/page.module.css";
import { useEffect, useState } from "react";

export function Hero({ tenantHref, landlordHref }: { tenantHref: string; landlordHref: string }) {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Normalize mouse position from -1 to 1
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = (e.clientY / window.innerHeight) * 2 - 1;
            setMousePosition({ x, y });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className={styles.heroContent}>
            {/* Background Nebulas */}
            <div className={`${styles.nebula} ${styles.nebula1}`} />
            <div className={`${styles.nebula} ${styles.nebula2}`} />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className={styles.badgeNew}
            >
                <Star size={12} fill="#e2e8f0" />
                <span>Tenant Platform 2.0 is live</span>
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className={styles.heroTitle}
            >
                The operating system for <br />
                <span className={styles.heroHighlight}>modern real estate.</span>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className={styles.heroSubtitle}
            >
                Stop juggling spreadsheet files and WhatsApp messages.
                One unified platform for tenants to live happier and landlords to scale faster.
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className={styles.heroButtons}
            >
                <Link href={landlordHref} className="btn btn-primary btn-lg">
                    Manage Properties <ArrowRight size={18} />
                </Link>
                <Link href={tenantHref} className="btn btn-secondary-outline btn-lg" style={{ color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                    I&apos;m a Tenant
                </Link>
            </motion.div>

            {/* 3D Mockup Container */}
            <motion.div
                className={styles.mockupContainer}
                initial={{ opacity: 0, rotateX: 20, y: 50 }}
                animate={{ opacity: 1, rotateX: 5, y: 0 }}
                transition={{ duration: 1, delay: 0.4, type: "spring" }}
                style={{
                    transform: `rotateX(5deg) rotateY(${mousePosition.x * 2}deg)` // Subtle parallax
                }}
            >
                <div className={styles.mockupWindow}>
                    <div className={styles.mockupHeader}>
                        <div className={`${styles.dot} ${styles.dotRed}`} />
                        <div className={`${styles.dot} ${styles.dotYellow}`} />
                        <div className={`${styles.dot} ${styles.dotGreen}`} />
                    </div>
                    <div className={styles.mockupBody}>
                        {/* Placeholder for actual app screenshot or CSS construction */}
                        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem', height: '100%' }}>
                            {/* Sidebar Mock */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <div style={{ height: '2rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', width: '60%' }} />
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} style={{ height: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                                ))}
                            </div>

                            {/* Main Content Mock */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1, height: '150px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px' }} />
                                    <div style={{ flex: 1, height: '150px', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '8px' }} />
                                    <div style={{ flex: 1, height: '150px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
                                </div>
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

