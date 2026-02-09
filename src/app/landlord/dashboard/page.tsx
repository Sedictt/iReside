"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Users,
    Building2,
    DollarSign,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Loader2,
    Filter,
    MoreHorizontal
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
    iconColor: 'blue' | 'green' | 'purple' | 'orange';
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
                <Loader2 size={32} className={styles.spinner} />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* KPI Section */}
            <div className={styles.statsGrid}>
                <StatCard
                    icon={<Users size={24} />}
                    iconColor="blue"
                    label="Active Tenants"
                    value={stats.activeTenants}
                    trend="+6.5% Since last week"
                    positive={true}
                />
                <StatCard
                    icon={<DollarSign size={24} />}
                    iconColor="green"
                    label="Revenue"
                    value={stats.revenue}
                    trend="-0.10% Since last week"
                    positive={false}
                />
                <StatCard
                    icon={<Building2 size={24} />}
                    iconColor="purple"
                    label="Occupancy"
                    value={stats.occupancy}
                    trend="-0.2% Since last week"
                    positive={false}
                />
                <StatCard
                    icon={<AlertCircle size={24} />}
                    iconColor="orange"
                    label="Pending Issues"
                    value={stats.pendingRequests}
                    trend="+11.5% Since last week"
                    positive={true}
                />
            </div>

            <div className={styles.mainGrid}>
                {/* Recent Inquiries */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Recent Requests</h2>
                        <div className={styles.cardActions}>
                            <button className={styles.textBtn}>View all</button>
                        </div>
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
                            message="I'd like to ask about the pet policy for the 2BR units."
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

                {/* Alerts & Maintenance */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Alerts & Maintenance</h2>
                        <button className={styles.filterBtn}>
                            <Filter size={14} />
                            Filter
                        </button>
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

            {/* Recent Invoices Table */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Recent Invoices</h2>
                    <div className={styles.cardActions}>
                        <button className={styles.filterBtn}>
                            <Filter size={14} />
                            Filter
                        </button>
                        <button className={styles.filterBtn}>
                            <MoreHorizontal size={14} />
                        </button>
                    </div>
                </div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>ID Invoice</th>
                                <th>Tenant Name</th>
                                <th>Property</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td>#065499</td>
                                <td>
                                    <div className={styles.tableAvatar}>
                                        <div className={styles.avatar}>E</div>
                                        Eren Yaeger
                                    </div>
                                </td>
                                <td>Sunset Heights - 302</td>
                                <td>21/07/2024</td>
                                <td><span className={`${styles.statusBadge} ${styles.paid}`}>Paid</span></td>
                                <td>₱8,500</td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td>#065500</td>
                                <td>
                                    <div className={styles.tableAvatar}>
                                        <div className={styles.avatar}>L</div>
                                        Levi Ackerman
                                    </div>
                                </td>
                                <td>Vista Residences - 105</td>
                                <td>21/07/2024</td>
                                <td><span className={`${styles.statusBadge} ${styles.pending}`}>Pending</span></td>
                                <td>₱12,000</td>
                            </tr>
                            <tr>
                                <td>3</td>
                                <td>#065501</td>
                                <td>
                                    <div className={styles.tableAvatar}>
                                        <div className={styles.avatar}>M</div>
                                        Mikasa Ackerman
                                    </div>
                                </td>
                                <td>Sunset Heights - 201</td>
                                <td>15/07/2024</td>
                                <td><span className={`${styles.statusBadge} ${styles.paid}`}>Paid</span></td>
                                <td>₱9,500</td>
                            </tr>
                            <tr>
                                <td>4</td>
                                <td>#065502</td>
                                <td>
                                    <div className={styles.tableAvatar}>
                                        <div className={styles.avatar}>A</div>
                                        Armin Arlert
                                    </div>
                                </td>
                                <td>Vista Residences - 308</td>
                                <td>10/07/2024</td>
                                <td><span className={`${styles.statusBadge} ${styles.overdue}`}>Overdue</span></td>
                                <td>₱15,000</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, iconColor, label, value, trend, positive }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.statCard}
        >
            <div className={styles.statMain}>
                <span className={styles.statLabel}>{label}</span>
                <span className={styles.statValue}>{value}</span>
                <div className={`${styles.trend} ${positive ? styles.positive : styles.negative}`}>
                    {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {trend}
                </div>
            </div>
            <div className={`${styles.statIcon} ${styles[iconColor]}`}>
                {icon}
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

    const statusClass = type === 'critical' ? styles.urgent :
        type === 'warning' ? styles.pending :
            styles.paid;

    return (
        <div className={styles.listItem}>
            <div
                className={styles.statusDot}
                style={{ backgroundColor: colors[type as keyof typeof colors] }}
            />
            <div className={styles.listContent}>
                <div className={styles.listMain}>
                    <span className={styles.alertTitle}>{title}</span>
                    <span className={`${styles.statusBadge} ${statusClass}`}>{status}</span>
                </div>
                <p className={styles.location}>{location}</p>
            </div>
        </div>
    );
}
