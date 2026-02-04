"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import {
    User,
    Building2,
    Mail,
    Phone,
    MapPin,
    FileText,
    Upload,
    Check,
    Clock,
    X,
    ArrowRight,
    Loader2,
    Home,
    Shield,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    LogOut,
    LayoutDashboard,
    Settings
} from "lucide-react";
import Link from "next/link";
import styles from "./account.module.css";

type UserProfile = {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    role: "tenant" | "landlord" | "admin";
    created_at: string;
};

type LandlordApplication = {
    id: string;
    status: "pending" | "approved" | "rejected" | "under_review";
    business_name: string | null;
    business_address: string;
    phone: string;
    government_id_url: string;
    property_document_url: string | null;
    rejection_reason: string | null;
    submitted_at: string;
    reviewed_at: string | null;
};

export default function AccountPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [application, setApplication] = useState<LandlordApplication | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const supabase = createClient();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            window.location.href = "/login";
            return;
        }

        // Fetch profile
        const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (profileData) {
            setProfile({
                ...profileData,
                email: user.email || "",
            });
        } else {
            setProfile({
                id: user.id,
                full_name: user.user_metadata?.full_name || null,
                email: user.email || "",
                phone: null,
                role: "tenant",
                created_at: user.created_at,
            });
        }

        // Fetch existing application
        const { data: appData } = await supabase
            .from("landlord_applications")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (appData) {
            setApplication(appData);
        }

        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 size={48} className={styles.spinner} />
                <p>Loading your account...</p>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <main className={styles.container}>
            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <Link href="/" className={styles.backLink}>
                        <Home size={16} />
                        <span>Back to Home</span>
                    </Link>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className={styles.title}>My Account</h1>
                        <p className={styles.subtitle}>
                            Manage your personal information, security settings, and platform preferences.
                        </p>
                    </motion.div>
                </div>

                <div className={styles.grid}>
                    {/* Left Column: Profile Card */}
                    <motion.aside
                        className={`${styles.card} ${styles.profileCard}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <div className={styles.avatarRing}>
                            <div className={styles.avatar}>
                                {profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
                            </div>
                        </div>

                        <div className={styles.profileName}>
                            <h2>{profile.full_name || "User"}</h2>
                            <p>{profile.email}</p>
                        </div>

                        <div className={`${styles.roleBadge} ${styles[profile.role]}`}>
                            {profile.role === "landlord" ? <Shield size={14} /> : <User size={14} />}
                            <span>{profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</span>
                        </div>

                        <div className={styles.contactInfo}>
                            <div className={styles.infoItem}>
                                <Mail size={16} className={styles.infoIcon} />
                                <span>{profile.email}</span>
                            </div>
                            {profile.phone && (
                                <div className={styles.infoItem}>
                                    <Phone size={16} className={styles.infoIcon} />
                                    <span>{profile.phone}</span>
                                </div>
                            )}
                            <div className={styles.infoItem}>
                                <Clock size={16} className={styles.infoIcon} />
                                <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <button
                            className={styles.logoutBtn}
                            onClick={async () => {
                                await supabase.auth.signOut();
                                window.location.href = "/";
                            }}
                        >
                            <LogOut size={18} />
                            <span>Sign Out</span>
                        </button>
                    </motion.aside>

                    {/* Right Column: Content */}
                    <motion.div
                        className={styles.mainContent}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        {/* Quick Actions */}
                        <section>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--foreground)' }}>Quick Actions</h3>
                            <div className={styles.actionsGrid}>
                                {profile.role === "landlord" ? (
                                    <>
                                        <Link href="/landlord/dashboard" className={styles.actionCard}>
                                            <div className={styles.actionContent}>
                                                <div className={styles.actionIcon}>
                                                    <LayoutDashboard size={20} />
                                                </div>
                                                <div className={styles.actionText}>
                                                    <span className={styles.actionTitle}>Dashboard</span>
                                                    <span className={styles.actionDesc}>Manage properties</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-400" />
                                        </Link>
                                        <Link href="/landlord/settings" className={styles.actionCard}>
                                            <div className={styles.actionContent}>
                                                <div className={styles.actionIcon}>
                                                    <Settings size={20} />
                                                </div>
                                                <div className={styles.actionText}>
                                                    <span className={styles.actionTitle}>Settings</span>
                                                    <span className={styles.actionDesc}>Platform preferences</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-400" />
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/tenant/search" className={styles.actionCard}>
                                            <div className={styles.actionContent}>
                                                <div className={styles.actionIcon}>
                                                    <Home size={20} />
                                                </div>
                                                <div className={styles.actionText}>
                                                    <span className={styles.actionTitle}>Find Home</span>
                                                    <span className={styles.actionDesc}>Browse listings</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-400" />
                                        </Link>
                                        <Link href="/tenant/applications" className={styles.actionCard}>
                                            <div className={styles.actionContent}>
                                                <div className={styles.actionIcon}>
                                                    <FileText size={20} />
                                                </div>
                                                <div className={styles.actionText}>
                                                    <span className={styles.actionTitle}>Applications</span>
                                                    <span className={styles.actionDesc}>View status</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-400" />
                                        </Link>
                                    </>
                                )}
                            </div>
                        </section>

                        {/* Banner & Application Logic */}
                        {profile.role === "landlord" ? (
                            <section className={styles.card}>
                                <div className={styles.statusHeader} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', marginBottom: 0 }}>
                                    <CheckCircle2 size={24} />
                                    <span>Verified Landlord Account</span>
                                </div>
                                <div style={{ padding: '1.5rem 0 0 0' }}>
                                    <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                                        You have full access to list properties, manage tenants, and view financial reports.
                                    </p>
                                    <Link href="/landlord/dashboard">
                                        <button className={styles.submitBtn}>
                                            Go to Dashboard <ArrowRight size={18} />
                                        </button>
                                    </Link>
                                </div>
                            </section>
                        ) : (
                            // Tenant View
                            <>
                                {!application && !showApplicationForm && (
                                    <section className={`${styles.card} ${styles.promoCard}`}>
                                        <div className={styles.promoContent}>
                                            <div className={styles.promoText}>
                                                <h2>Become a Landlord</h2>
                                                <p>Unlock professional tools to manage your properties efficiently.</p>
                                                <div className={styles.featureList}>
                                                    <div className={styles.featureItem}>
                                                        <CheckCircle2 size={18} className={styles.featureIcon} />
                                                        List unlimited properties
                                                    </div>
                                                    <div className={styles.featureItem}>
                                                        <CheckCircle2 size={18} className={styles.featureIcon} />
                                                        Automated rent collection
                                                    </div>
                                                    <div className={styles.featureItem}>
                                                        <CheckCircle2 size={18} className={styles.featureIcon} />
                                                        Tenant screening & insights
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <button onClick={() => setShowApplicationForm(true)} className={styles.applyButton}>
                                                    Start Application <ArrowRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                <AnimatePresence mode="wait">
                                    {showApplicationForm && !application && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <section className={styles.card}>
                                                <LandlordApplicationForm
                                                    userId={profile.id}
                                                    onSuccess={() => {
                                                        setShowApplicationForm(false);
                                                        fetchData();
                                                    }}
                                                    onCancel={() => setShowApplicationForm(false)}
                                                />
                                            </section>
                                        </motion.div>
                                    )}

                                    {application && (
                                        <motion.section
                                            className={styles.card}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            <h3>Application Status</h3>
                                            <ApplicationStatus application={application} onReapply={() => setShowApplicationForm(true)} />
                                        </motion.section>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </motion.div>
                </div>
            </div>
        </main>
    );
}

function ApplicationStatus({ application, onReapply }: { application: LandlordApplication; onReapply: () => void }) {
    const statusConfig = {
        pending: { icon: Clock, color: "#f59e0b", label: "Pending Review", bg: "rgba(245, 158, 11, 0.1)" },
        under_review: { icon: FileText, color: "#3b82f6", label: "Under Review", bg: "rgba(59, 130, 246, 0.1)" },
        approved: { icon: Check, color: "#10b981", label: "Approved", bg: "rgba(16, 185, 129, 0.1)" },
        rejected: { icon: X, color: "#ef4444", label: "Rejected", bg: "rgba(239, 68, 68, 0.1)" },
    };

    const config = statusConfig[application.status];
    const Icon = config.icon;

    return (
        <div style={{ marginTop: '1rem' }}>
            <div className={styles.statusHeader} style={{ background: config.bg, color: config.color }}>
                <Icon size={20} />
                <span>{config.label}</span>
            </div>

            <div className={styles.statusDetails}>
                <div className={styles.detailItem}>
                    <label>Submitted On</label>
                    <span>{new Date(application.submitted_at).toLocaleDateString()}</span>
                </div>
                {application.business_name && (
                    <div className={styles.detailItem}>
                        <label>Business Name</label>
                        <span>{application.business_name}</span>
                    </div>
                )}
                <div className={styles.detailItem}>
                    <label>Address</label>
                    <span>{application.business_address}</span>
                </div>
            </div>

            {application.status === "rejected" && (
                <div className={styles.rejection}>
                    <AlertCircle size={20} />
                    <div>
                        <strong>Reason for rejection</strong>
                        <p style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>{application.rejection_reason || "No reason provided"}</p>
                    </div>
                </div>
            )}

            {application.status === "pending" && (
                <p style={{ marginTop: '1rem', color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
                    * We are currently reviewing your documents. This process typically takes 24-48 hours.
                </p>
            )}
        </div>
    );
}

function LandlordApplicationForm({
    userId,
    onSuccess,
    onCancel,
}: {
    userId: string;
    onSuccess: () => void;
    onCancel: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        businessName: "",
        businessAddress: "",
        phone: "",
    });
    const [governmentId, setGovernmentId] = useState<File | null>(null);
    const [propertyDoc, setPropertyDoc] = useState<File | null>(null);

    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            if (!governmentId) throw new Error("Government ID is required");

            const govIdPath = `${userId}/government_id_${Date.now()}`;
            const { error: govIdError } = await supabase.storage
                .from("applications")
                .upload(govIdPath, governmentId);

            if (govIdError) throw new Error("Failed to upload government ID");

            const { data: govIdUrl } = supabase.storage
                .from("applications")
                .getPublicUrl(govIdPath);

            let propertyDocUrl = null;
            if (propertyDoc) {
                const propDocPath = `${userId}/property_doc_${Date.now()}`;
                const { error: propDocError } = await supabase.storage
                    .from("applications")
                    .upload(propDocPath, propertyDoc);

                if (propDocError) throw new Error("Failed to upload property document");

                const { data } = supabase.storage
                    .from("applications")
                    .getPublicUrl(propDocPath);
                propertyDocUrl = data.publicUrl;
            }

            const { error: insertError } = await supabase
                .from("landlord_applications")
                .insert({
                    user_id: userId,
                    business_name: formData.businessName || null,
                    business_address: formData.businessAddress,
                    phone: formData.phone,
                    government_id_url: govIdUrl.publicUrl,
                    property_document_url: propertyDocUrl,
                    status: "pending",
                });

            if (insertError) throw new Error(insertError.message);

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className={styles.formHeader}>
                <h3>Landlord Application</h3>
                <p style={{ color: 'var(--muted-foreground)' }}>Please provide your business verify your identity.</p>
            </div>

            {error && (
                <div style={{ background: '#fef2f2', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label>Business Name (Optional)</label>
                    <input
                        type="text"
                        placeholder="Company or Property Name"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label>Contact Phone *</label>
                    <input
                        type="tel"
                        placeholder="+63 900 000 0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                    />
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label>Business Address *</label>
                    <input
                        type="text"
                        placeholder="Full business address"
                        value={formData.businessAddress}
                        onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label>Government ID *</label>
                    <div className={styles.fileUpload}>
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setGovernmentId(e.target.files?.[0] || null)}
                            required
                        />
                        <div className={styles.uploadPlaceholder}>
                            {governmentId ? (
                                <>
                                    <Check size={18} color="var(--success)" />
                                    <span style={{ color: 'var(--success)' }}>{governmentId.name}</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    <span>Upload ID</span>
                                </>
                            )}
                        </div>
                    </div>
                    <span className={styles.hint}>Passport, Driver's License, or National ID</span>
                </div>

                <div className={styles.formGroup}>
                    <label>Supporting Document (Optional)</label>
                    <div className={styles.fileUpload}>
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setPropertyDoc(e.target.files?.[0] || null)}
                        />
                        <div className={styles.uploadPlaceholder}>
                            {propertyDoc ? (
                                <>
                                    <Check size={18} color="var(--success)" />
                                    <span style={{ color: 'var(--success)' }}>{propertyDoc.name}</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    <span>Upload Doc</span>
                                </>
                            )}
                        </div>
                    </div>
                    <span className={styles.hint}>Business Permit, Tax Declaration, etc.</span>
                </div>
            </div>

            <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 size={18} className={styles.spinner} /> : "Submit Application"}
                </button>
            </div>
        </form>
    );
}
