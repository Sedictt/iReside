"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import {
    User,
    Mail,
    Phone,
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
    Settings,
    Building,
    Wallet,
    Bell,
    CreditCard
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
    is_name_private?: boolean | null;
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
    const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
    const [privacyError, setPrivacyError] = useState<string | null>(null);
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
                is_name_private: false,
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
                <Loader2 size={48} className={styles.loader} />
                <p>Loading your profile...</p>
            </div>
        );
    }

    if (!profile) return null;

    const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
    const avatarLetter = profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    const handlePrivacyToggle = async (nextValue: boolean) => {
        if (!profile) return;
        setIsSavingPrivacy(true);
        setPrivacyError(null);

        const { error } = await supabase
            .from("profiles")
            .update({ is_name_private: nextValue })
            .eq("id", profile.id);

        if (error) {
            console.error("Failed to update privacy setting:", error);
            setPrivacyError("Unable to update privacy setting. Please try again.");
        } else {
            setProfile({ ...profile, is_name_private: nextValue });
        }

        setIsSavingPrivacy(false);
    };

    return (
        <main className={styles.page}>
            <header className={styles.topBar}>
                <div className={styles.topBarContent}>
                    <Link href="/" className={styles.logoArea}>
                        <div className={styles.logoIcon}>
                            <Building size={18} />
                        </div>
                        <span>iReside</span>
                    </Link>
                    <div className={styles.navActions}>
                        <Link href="/" className={styles.navLink}>
                            <Home size={16} />
                            <span>Return to Home</span>
                        </Link>
                    </div>
                </div>
            </header>

            <div className={styles.shell}>
                <motion.header
                    className={styles.header}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div>
                        <h1 className={styles.headerTitle}>Profile Center</h1>
                        <p className={styles.headerSubtitle}>
                            Manage your personal information, privacy settings, and workspace preferences from one central hub.
                        </p>
                    </div>
                </motion.header>

                <motion.div
                    className={styles.contentGrid}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Sidebar */}
                    <aside className={styles.profileSidebar}>
                        <motion.div className={`${styles.card} ${styles.profileCard}`} variants={itemVariants}>
                            <div className={styles.avatarWrapper}>
                                <div className={styles.avatar}>{avatarLetter}</div>
                                <div className={styles.avatarBadge}>
                                    {profile.role === 'landlord' ? <Shield size={16} /> : <User size={16} />}
                                </div>
                            </div>

                            <div className={styles.userInfo}>
                                <h2>{profile.full_name || "User"}</h2>
                                <p>{profile.email}</p>
                            </div>

                            <div className={`${styles.roleTag} ${styles[profile.role]}`}>
                                {roleLabel}
                            </div>

                            <div className={styles.divider} />

                            <div className={styles.detailsList}>
                                <div className={styles.detailItem}>
                                    <Mail className={styles.detailIcon} />
                                    <span>{profile.email}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <Phone className={styles.detailIcon} />
                                    <span>{profile.phone || "No phone added"}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <Clock className={styles.detailIcon} />
                                    <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <button
                                className={styles.logoutButton}
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    window.location.href = "/";
                                }}
                            >
                                <LogOut size={18} />
                                <span>Sign Out</span>
                            </button>
                        </motion.div>
                    </aside>

                    {/* Main Content */}
                    <div className={styles.mainContent}>
                        {/* Status / Verification Section */}
                        <motion.section variants={itemVariants}>
                            {profile.role === "landlord" ? (
                                <div className={styles.verificationBanner}>
                                    <div className={styles.bannerContent}>
                                        <h3>Verified Landlord</h3>
                                        <p>You have full access to property management tools.</p>
                                    </div>
                                    <Link href="/landlord/dashboard">
                                        <button className={styles.bannerButton}>
                                            Go to Dashboard
                                        </button>
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    {!application && !showApplicationForm && (
                                        <div className={styles.upgradeCard}>
                                            <div className={styles.upgradeAccent} />
                                            <div className={styles.upgradeContent}>
                                                <div className={styles.upgradeText}>
                                                    <h3>Upgrade to Landlord</h3>
                                                    <p>Unlock professional tools to manage your properties, track income, and find great tenants.</p>
                                                    <div className={styles.featureChips}>
                                                        <div className={styles.featureChip}><CheckCircle2 size={14} /> Property Management</div>
                                                        <div className={styles.featureChip}><CheckCircle2 size={14} /> Financial Reports</div>
                                                        <div className={styles.featureChip}><CheckCircle2 size={14} /> Tenant Screening</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => setShowApplicationForm(true)} className={styles.upgradeButton}>
                                                    Start Application <ArrowRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <AnimatePresence mode="wait">
                                        {showApplicationForm && !application && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                            >
                                                <div className={styles.formPanel}>
                                                    <LandlordApplicationForm
                                                        userId={profile.id}
                                                        onSuccess={() => {
                                                            setShowApplicationForm(false);
                                                            fetchData();
                                                        }}
                                                        onCancel={() => setShowApplicationForm(false)}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}

                                        {application && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                            >
                                                <div className={styles.sectionTitle}>
                                                    <Shield size={20} />
                                                    <span>Application Status</span>
                                                </div>
                                                <ApplicationStatus application={application} onReapply={() => setShowApplicationForm(true)} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </motion.section>

                        {profile.role === "tenant" && (
                            <motion.section variants={itemVariants}>
                                <div className={styles.sectionTitle}>
                                    <Shield size={20} />
                                    <span>Privacy</span>
                                </div>
                                <div className={styles.privacyCard}>
                                    <div className={styles.privacyRow}>
                                        <div>
                                            <h3>Show my name on the Unit Map</h3>
                                            <p>When disabled, neighbors see "Resident" but can still message you.</p>
                                        </div>
                                        <label className={styles.switch}>
                                            <input
                                                type="checkbox"
                                                checked={!profile.is_name_private}
                                                onChange={(e) => handlePrivacyToggle(!e.target.checked)}
                                                disabled={isSavingPrivacy}
                                            />
                                            <span className={styles.slider} />
                                        </label>
                                    </div>
                                    {privacyError && <p className={styles.privacyError}>{privacyError}</p>}
                                </div>
                            </motion.section>
                        )}

                        {/* Quick Actions Grid */}
                        <motion.section variants={itemVariants}>
                            <div className={styles.sectionTitle}>
                                <LayoutDashboard size={20} />
                                <span>Quick Actions</span>
                            </div>
                            <div className={styles.actionsGrid}>
                                {profile.role === "landlord" ? (
                                    <>
                                        <Link href="/landlord/dashboard" className={styles.actionCard}>
                                            <div className={styles.actionIcon}><Building size={20} /></div>
                                            <div className={styles.actionInfo}>
                                                <h3>My Properties</h3>
                                                <p>Manage listings & units</p>
                                            </div>
                                            <ChevronRight size={16} className={styles.arrowIcon} />
                                        </Link>
                                        <Link href="/landlord/finances" className={styles.actionCard}>
                                            <div className={styles.actionIcon}><Wallet size={20} /></div>
                                            <div className={styles.actionInfo}>
                                                <h3>Finances</h3>
                                                <p>Track rent & expenses</p>
                                            </div>
                                            <ChevronRight size={16} className={styles.arrowIcon} />
                                        </Link>
                                        <Link href="/landlord/settings" className={styles.actionCard}>
                                            <div className={styles.actionIcon}><Settings size={20} /></div>
                                            <div className={styles.actionInfo}>
                                                <h3>Settings</h3>
                                                <p>Configure preferences</p>
                                            </div>
                                            <ChevronRight size={16} className={styles.arrowIcon} />
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/tenant/dashboard" className={styles.actionCard}>
                                            <div className={styles.actionIcon}><LayoutDashboard size={20} /></div>
                                            <div className={styles.actionInfo}>
                                                <h3>Dashboard</h3>
                                                <p>View your rental overview</p>
                                            </div>
                                            <ChevronRight size={16} className={styles.arrowIcon} />
                                        </Link>
                                        <Link href="/tenant/search" className={styles.actionCard}>
                                            <div className={styles.actionIcon}><Home size={20} /></div>
                                            <div className={styles.actionInfo}>
                                                <h3>Find a Home</h3>
                                                <p>Browse available properties</p>
                                            </div>
                                            <ChevronRight size={16} className={styles.arrowIcon} />
                                        </Link>
                                        <Link href="/tenant/messages" className={styles.actionCard}>
                                            <div className={styles.actionIcon}><Mail size={20} /></div>
                                            <div className={styles.actionInfo}>
                                                <h3>Messages</h3>
                                                <p>Chat with landlords</p>
                                            </div>
                                            <ChevronRight size={16} className={styles.arrowIcon} />
                                        </Link>
                                    </>
                                )}
                                <Link href="/tenant/community" className={styles.actionCard}>
                                    <div className={styles.actionIcon}><User size={20} /></div>
                                    <div className={styles.actionInfo}>
                                        <h3>Community</h3>
                                        <p>Connect with neighbors</p>
                                    </div>
                                    <ChevronRight size={16} className={styles.arrowIcon} />
                                </Link>
                            </div>
                        </motion.section>
                    </div>
                </motion.div>
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
        <div className={styles.statusCard}>
            <div className={styles.statusIconWrapper} style={{ background: config.bg, color: config.color }}>
                <Icon size={24} />
            </div>
            <div className={styles.statusContent}>
                <h4>{config.label}</h4>
                <div className={styles.statusMeta}>
                    <p>Submitted on {new Date(application.submitted_at).toLocaleDateString()}</p>
                    {application.business_name && <p>Business: {application.business_name}</p>}
                </div>

                {application.status === "rejected" && (
                    <div className={styles.statusRejection}>
                        <strong>Reason for rejection:</strong>
                        <p>{application.rejection_reason || "No specific reason provided."}</p>
                        <button onClick={onReapply} className={styles.btnSecondary} style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                            Update & Reapply
                        </button>
                    </div>
                )}

                {application.status === "pending" && (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        Your application is being processed. This usually takes 24-48 hours.
                    </p>
                )}
            </div>
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
            <div className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>
                <Shield size={24} />
                <span>Landlord Application</span>
            </div>

            {error && (
                <div style={{ background: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                    <label>Business Name (Optional)</label>
                    <input
                        className={styles.input}
                        type="text"
                        placeholder="Company or Property Name"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>Contact Phone *</label>
                    <input
                        className={styles.input}
                        type="tel"
                        placeholder="+63 900 000 0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                    />
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <label>Business Address *</label>
                    <input
                        className={styles.input}
                        type="text"
                        placeholder="Full business address"
                        value={formData.businessAddress}
                        onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>Government ID *</label>
                    <div className={styles.fileUploadArea}>
                        <input
                            className={styles.fileInput}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setGovernmentId(e.target.files?.[0] || null)}
                            required
                        />
                        <div className={styles.uploadContent}>
                            {governmentId ? (
                                <>
                                    <CheckCircle2 size={32} color="var(--success)" />
                                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{governmentId.name}</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={32} />
                                    <span>Click to Upload ID</span>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>PDF or Image</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label>Supporting Document</label>
                    <div className={styles.fileUploadArea}>
                        <input
                            className={styles.fileInput}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setPropertyDoc(e.target.files?.[0] || null)}
                        />
                        <div className={styles.uploadContent}>
                            {propertyDoc ? (
                                <>
                                    <CheckCircle2 size={32} color="var(--success)" />
                                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{propertyDoc.name}</span>
                                </>
                            ) : (
                                <>
                                    <FileText size={32} />
                                    <span>Click to Upload Doc</span>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Optional</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.buttonGroup}>
                <button type="button" className={styles.btnSecondary} onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 size={18} className={styles.loader} /> : "Submit Application"}
                </button>
            </div>
        </form>
    );
}
