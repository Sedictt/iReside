"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Users,
    Building2,
    DollarSign,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Loader2
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import styles from "./dashboard.module.css";

type UnitStatusDb = 'available' | 'occupied' | 'maintenance' | 'neardue';

type UnitRow = {
    status: UnitStatusDb;
    rent_amount: number | string | null;
};

type PropertyRow = {
    units?: UnitRow[];
};

type StatCardProps = {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend: string;
    positive: boolean;
};

type InquiryItemProps = {
    name: string;
    property: string;
    message: string;
    time: string;
};

type AlertType = 'critical' | 'warning' | 'info';

type AlertItemProps = {
    type: AlertType;
    title: string;
    location: string;
    status: string;
};

export default function LandlordDashboard() {
    const [stats, setStats] = useState({
        revenue: "₱0",
        occupancy: "0%",
        activeTenants: "0",
        pendingRequests: "0"
    });
    const [isLoading, setIsLoading] = useState(true);
    const supabase = useMemo(() => createClient(), []);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsLoading(false);
            return;
        }

        // Fetch properties with units
        const { data: properties } = await supabase
            .from('properties')
            .select('*, units(*)');

        if (properties) {
            let totalRevenue = 0;
            let occupiedUnits = 0;
            let totalUnits = 0;
            let maintenanceUnits = 0;

            properties.forEach((property: PropertyRow) => {
                property.units?.forEach((unit: UnitRow) => {
                    totalUnits++;
                    if (unit.status === 'occupied' || unit.status === 'neardue') {
                        occupiedUnits++;
                        totalRevenue += Number(unit.rent_amount) || 0;
                    }
                    if (unit.status === 'maintenance' || unit.status === 'neardue') {
                        maintenanceUnits++;
                    }
                });
            });

            const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

            setStats({
                revenue: `₱${totalRevenue.toLocaleString()}`,
                occupancy: `${occupancyRate}%`,
                activeTenants: occupiedUnits.toString(),
                pendingRequests: maintenanceUnits.toString()
            });
        }
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 className={styles.spinner} />
                <p>Calculating your dashboard...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Overview</h1>
                    <p className={styles.subtitle}>Welcome back! Here&apos;s what&apos;s happening today.</p>
                </div>
                <div className={styles.dateDisplay}>
                    <Clock size={16} />
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            </header>

            {/* KPI Section */}
            <div className={styles.statsGrid}>
                <StatCard
                    icon={<DollarSign size={20} />}
                    label="Monthly Revenue"
                    value={stats.revenue}
                    trend="+0%"
                    positive={true}
                />
                <StatCard
                    icon={<Building2 size={20} />}
                    label="Occupancy Rate"
                    value={stats.occupancy}
                    trend="+0%"
                    positive={true}
                />
                <StatCard
                    icon={<Users size={20} />}
                    label="Active Tenants"
                    value={stats.activeTenants}
                    trend="0%"
                    positive={true}
                />
                <StatCard
                    icon={<AlertCircle size={20} />}
                    label="Pending Issues"
                    value={stats.pendingRequests}
                    trend="0"
                    positive={false}
                />
            </div>

            <div className={styles.mainGrid}>
                {/* Recent Activity/Inquiries */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Recent Inquiries</h2>
                        <button className={styles.textBtn}>View all</button>
                    </div>
                    <div className={styles.list}>
                        <InquiryItem
                            name="Juan Dela Cruz"
                            property="Sunset Heights"
                            message="Is unit 302 still available for viewing tomorrow?"
                            time="2h ago"
                        />
                        <InquiryItem
                            name="Maria Clara"
                            property="Vista Residences"
                            message="I&apos;d like to ask about the pet policy for the 2BR units."
                            time="5h ago"
                        />
                        <InquiryItem
                            name="Ricardo Dalisay"
                            property="Sunset Heights"
                            message="Sent the proof of payment for Feb rent."
                            time="1d ago"
                        />
                    </div>
                </div>

                {/* Maintenance Alerts */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Alerts & Maintenance</h2>
                    </div>
                    <div className={styles.list}>
                        <AlertItem
                            type="critical"
                            title="Leaking Pipe"
                            location="Sunset Heights - Unit 105"
                            status="Urgent"
                        />
                        <AlertItem
                            type="warning"
                            title="Lease Expiring"
                            location="Vista Residences - Unit 201"
                            status="In 15 days"
                        />
                        <AlertItem
                            type="info"
                            title="Elevator Maintenance"
                            location="Sunset Heights"
                            status="Scheduled: Feb 15"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, trend, positive }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.statCard}
        >
            <div className={styles.statIcon}>{icon}</div>
            <div className={styles.statContent}>
                <span className={styles.statLabel}>{label}</span>
                <span className={styles.statValue}>{value}</span>
            </div>
            <div className={`${styles.trend} ${positive ? styles.positive : styles.negative}`}>
                {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {trend}
            </div>
        </motion.div>
    );
}

function InquiryItem({ name, property, message, time }: InquiryItemProps) {
    return (
        <div className={styles.listItem}>
            <div className={styles.avatar}>{name[0]}</div>
            <div className={styles.listContent}>
                <div className={styles.listMain}>
                    <span className={styles.name}>{name}</span>
                    <span className={styles.time}>{time}</span>
                </div>
                <p className={styles.property}>{property}</p>
                <p className={styles.message}>{message}</p>
            </div>
        </div>
    );
}

function AlertItem({ type, title, location, status }: AlertItemProps) {
    const colors = {
        critical: "#ef4444",
        warning: "#f59e0b",
        info: "#3b82f6"
    };

    return (
        <div className={styles.listItem}>
            <div
                className={styles.statusDot}
                style={{ backgroundColor: colors[type as keyof typeof colors] }}
            />
            <div className={styles.listContent}>
                <div className={styles.listMain}>
                    <span className={styles.alertTitle}>{title}</span>
                    <span className={styles.statusBadge}>{status}</span>
                </div>
                <p className={styles.location}>{location}</p>
            </div>
        </div>
    );
}
