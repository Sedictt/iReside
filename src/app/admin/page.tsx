"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import {
    Shield,
    User,
    Building2,
    Check,
    X,
    Clock,
    FileText,
    Eye,
    Loader2,
    ChevronRight,
    AlertTriangle,
    ExternalLink
} from "lucide-react";
import Link from "next/link";
import styles from "./admin.module.css";

type LandlordApplication = {
    id: string;
    user_id: string;
    business_name: string | null;
    business_address: string;
    phone: string;
    government_id_url: string;
    property_document_url: string | null;
    status: "pending" | "approved" | "rejected" | "under_review";
    rejection_reason: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    user_email?: string;
    user_name?: string;
};

export default function AdminPage() {
    const [applications, setApplications] = useState<LandlordApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedApp, setSelectedApp] = useState<LandlordApplication | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const supabase = useMemo(() => createClient(), []);

    const fetchApplications = useCallback(async () => {
        const { data: apps } = await supabase
            .from("landlord_applications")
            .select("*")
            .order("submitted_at", { ascending: false });

        if (apps) {
            setApplications(apps);
        }
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = "/login";
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profile?.role !== "admin") {
                setIsAdmin(false);
                setIsLoading(false);
                return;
            }

            setIsAdmin(true);
            fetchApplications();
        };
        checkAdmin();
    }, [supabase, fetchApplications]);

    const handleApprove = async (appId: string, userId: string) => {
        setIsProcessing(true);

        // Update application status
        await supabase
            .from("landlord_applications")
            .update({
                status: "approved",
                reviewed_at: new Date().toISOString()
            })
            .eq("id", appId);

        // Update user role to landlord
        await supabase
            .from("profiles")
            .update({ role: "landlord" })
            .eq("id", userId);

        setSelectedApp(null);
        setIsProcessing(false);
        fetchApplications();
    };

    const handleReject = async (appId: string) => {
        if (!rejectionReason.trim()) {
            alert("Please provide a reason for rejection");
            return;
        }
        setIsProcessing(true);

        await supabase
            .from("landlord_applications")
            .update({
                status: "rejected",
                rejection_reason: rejectionReason,
                reviewed_at: new Date().toISOString()
            })
            .eq("id", appId);

        setSelectedApp(null);
        setRejectionReason("");
        setIsProcessing(false);
        fetchApplications();
    };

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 size={32} className={styles.spinner} />
                <p>Loading...</p>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className={styles.accessDenied}>
                <div className={styles.accessCard}>
                    <AlertTriangle size={48} className={styles.accessIcon} />
                    <h1>Admin Access Required</h1>
                    <p>You do not have permission to access this page.</p>
                    <Link href="/" className={styles.backBtn}>
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const pendingApps = applications.filter(a => a.status === "pending");
    const reviewedApps = applications.filter(a => a.status !== "pending");

    return (
        <main className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerIcon}>
                    <Shield size={24} />
                </div>
                <div>
                    <h1>Admin Dashboard</h1>
                    <p>Manage landlord applications</p>
                </div>
            </div>

            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <Clock size={20} />
                    <div>
                        <span className={styles.statValue}>{pendingApps.length}</span>
                        <span className={styles.statLabel}>Pending</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <Check size={20} />
                    <div>
                        <span className={styles.statValue}>
                            {applications.filter(a => a.status === "approved").length}
                        </span>
                        <span className={styles.statLabel}>Approved</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <X size={20} />
                    <div>
                        <span className={styles.statValue}>
                            {applications.filter(a => a.status === "rejected").length}
                        </span>
                        <span className={styles.statLabel}>Rejected</span>
                    </div>
                </div>
            </div>

            {/* Pending Applications */}
            <section className={styles.section}>
                <h2>Pending Applications</h2>
                {pendingApps.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Check size={32} />
                        <p>No pending applications</p>
                    </div>
                ) : (
                    <div className={styles.applicationList}>
                        {pendingApps.map(app => (
                            <div
                                key={app.id}
                                className={styles.applicationCard}
                                onClick={() => setSelectedApp(app)}
                            >
                                <div className={styles.appIcon}>
                                    <User size={20} />
                                </div>
                                <div className={styles.appInfo}>
                                    <h3>{app.business_name || "No Business Name"}</h3>
                                    <p>{app.business_address}</p>
                                    <span className={styles.appDate}>
                                        Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <ChevronRight size={20} className={styles.chevron} />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Review History */}
            <section className={styles.section}>
                <h2>Review History</h2>
                {reviewedApps.length === 0 ? (
                    <div className={styles.emptyState}>
                        <FileText size={32} />
                        <p>No reviewed applications yet</p>
                    </div>
                ) : (
                    <div className={styles.applicationList}>
                        {reviewedApps.map(app => (
                            <div key={app.id} className={`${styles.applicationCard} ${styles.reviewed}`}>
                                <div className={`${styles.appIcon} ${styles[app.status]}`}>
                                    {app.status === "approved" ? <Check size={20} /> : <X size={20} />}
                                </div>
                                <div className={styles.appInfo}>
                                    <h3>{app.business_name || "No Business Name"}</h3>
                                    <p>{app.business_address}</p>
                                    <span className={`${styles.statusBadge} ${styles[app.status]}`}>
                                        {app.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Application Detail Modal */}
            {selectedApp && (
                <div className={styles.modal} onClick={() => setSelectedApp(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h2>Application Details</h2>

                        <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                                <label>Business Name</label>
                                <span>{selectedApp.business_name || "N/A"}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Phone</label>
                                <span>{selectedApp.phone}</span>
                            </div>
                            <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                                <label>Business Address</label>
                                <span>{selectedApp.business_address}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Government ID</label>
                                <a
                                    href={selectedApp.government_id_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.docLink}
                                >
                                    <Eye size={16} />
                                    View Document
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                            {selectedApp.property_document_url && (
                                <div className={styles.detailItem}>
                                    <label>Property Document</label>
                                    <a
                                        href={selectedApp.property_document_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.docLink}
                                    >
                                        <Eye size={16} />
                                        View Document
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className={styles.rejectionInput}>
                            <label>Rejection Reason (if rejecting)</label>
                            <textarea
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder="Provide a reason if rejecting this application..."
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setSelectedApp(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.rejectBtn}
                                onClick={() => handleReject(selectedApp.id)}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 size={16} className={styles.spinner} /> : <X size={16} />}
                                Reject
                            </button>
                            <button
                                className={styles.approveBtn}
                                onClick={() => handleApprove(selectedApp.id, selectedApp.user_id)}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 size={16} className={styles.spinner} /> : <Check size={16} />}
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
