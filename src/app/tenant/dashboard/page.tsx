"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import {
    Home,
    Calendar,
    Clock,
    CreditCard,
    Wrench,
    MessageSquare,
    AlertCircle,
    CheckCircle,
    TrendingUp,
    TrendingDown,
    Loader2,
    FileSignature,
    Bell,
    ChevronRight,
    MapPin
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import LeaseSigningModal from "@/components/tenant/LeaseSigningModal";

type Lease = {
    id: string;
    start_date: string;
    end_date: string;
    rent_amount: number;
    status: string;
    unit: {
        unit_number: string;
        property: {
            name: string;
            address: string;
        } | null;
    } | null;
    signature_url?: string | null;
};

type StatCardProps = {
    icon: React.ReactNode;
    iconColor: 'blue' | 'green' | 'purple' | 'orange';
    label: string;
    value: string;
    trend?: string;
    positive?: boolean;
};

export default function TenantDashboard() {
    const [leases, setLeases] = useState<Lease[]>([]);
    const [stats, setStats] = useState({
        rentAmount: "₱0",
        nextDue: "-",
        leaseStatus: "No Active Lease",
        requests: "0"
    });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Modal State
    const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);

    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }
        setUser(user);

        // Fetch Leases
        const { data: leasesData, error } = await supabase
            .from('leases')
            .select(`
                *,
                unit:units (
                    unit_number,
                    property:properties (
                        name,
                        address
                    )
                )
            `)
            .eq('tenant_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && leasesData) {
            const formattedLeases: Lease[] = leasesData.map((item: any) => ({
                id: item.id,
                start_date: item.start_date,
                end_date: item.end_date,
                rent_amount: item.rent_amount,
                status: item.status,
                signature_url: item.signature_url,
                unit: item.unit ? {
                    unit_number: item.unit.unit_number,
                    property: item.unit.property ? {
                        name: item.unit.property.name,
                        address: item.unit.property.address
                    } : null
                } : null
            }));
            setLeases(formattedLeases);

            // Calculate Stats
            const activeLease = formattedLeases.find(l => l.status === 'active');
            const pendingLease = formattedLeases.find(l => l.status === 'pending');

            setStats({
                rentAmount: activeLease ? `₱${activeLease.rent_amount.toLocaleString()}` : "₱0",
                nextDue: activeLease ? "Feb 15, 2026" : "-", // Mocked due date for now
                leaseStatus: activeLease ? "Active" : (pendingLease ? "Pending Signature" : "None"),
                requests: "0" // Mocked requests
            });
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleOpenSignModal = (lease: Lease) => {
        setSelectedLease(lease);
        setIsSignModalOpen(true);
    };

    const handleSignLease = async (signatureDataUrl: string) => {
        if (!selectedLease || !user) return;

        try {
            const fileName = `${user.id}/${selectedLease.id}_signature_${Date.now()}.png`;
            const { error: uploadError } = await supabase
                .storage
                .from('signatures')
                .upload(fileName, dataURLtoBlob(signatureDataUrl), {
                    contentType: 'image/png'
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase
                .storage
                .from('signatures')
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('leases')
                .update({
                    status: 'pending_landlord',
                    signature_url: publicUrl,
                    signed_at: new Date().toISOString()
                })
                .eq('id', selectedLease.id);

            if (updateError) throw updateError;

            setIsSignModalOpen(false);
            await fetchDashboardData();
            alert("Signed successfully! Waiting for landlord to countersign.");

        } catch (error: any) {
            console.error("Error signing lease:", error);
            alert(`Failed to sign lease: ${error.message}`);
        }
    };

    function dataURLtoBlob(dataurl: string) {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 size={32} className={styles.spinner} />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const activeLease = leases.find(l => l.status === 'active');
    const pendingLease = leases.find(l => l.status === 'pending');

    return (
        <div className={styles.container}>
            {/* Top Bar */}
            <div className={styles.topBar}>
                <div className={styles.welcomeUser}>
                    <h1>Hi, {user?.user_metadata?.full_name?.split(' ')[0] || 'My Tenant'} 👋</h1>
                    <p>Here's what's happening with your home</p>
                </div>
                <div className={styles.topActions}>
                    <button className={styles.notifBtn}>
                        <Bell size={20} />
                    </button>
                    <button className={styles.profileBtn}>
                        <div className={styles.profileAvatar}>
                            {user?.user_metadata?.full_name ? user.user_metadata.full_name[0] : 'T'}
                        </div>
                        <div className={styles.profileInfo}>
                            <span className={styles.profileName}>{user?.user_metadata?.full_name || 'Tenant Account'}</span>
                            <span className={styles.profileRole}>Tenant</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className={styles.statsGrid}>
                <StatCard
                    icon={<Home size={24} />}
                    iconColor="blue"
                    label="Current Home"
                    value={activeLease ? `Unit ${activeLease.unit?.unit_number}` : "No Unit"}
                    trend={activeLease ? activeLease.unit?.property?.name || "Property" : "Find a home"}
                    positive={true}
                />
                <StatCard
                    icon={<CreditCard size={24} />}
                    iconColor="green"
                    label="Rent Amount"
                    value={stats.rentAmount}
                    trend="Due Monthly"
                    positive={true}
                />
                <StatCard
                    icon={<Calendar size={24} />}
                    iconColor="purple"
                    label="Next Due Date"
                    value={stats.nextDue}
                    trend="On Track"
                    positive={true}
                />
                <StatCard
                    icon={<MessageSquare size={24} />}
                    iconColor="orange"
                    label="Open Requests"
                    value={stats.requests}
                    trend="Maintenance"
                    positive={false}
                />
            </div>

            <div className={styles.mainGrid}>
                {/* Left Column */}
                <div className={styles.column}>

                    {/* Pending Action Banner */}
                    {pendingLease && (
                        <div className={styles.leaseActionBanner} onClick={() => handleOpenSignModal(pendingLease)}>
                            <div className={styles.bannerContent}>
                                <FileSignature className={styles.bannerIcon} size={24} />
                                <div className={styles.bannerText}>
                                    <h4>Lease Signature Required</h4>
                                    <p>Please review and sign your lease for {pendingLease.unit?.property?.name}</p>
                                </div>
                            </div>
                            <ChevronRight className={styles.bannerIcon} size={20} />
                        </div>
                    )}

                    {/* Active Lease Details */}
                    {activeLease && (
                        <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>My Home</h2>
                                <span className={`${styles.statusBadge} ${styles.occupied}`}>Active Lease</span>
                            </div>
                            <div className={styles.list}>
                                <div className={styles.listItem} style={{ cursor: 'default' }}>
                                    <div className={styles.avatar} style={{ background: '#f1f5f9', color: '#64748b' }}>
                                        <Home size={20} />
                                    </div>
                                    <div className={styles.listContent}>
                                        <div className={styles.listMain}>
                                            <span className={styles.name}>{activeLease.unit?.property?.name}</span>
                                        </div>
                                        <p className={styles.message}>{activeLease.unit?.property?.address}</p>
                                    </div>
                                </div>
                                <div className={styles.listItem} style={{ cursor: 'default' }}>
                                    <div className={styles.avatar} style={{ background: '#f1f5f9', color: '#64748b' }}>
                                        <Calendar size={20} />
                                    </div>
                                    <div className={styles.listContent}>
                                        <div className={styles.listMain}>
                                            <span className={styles.name}>Lease Period</span>
                                        </div>
                                        <p className={styles.message}>
                                            {new Date(activeLease.start_date).toLocaleDateString()} - {new Date(activeLease.end_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Payments Table */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Recent Payments</h2>
                            <button className={styles.textBtn}>View all</button>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Jan 15, 2026</td>
                                        <td>Rent Payment - Jan</td>
                                        <td>₱{activeLease?.rent_amount.toLocaleString() || "0"}</td>
                                        <td><span className={`${styles.statusBadge} ${styles.paid}`}>Paid</span></td>
                                    </tr>
                                    <tr>
                                        <td>Dec 15, 2025</td>
                                        <td>Rent Payment - Dec</td>
                                        <td>₱{activeLease?.rent_amount.toLocaleString() || "0"}</td>
                                        <td><span className={`${styles.statusBadge} ${styles.paid}`}>Paid</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className={styles.column}>

                    {/* Quick Actions */}
                    <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Quick Actions</h2>
                        </div>
                        <div className={styles.actionGrid}>
                            <button className={styles.actionBtn} onClick={() => alert("Payments module coming soon!")}>
                                <div className={`${styles.actionBtnIcon} ${styles.greenIcon}`}>
                                    <CreditCard size={20} />
                                </div>
                                <span className={styles.actionBtnLabel}>Pay Rent</span>
                            </button>
                            <button className={styles.actionBtn} onClick={() => alert("Maintenance module coming soon!")}>
                                <div className={`${styles.actionBtnIcon} ${styles.orangeIcon}`}>
                                    <Wrench size={20} />
                                </div>
                                <span className={styles.actionBtnLabel}>Report Issue</span>
                            </button>
                            <button className={styles.actionBtn} onClick={() => router.push('/tenant/community')}>
                                <div className={`${styles.actionBtnIcon} ${styles.orangeIcon}`}>
                                    <MessageSquare size={20} />
                                </div>
                                <span className={styles.actionBtnLabel}>Neighbors</span>
                            </button>
                            <button className={styles.actionBtn} onClick={() => router.push('/search')}>
                                <div className={`${styles.actionBtnIcon} ${styles.blueIcon}`}>
                                    <Home size={20} />
                                </div>
                                <span className={styles.actionBtnLabel}>Browse</span>
                            </button>
                        </div>
                    </div>

                    {/* Notifications / Alerts Placeholder */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Notifications</h2>
                            <Bell size={16} className="text-gray-400" />
                        </div>
                        <div className={styles.list}>
                            <div className={styles.listItem} style={{ cursor: 'default' }}>
                                <div className={styles.statusDot} style={{ background: '#3b82f6' }} />
                                <div className={styles.listContent}>
                                    <div className={styles.listMain}>
                                        <span className={styles.name}>System</span>
                                        <span className={styles.time}>Just now</span>
                                    </div>
                                    <p className={styles.message}>Welcome to your new dashboard!</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Signature Modal */}
            {selectedLease && (
                <LeaseSigningModal
                    isOpen={isSignModalOpen}
                    onClose={() => setIsSignModalOpen(false)}
                    onSign={handleSignLease}
                    propertyName={selectedLease.unit?.property?.name || "Property"}
                    unitName={`Unit ${selectedLease.unit?.unit_number}`}
                    tenantName={user?.user_metadata?.full_name || "Tenant"}
                />
            )}
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
