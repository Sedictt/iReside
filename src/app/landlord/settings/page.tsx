"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    User,
    Bell,
    Shield,
    CreditCard,
    QrCode,
    Upload,
    Palette,
    Camera,
    Lock,
    Smartphone,
    Key,
    Mail,
    MessageSquare,
    AlertTriangle,
    Check,
    Loader2,
    Save,
    LogOut,
    Trash2
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import styles from "./settings.module.css";

type TabType = 'profile' | 'notifications' | 'security' | 'billing' | 'preferences';

type UserProfile = {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    company?: string;
    address?: string;
};

type NotificationSettings = {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    newTenantAlerts: boolean;
    paymentReminders: boolean;
    maintenanceAlerts: boolean;
    weeklyReports: boolean;
};

type PreferenceSettings = {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    currency: string;
    dateFormat: string;
};

type PaymentMethod = {
    id: string;
    landlord_id: string;
    label: string;
    account_name: string | null;
    account_number: string | null;
    qr_url: string;
    instructions: string | null;
    is_active: boolean;
    created_at: string;
};

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const [profile, setProfile] = useState<UserProfile>({
        id: '',
        email: '',
        full_name: '',
        phone: '',
        company: '',
        address: ''
    });

    const [notifications, setNotifications] = useState<NotificationSettings>({
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        newTenantAlerts: true,
        paymentReminders: true,
        maintenanceAlerts: true,
        weeklyReports: false
    });

    const [preferences, setPreferences] = useState<PreferenceSettings>({
        theme: 'light',
        language: 'en',
        timezone: 'Asia/Manila',
        currency: 'PHP',
        dateFormat: 'DD/MM/YYYY'
    });

    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [paymentForm, setPaymentForm] = useState({
        label: 'GCash',
        account_name: '',
        account_number: '',
        instructions: '',
        qrFile: null as File | null
    });
    const [paymentError, setPaymentError] = useState('');
    const [isUploadingPayment, setIsUploadingPayment] = useState(false);

    const [passwordFields, setPasswordFields] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const supabase = useMemo(() => createClient(), []);

    const fetchPaymentMethods = useCallback(async (landlordId?: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const ownerId = landlordId || user?.id;
        if (!ownerId) return;

        const { data } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('landlord_id', ownerId)
            .order('created_at', { ascending: false });

        if (data) {
            setPaymentMethods(data as PaymentMethod[]);
        }
    }, [supabase]);

    const fetchUserData = useCallback(async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            setProfile({
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || '',
                phone: user.user_metadata?.phone || '',
                company: user.user_metadata?.company || '',
                address: user.user_metadata?.address || ''
            });

            await fetchPaymentMethods(user.id);

            // Load notification settings from localStorage or user metadata
            const savedNotifications = localStorage.getItem('notificationSettings');
            if (savedNotifications) {
                setNotifications(JSON.parse(savedNotifications));
            }

            const savedPreferences = localStorage.getItem('preferenceSettings');
            if (savedPreferences) {
                setPreferences(JSON.parse(savedPreferences));
            }
        }
        setIsLoading(false);
    }, [fetchPaymentMethods, supabase]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const showFeedback = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleProfileSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: profile.full_name,
                    phone: profile.phone,
                    company: profile.company,
                    address: profile.address
                }
            });

            if (error) throw error;
            showFeedback('Profile updated successfully!');
        } catch (err) {
            console.error('Failed to update profile:', err);
            showFeedback('Failed to update profile');
        }
        setIsSaving(false);
    };

    const handleNotificationsSave = () => {
        localStorage.setItem('notificationSettings', JSON.stringify(notifications));
        showFeedback('Notification preferences saved!');
    };

    const handlePreferencesSave = () => {
        localStorage.setItem('preferenceSettings', JSON.stringify(preferences));
        showFeedback('Preferences saved!');
    };

    const handlePasswordChange = async () => {
        if (passwordFields.newPassword !== passwordFields.confirmPassword) {
            showFeedback('Passwords do not match');
            return;
        }

        if (passwordFields.newPassword.length < 8) {
            showFeedback('Password must be at least 8 characters');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordFields.newPassword
            });

            if (error) throw error;
            setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showFeedback('Password changed successfully!');
        } catch (err) {
            console.error('Failed to change password:', err);
            showFeedback('Failed to change password');
        }
        setIsSaving(false);
    };

    const handlePaymentMethodSave = async () => {
        if (!profile.id) return;
        setPaymentError('');

        if (!paymentForm.qrFile) {
            setPaymentError('Upload a QR code image.');
            return;
        }

        setIsUploadingPayment(true);
        try {
            const fileName = `${profile.id}/${Date.now()}_${paymentForm.qrFile.name}`;
            const { error: uploadError } = await supabase
                .storage
                .from('payment-qr-codes')
                .upload(fileName, paymentForm.qrFile, { cacheControl: '3600' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase
                .storage
                .from('payment-qr-codes')
                .getPublicUrl(fileName);

            const { data, error: insertError } = await supabase
                .from('payment_methods')
                .insert({
                    landlord_id: profile.id,
                    label: paymentForm.label,
                    account_name: paymentForm.account_name || null,
                    account_number: paymentForm.account_number || null,
                    instructions: paymentForm.instructions || null,
                    qr_url: publicUrl,
                    is_active: true
                })
                .select('*')
                .single();

            if (insertError) throw insertError;

            await supabase
                .from('payment_methods')
                .update({ is_active: false })
                .eq('landlord_id', profile.id)
                .neq('id', data.id);

            setPaymentForm({
                label: 'GCash',
                account_name: '',
                account_number: '',
                instructions: '',
                qrFile: null
            });
            await fetchPaymentMethods(profile.id);
            showFeedback('Payment method saved.');
        } catch (error: any) {
            console.error('Failed to save payment method:', error);
            setPaymentError(error.message || 'Failed to save payment method.');
        } finally {
            setIsUploadingPayment(false);
        }
    };

    const handleSetActivePaymentMethod = async (methodId: string) => {
        if (!profile.id) return;
        await supabase
            .from('payment_methods')
            .update({ is_active: false })
            .eq('landlord_id', profile.id);

        await supabase
            .from('payment_methods')
            .update({ is_active: true })
            .eq('id', methodId);

        fetchPaymentMethods(profile.id);
    };

    const handleDeactivatePaymentMethod = async (methodId: string) => {
        await supabase
            .from('payment_methods')
            .update({ is_active: false })
            .eq('id', methodId);

        fetchPaymentMethods(profile.id);
    };

    const toggleNotification = (key: keyof NotificationSettings) => {
        setNotifications(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'profile', label: 'Profile', icon: <User size={18} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
        { id: 'security', label: 'Security', icon: <Shield size={18} /> },
        { id: 'billing', label: 'Billing', icon: <CreditCard size={18} /> },
        { id: 'preferences', label: 'Preferences', icon: <Palette size={18} /> }
    ];

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 size={32} className={styles.spinner} />
                <p>Loading settings...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Settings</h1>
                <p className={styles.subtitle}>Manage your account settings and preferences</p>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabNav}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <>
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionIcon}>
                                <User size={20} />
                            </div>
                            <div>
                                <h2 className={styles.sectionTitle}>Profile Information</h2>
                                <p className={styles.sectionDescription}>Update your personal details</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.avatarSection}>
                                <div className={styles.avatar}>
                                    {profile.full_name?.[0]?.toUpperCase() || 'U'}
                                    <div className={styles.avatarBadge}>
                                        <Camera size={14} />
                                    </div>
                                </div>
                                <div className={styles.avatarInfo}>
                                    <h3>{profile.full_name || 'User'}</h3>
                                    <p>{profile.email}</p>
                                    <div className={styles.avatarButtons}>
                                        <button className={styles.secondaryBtn}>
                                            <Camera size={16} />
                                            Change Photo
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Full Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={profile.full_name}
                                        onChange={(e) => setProfile(p => ({ ...p, full_name: e.target.value }))}
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Email Address</label>
                                    <input
                                        type="email"
                                        className={`${styles.input} ${styles.inputDisabled}`}
                                        value={profile.email}
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Phone Number</label>
                                    <input
                                        type="tel"
                                        className={styles.input}
                                        value={profile.phone}
                                        onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                                        placeholder="+63 9XX XXX XXXX"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Company Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={profile.company}
                                        onChange={(e) => setProfile(p => ({ ...p, company: e.target.value }))}
                                        placeholder="Your company name"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroupFull}>
                                <label className={styles.label}>Address</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={profile.address}
                                    onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))}
                                    placeholder="Your business address"
                                />
                            </div>

                            <div className={styles.buttonRow}>
                                <button className={styles.secondaryBtn}>Cancel</button>
                                <button
                                    className={styles.primaryBtn}
                                    onClick={handleProfileSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 size={16} className={styles.spinner} /> : <Save size={16} />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
                <>
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionIcon}>
                                <Bell size={20} />
                            </div>
                            <div>
                                <h2 className={styles.sectionTitle}>Notification Channels</h2>
                                <p className={styles.sectionDescription}>Choose how you want to receive notifications</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.toggleRow}>
                                <div className={styles.toggleInfo}>
                                    <span className={styles.toggleLabel}>
                                        <Mail size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                                        Email Notifications
                                    </span>
                                    <p className={styles.toggleDescription}>Receive updates and alerts via email</p>
                                </div>
                                <div
                                    className={`${styles.toggle} ${notifications.emailNotifications ? styles.active : ''}`}
                                    onClick={() => toggleNotification('emailNotifications')}
                                />
                            </div>
                            <div className={styles.toggleRow}>
                                <div className={styles.toggleInfo}>
                                    <span className={styles.toggleLabel}>
                                        <Bell size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                                        Push Notifications
                                    </span>
                                    <p className={styles.toggleDescription}>Get instant notifications on your device</p>
                                </div>
                                <div
                                    className={`${styles.toggle} ${notifications.pushNotifications ? styles.active : ''}`}
                                    onClick={() => toggleNotification('pushNotifications')}
                                />
                            </div>
                            <div className={styles.toggleRow}>
                                <div className={styles.toggleInfo}>
                                    <span className={styles.toggleLabel}>
                                        <MessageSquare size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                                        SMS Notifications
                                    </span>
                                    <p className={styles.toggleDescription}>Receive important alerts via text message</p>
                                </div>
                                <div
                                    className={`${styles.toggle} ${notifications.smsNotifications ? styles.active : ''}`}
                                    onClick={() => toggleNotification('smsNotifications')}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionIcon}>
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h2 className={styles.sectionTitle}>Alert Preferences</h2>
                                <p className={styles.sectionDescription}>Configure what triggers notifications</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.toggleRow}>
                                <div className={styles.toggleInfo}>
                                    <span className={styles.toggleLabel}>New Tenant Applications</span>
                                    <p className={styles.toggleDescription}>Be notified when new tenants apply</p>
                                </div>
                                <div
                                    className={`${styles.toggle} ${notifications.newTenantAlerts ? styles.active : ''}`}
                                    onClick={() => toggleNotification('newTenantAlerts')}
                                />
                            </div>
                            <div className={styles.toggleRow}>
                                <div className={styles.toggleInfo}>
                                    <span className={styles.toggleLabel}>Payment Reminders</span>
                                    <p className={styles.toggleDescription}>Receive alerts about upcoming and overdue payments</p>
                                </div>
                                <div
                                    className={`${styles.toggle} ${notifications.paymentReminders ? styles.active : ''}`}
                                    onClick={() => toggleNotification('paymentReminders')}
                                />
                            </div>
                            <div className={styles.toggleRow}>
                                <div className={styles.toggleInfo}>
                                    <span className={styles.toggleLabel}>Maintenance Alerts</span>
                                    <p className={styles.toggleDescription}>Get notified about maintenance requests and issues</p>
                                </div>
                                <div
                                    className={`${styles.toggle} ${notifications.maintenanceAlerts ? styles.active : ''}`}
                                    onClick={() => toggleNotification('maintenanceAlerts')}
                                />
                            </div>
                            <div className={styles.toggleRow}>
                                <div className={styles.toggleInfo}>
                                    <span className={styles.toggleLabel}>Weekly Reports</span>
                                    <p className={styles.toggleDescription}>Receive a weekly summary of your property performance</p>
                                </div>
                                <div
                                    className={`${styles.toggle} ${notifications.weeklyReports ? styles.active : ''}`}
                                    onClick={() => toggleNotification('weeklyReports')}
                                />
                            </div>

                            <div className={styles.buttonRow}>
                                <button className={styles.primaryBtn} onClick={handleNotificationsSave}>
                                    <Save size={16} />
                                    Save Preferences
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <>
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionIcon}>
                                <Lock size={20} />
                            </div>
                            <div>
                                <h2 className={styles.sectionTitle}>Change Password</h2>
                                <p className={styles.sectionDescription}>Update your account password</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.formGroupFull}>
                                <label className={styles.label}>Current Password</label>
                                <input
                                    type="password"
                                    className={styles.input}
                                    value={passwordFields.currentPassword}
                                    onChange={(e) => setPasswordFields(p => ({ ...p, currentPassword: e.target.value }))}
                                    placeholder="Enter current password"
                                />
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>New Password</label>
                                    <input
                                        type="password"
                                        className={styles.input}
                                        value={passwordFields.newPassword}
                                        onChange={(e) => setPasswordFields(p => ({ ...p, newPassword: e.target.value }))}
                                        placeholder="Enter new password"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Confirm Password</label>
                                    <input
                                        type="password"
                                        className={styles.input}
                                        value={passwordFields.confirmPassword}
                                        onChange={(e) => setPasswordFields(p => ({ ...p, confirmPassword: e.target.value }))}
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>
                            <div className={styles.buttonRow}>
                                <button
                                    className={styles.primaryBtn}
                                    onClick={handlePasswordChange}
                                    disabled={isSaving || !passwordFields.newPassword}
                                >
                                    {isSaving ? <Loader2 size={16} className={styles.spinner} /> : <Lock size={16} />}
                                    Update Password
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionIcon}>
                                <Shield size={20} />
                            </div>
                            <div>
                                <h2 className={styles.sectionTitle}>Security Options</h2>
                                <p className={styles.sectionDescription}>Additional security measures for your account</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.securityCard}>
                                <div className={styles.securityIcon}>
                                    <Smartphone size={24} />
                                </div>
                                <div className={styles.securityInfo}>
                                    <h4>Two-Factor Authentication</h4>
                                    <p>Add an extra layer of security to your account</p>
                                </div>
                                <span className={`${styles.securityStatus} ${styles.statusDisabled}`}>
                                    Not Enabled
                                </span>
                                <button className={styles.secondaryBtn}>Enable</button>
                            </div>
                            <div className={styles.securityCard}>
                                <div className={styles.securityIcon}>
                                    <Key size={24} />
                                </div>
                                <div className={styles.securityInfo}>
                                    <h4>Login Sessions</h4>
                                    <p>Manage your active login sessions</p>
                                </div>
                                <span className={`${styles.securityStatus} ${styles.statusEnabled}`}>
                                    <Check size={12} /> 1 Active
                                </span>
                                <button className={styles.secondaryBtn}>Manage</button>
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.section} ${styles.dangerZone}`}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionIcon}>
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h2 className={styles.sectionTitle}>Danger Zone</h2>
                                <p className={styles.sectionDescription}>Irreversible actions for your account</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.dangerItem}>
                                <div className={styles.dangerInfo}>
                                    <h4>Sign Out Everywhere</h4>
                                    <p>Log out from all devices and sessions</p>
                                </div>
                                <button className={styles.dangerBtn}>
                                    <LogOut size={16} />
                                    Sign Out All
                                </button>
                            </div>
                            <div className={styles.dangerItem}>
                                <div className={styles.dangerInfo}>
                                    <h4>Delete Account</h4>
                                    <p>Permanently delete your account and all data</p>
                                </div>
                                <button className={styles.dangerBtn}>
                                    <Trash2 size={16} />
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
                <>
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionIcon}>
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <h2 className={styles.sectionTitle}>Current Plan</h2>
                                <p className={styles.sectionDescription}>Manage your subscription</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.planCard}>
                                <div className={styles.planInfo}>
                                    <h3>
                                        Professional Plan
                                        <span className={styles.planBadge}>Active</span>
                                    </h3>
                                    <p>Full access to all features with unlimited properties</p>
                                </div>
                                <button className={styles.secondaryBtn}>Change Plan</button>
                            </div>

                            <div className={styles.billingGrid}>
                                <div className={styles.billingCard}>
                                    <p className={styles.billingLabel}>Monthly Cost</p>
                                    <p className={styles.billingValue}>₱2,999/mo</p>
                                </div>
                                <div className={styles.billingCard}>
                                    <p className={styles.billingLabel}>Next Billing</p>
                                    <p className={styles.billingValue}>Feb 28, 2026</p>
                                </div>
                                <div className={styles.billingCard}>
                                    <p className={styles.billingLabel}>Properties Used</p>
                                    <p className={styles.billingValue}>12 / Unlimited</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionIcon}>
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <h2 className={styles.sectionTitle}>Tenant Payment Methods</h2>
                                <p className={styles.sectionDescription}>Upload your GCash QR and payment details for tenants</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            {paymentMethods.length > 0 ? (
                                <div className={styles.paymentList}>
                                    {paymentMethods.map(method => (
                                        <div key={method.id} className={styles.paymentCard}>
                                            <div className={styles.paymentQr}>
                                                <img src={method.qr_url} alt="Payment QR" />
                                            </div>
                                            <div className={styles.paymentDetails}>
                                                <div className={styles.paymentTitle}>
                                                    <QrCode size={18} />
                                                    {method.label}
                                                </div>
                                                <p>{method.account_name || 'Account name not set'}</p>
                                                {method.account_number && (
                                                    <span className={styles.paymentMeta}>{method.account_number}</span>
                                                )}
                                                {method.instructions && (
                                                    <span className={styles.paymentMeta}>{method.instructions}</span>
                                                )}
                                            </div>
                                            <div className={styles.paymentActions}>
                                                <span className={`${styles.paymentStatus} ${method.is_active ? styles.statusEnabled : styles.statusDisabled}`}>
                                                    {method.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                                {!method.is_active && (
                                                    <button
                                                        className={styles.secondaryBtn}
                                                        onClick={() => handleSetActivePaymentMethod(method.id)}
                                                    >
                                                        Set Active
                                                    </button>
                                                )}
                                                {method.is_active && (
                                                    <button
                                                        className={styles.secondaryBtn}
                                                        onClick={() => handleDeactivatePaymentMethod(method.id)}
                                                    >
                                                        Deactivate
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>No payment methods yet. Upload your GCash QR to get started.</div>
                            )}

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Label</label>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        value={paymentForm.label}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, label: e.target.value }))}
                                        placeholder="GCash"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Account Name</label>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        value={paymentForm.account_name}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, account_name: e.target.value }))}
                                        placeholder="Juan Dela Cruz"
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Account Number</label>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        value={paymentForm.account_number}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, account_number: e.target.value }))}
                                        placeholder="0917 123 4567"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Instructions</label>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        value={paymentForm.instructions}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, instructions: e.target.value }))}
                                        placeholder="Include invoice ID in note"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroupFull}>
                                <label className={styles.label}>Upload QR Code</label>
                                <div className={styles.fileUpload}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, qrFile: e.target.files?.[0] || null }))}
                                    />
                                    <div className={styles.fileUploadInfo}>
                                        <Upload size={18} />
                                        <span>{paymentForm.qrFile ? paymentForm.qrFile.name : 'Choose a QR image file'}</span>
                                    </div>
                                </div>
                                {paymentError && <p className={styles.errorText}>{paymentError}</p>}
                            </div>

                            <div className={styles.buttonRow}>
                                <button
                                    className={styles.primaryBtn}
                                    onClick={handlePaymentMethodSave}
                                    disabled={isUploadingPayment}
                                >
                                    {isUploadingPayment ? 'Saving...' : 'Save Payment Method'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
                <>
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionIcon}>
                                <Palette size={20} />
                            </div>
                            <div>
                                <h2 className={styles.sectionTitle}>Appearance</h2>
                                <p className={styles.sectionDescription}>Customize how the app looks</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.formGroupFull}>
                                <label className={styles.label}>Theme</label>
                                <select
                                    className={styles.select}
                                    value={preferences.theme}
                                    onChange={(e) => setPreferences(p => ({ ...p, theme: e.target.value as PreferenceSettings['theme'] }))}
                                >
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                    <option value="system">System Default</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionIcon}>
                                <Palette size={20} />
                            </div>
                            <div>
                                <h2 className={styles.sectionTitle}>Regional Settings</h2>
                                <p className={styles.sectionDescription}>Configure language, timezone and formats</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Language</label>
                                    <select
                                        className={styles.select}
                                        value={preferences.language}
                                        onChange={(e) => setPreferences(p => ({ ...p, language: e.target.value }))}
                                    >
                                        <option value="en">English</option>
                                        <option value="fil">Filipino</option>
                                        <option value="ceb">Cebuano</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Timezone</label>
                                    <select
                                        className={styles.select}
                                        value={preferences.timezone}
                                        onChange={(e) => setPreferences(p => ({ ...p, timezone: e.target.value }))}
                                    >
                                        <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                                        <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                                        <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                                        <option value="America/Los_Angeles">Los Angeles (GMT-8)</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Currency</label>
                                    <select
                                        className={styles.select}
                                        value={preferences.currency}
                                        onChange={(e) => setPreferences(p => ({ ...p, currency: e.target.value }))}
                                    >
                                        <option value="PHP">Philippine Peso (₱)</option>
                                        <option value="USD">US Dollar ($)</option>
                                        <option value="EUR">Euro (€)</option>
                                        <option value="SGD">Singapore Dollar (S$)</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Date Format</label>
                                    <select
                                        className={styles.select}
                                        value={preferences.dateFormat}
                                        onChange={(e) => setPreferences(p => ({ ...p, dateFormat: e.target.value }))}
                                    >
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.buttonRow}>
                                <button className={styles.secondaryBtn}>Reset to Defaults</button>
                                <button className={styles.primaryBtn} onClick={handlePreferencesSave}>
                                    <Save size={16} />
                                    Save Preferences
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Toast Notification */}
            {showToast && (
                <div className={styles.toast}>
                    <Check size={20} />
                    {toastMessage}
                </div>
            )}
        </div>
    );
}
