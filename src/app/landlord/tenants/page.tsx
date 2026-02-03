
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Users, Search, Sparkles, TrendingUp, AlertCircle, CalendarClock, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import styles from "./tenants.module.css";
import { motion, AnimatePresence } from "framer-motion";

type TenantProfile = {
    id: string;
    full_name: string | null;
    email: string | null;
};

type Lease = {
    id: string;
    unit_id: string;
    start_date: string;
    end_date: string;
    status: string;
    rent_amount: number;
    profiles: TenantProfile | null;
    units: {
        unit_number: string;
        properties: {
            name: string;
        } | null;
    } | null;
};

type AIInsight = {
    type: 'risk' | 'opportunity' | 'status';
    title: string;
    value: string;
    description: string;
    icon: any;
    color: string;
};

export default function TenantsPage() {
    const [leases, setLeases] = useState<Lease[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAI, setShowAI] = useState(false);
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const supabase = useMemo(() => createClient(), []);

    const fetchTenants = useCallback(async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsLoading(false);
            return;
        }

        // Fetch active leases with related data
        // Note: In a real app, you'd filter by landlord properties. 
        // For this demo, we assume the user has access to these leases.
        const { data } = await supabase
            .from('leases')
            .select(`
                *,
                profiles:tenant_id (*),
                units (
                    unit_number,
                    properties (name)
                )
            `)
            .eq('status', 'active');

        if (data) {
            setLeases(data as any);
        }
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    const runAIAnalysis = async () => {
        if (showAI) {
            setShowAI(false);
            return;
        }

        setIsAnalyzing(true);
        setShowAI(true);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock Logic for Demo
        const expiringSoon = leases.filter(l => {
            const end = new Date(l.end_date);
            const now = new Date();
            const days = (end.getTime() - now.getTime()) / (1000 * 3600 * 24);
            return days < 60;
        }).length;

        const totalRent = leases.reduce((sum, l) => sum + l.rent_amount, 0);
        const avgRent = leases.length > 0 ? totalRent / leases.length : 0;

        const newInsights: AIInsight[] = [
            {
                type: 'risk',
                title: 'Churn Risk',
                value: `${expiringSoon} Tenants`,
                description: 'Leases expiring in the next 60 days. Propose renewal offers now.',
                icon: AlertCircle,
                color: '#ef4444'
            },
            {
                type: 'opportunity',
                title: 'Revenue Potential',
                value: `+5-10%`,
                description: 'Market analysis suggests room for rent increase in 3 units.',
                icon: TrendingUp,
                color: '#10b981'
            },
            {
                type: 'status',
                title: 'Tenant Health',
                value: '94/100',
                description: 'Based on payment reliability and communication history.',
                icon: ShieldCheck,
                color: '#3b82f6'
            }
        ];

        setInsights(newInsights);
        setIsAnalyzing(false);
    };

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 className={styles.spinner} size={32} />
                <p>Loading tenant directory...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        <Users size={32} />
                        Tenant Directory
                    </h1>
                    <p className={styles.subtitle}>View and manage your active lease agreements.</p>
                </div>
                <button
                    className={styles.aiButton}
                    onClick={runAIAnalysis}
                >
                    <Sparkles size={18} />
                    {showAI ? 'Hide Insights' : 'AI Analysis'}
                </button>
            </header>

            <AnimatePresence>
                {showAI && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: '2rem' }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className={styles.aiPanel}>
                            {isAnalyzing ? (
                                <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '1rem', color: '#6d28d9' }}>
                                    <Loader2 className="animate-spin" />
                                    <span>Analyzing tenant data and lease histories...</span>
                                </div>
                            ) : (
                                insights.map((insight, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={styles.insightCard}
                                    >
                                        <div className={styles.insightHeader} style={{ color: insight.color }}>
                                            <insight.icon size={16} />
                                            {insight.title}
                                        </div>
                                        <div className={styles.insightValue}>{insight.value}</div>
                                        <div className={styles.insightDesc}>{insight.description}</div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Tenant Name</th>
                            <th>Contact</th>
                            <th>Property / Unit</th>
                            <th>Lease Period</th>
                            <th>Monthly Rent</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leases.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                                    <Users size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                    <p>No active tenants found.</p>
                                </td>
                            </tr>
                        ) : (
                            leases.map(lease => (
                                <tr key={lease.id}>
                                    <td>
                                        <div className={styles.tenantName}>
                                            {lease.profiles?.full_name || 'Unknown Tenant'}
                                        </div>
                                    </td>
                                    <td className={styles.tenantEmail}>
                                        {lease.profiles?.email || '-'}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>
                                            {lease.units?.properties?.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                            Unit {lease.units?.unit_number}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.875rem' }}>
                                            {new Date(lease.start_date).toLocaleDateString()} - <br />
                                            {new Date(lease.end_date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        ₱{lease.rent_amount.toLocaleString()}
                                    </td>
                                    <td>
                                        <span className={styles.statusBadge} style={{ background: '#dcfce7', color: '#166534' }}>
                                            Active
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
