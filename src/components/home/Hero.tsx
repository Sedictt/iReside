"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Building2, User } from "lucide-react";
import styles from "../../app/page.module.css";

export function Hero() {
    return (
        <>
            <div className={styles.header}>
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="title"
                    style={{ fontSize: '3.5rem', marginBottom: '1.5rem', lineHeight: 1.1 }}
                >
                    Living Made Simple.
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="subtitle"
                >
                    The all-in-one platform for modern living. Seamlessly connect landlords and tenants.
                </motion.p>
            </div>

            <div className={styles.grid}>
                <Link href="/login" className={styles.cardLink}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="glass-panel"
                        style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                        <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#4f46e5' }}>
                            <User size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--foreground)' }}>I am a Tenant</h2>
                        <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem', flex: 1 }}>
                            Find your next home, manage payments, and report issues instantly.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', color: '#4f46e5', fontWeight: 600 }}>
                            Get Started <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                        </div>
                    </motion.div>
                </Link>

                <Link href="/login" className={styles.cardLink}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="glass-panel"
                        style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                        <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                            <Building2 size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--foreground)' }}>I am a Landlord</h2>
                        <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem', flex: 1 }}>
                            Manage units visually, track payments, and organize your properties.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', color: '#059669', fontWeight: 600 }}>
                            Go to Dashboard <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                        </div>
                    </motion.div>
                </Link>
            </div>
        </>
    );
}
