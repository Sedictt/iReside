"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import {
    MessageSquare,
    Plus,
    Send,
    AlertTriangle,
    CheckCircle,
    User,
    Search,
    Users,
    ArrowLeft,
    Home,
    Building,
    MessageCircle,
    Info
} from "lucide-react";
import styles from "./community.module.css";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Complaint = {
    id: string;
    category: string;
    description: string;
    priority: string;
    status: string;
    created_at: string;
    respondent_unit: {
        unit_number: string;
    };
    complainant_id: string;
};

type Message = {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
};

type Neighbor = {
    unit_number: string;
    tenant_name: string;
    tenant_id: string;
    tenant_avatar: string | null;
};

export default function CommunityPage() {
    const [view, setView] = useState<'complaints' | 'neighbors'>('complaints');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [neighbors, setNeighbors] = useState<Neighbor[]>([]);

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [units, setUnits] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        unit_id: "",
        category: "Noise",
        description: ""
    });

    const supabase = createClient();
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchUserAndData();
    }, []);

    useEffect(() => {
        if (activeComplaint) {
            fetchMessages(activeComplaint.id);
            // Optional: Subscribe to realtime messages here
        }
    }, [activeComplaint]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchUserAndData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }
        setUser(user);

        // Fetch Complaints
        const { data: complaintsData } = await supabase
            .from('tenant_complaints')
            .select(`
                *,
                respondent_unit:units(unit_number)
            `)
            .order('updated_at', { ascending: false });

        if (complaintsData) setComplaints(complaintsData);

        // Fetch My Property Info to get Neighbors
        const { data: leaseData } = await supabase
            .from('leases')
            .select('unit_id, units(property_id)')
            .eq('tenant_id', user.id)
            .eq('status', 'active')
            .single();

        const unitsData = leaseData?.units as any;

        if (leaseData && unitsData?.property_id) {
            // 1. Fetch Units for dropdown (same property)
            const { data: propertyUnits } = await supabase
                .from('units')
                .select('id, unit_number')
                .eq('property_id', unitsData.property_id)
                .neq('id', leaseData.unit_id); // Exclude my own unit

            if (propertyUnits) setUnits(propertyUnits);

            // 2. Fetch Neighbors (Active leases in other units of same property)
            // We need to find leases where unit.property_id = my_property_id AND tenant != me
            const { data: neighborLeases } = await supabase
                .from('leases')
                .select(`
                    tenant_id,
                    units!inner (
                        unit_number,
                        property_id
                    ),
                    profiles:tenant_id (
                        full_name,
                        avatar_url,
                        id
                    )
                `)
                .eq('units.property_id', unitsData.property_id)
                .eq('status', 'active')
                .neq('tenant_id', user.id);

            if (neighborLeases) {
                const formattedNeighbors: Neighbor[] = neighborLeases.map((l: any) => ({
                    unit_number: l.units.unit_number,
                    tenant_name: l.profiles?.full_name || 'Unknown',
                    tenant_id: l.profiles?.id,
                    tenant_avatar: l.profiles?.avatar_url
                })).filter((n: Neighbor) => n.tenant_id); // Ensure we have a tenant ID
                setNeighbors(formattedNeighbors);
            }
        }

        setLoading(false);
    };

    const fetchMessages = async (complaintId: string) => {
        const { data } = await supabase
            .from('complaint_messages')
            .select('*')
            .eq('complaint_id', complaintId)
            .order('created_at', { ascending: true });

        if (data) setMessages(data);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeComplaint || !user) return;

        const { error } = await supabase
            .from('complaint_messages')
            .insert({
                complaint_id: activeComplaint.id,
                sender_id: user.id,
                content: newMessage
            });

        if (!error) {
            setNewMessage("");
            fetchMessages(activeComplaint.id); // Refresh messages
        }
    };

    const handleDirectMessage = async (neighborId: string) => {
        if (!user) return;

        // Check for existing conversation
        let { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
            .or(`participant1_id.eq.${neighborId},participant2_id.eq.${neighborId}`)
            .maybeSingle();

        if (!conversation) {
            // Create new
            const { data: newConv, error } = await supabase
                .from('conversations')
                .insert({
                    participant1_id: user.id,
                    participant2_id: neighborId,
                    listing_id: null
                })
                .select()
                .single();

            if (!error && newConv) conversation = newConv;
        }

        if (conversation) {
            router.push(`/tenant/messages?id=${conversation.id}`);
        }
    };

    const handleCreateComplaint = async () => {
        if (!user || !formData.unit_id || !formData.description) return;

        // Get property ID first (reuse logic or fetch again)
        const { data: unitData } = await supabase
            .from('units')
            .select('property_id')
            .eq('id', formData.unit_id)
            .single();

        if (!unitData) return;

        const { data, error } = await supabase
            .from('tenant_complaints')
            .insert({
                complainant_id: user.id,
                respondent_unit_id: formData.unit_id,
                property_id: unitData.property_id,
                category: formData.category,
                description: formData.description,
                status: 'open'
            })
            .select()
            .single();

        if (!error && data) {
            // Add initial message
            await supabase.from('complaint_messages').insert({
                complaint_id: data.id,
                sender_id: user.id,
                content: `Opened resolution regarding ${formData.category}: ${formData.description}`
            });

            setIsCreateOpen(false);
            setFormData({ unit_id: "", category: "Noise", description: "" });
            fetchUserAndData(); // Refresh list
        }
    };

    const handleEscalate = async () => {
        if (!activeComplaint) return;
        if (!confirm("Are you sure you want to escalate this to the landlord? Keep in mind you should try to resolve it with the neighbor first.")) return;

        const { error } = await supabase
            .from('tenant_complaints')
            .update({
                status: 'escalated',
                escalated_at: new Date().toISOString()
            })
            .eq('id', activeComplaint.id);

        if (!error) {
            setActiveComplaint({ ...activeComplaint, status: 'escalated' });
            await supabase.from('complaint_messages').insert({
                complaint_id: activeComplaint.id,
                sender_id: user.id,
                content: "⚠️ Issue escalated to Landlord."
            });
            fetchMessages(activeComplaint.id);
        }
    };

    const handleResolve = async () => {
        if (!activeComplaint) return;

        const { error } = await supabase
            .from('tenant_complaints')
            .update({ status: 'resolved' })
            .eq('id', activeComplaint.id);

        if (!error) {
            setActiveComplaint({ ...activeComplaint, status: 'resolved' });
            await supabase.from('complaint_messages').insert({
                complaint_id: activeComplaint.id,
                sender_id: user.id,
                content: "✅ Issue marked as resolved."
            });
            fetchMessages(activeComplaint.id);
        }
    };

    if (loading) return (
        <div className={styles.emptyState}>
            <div className={styles.loader} />
            <p>Loading community hub...</p>
        </div>
    );

    return (
        <main className={styles.page}>
            {/* Top Navigation */}
            <header className={styles.topBar}>
                <div className={styles.topBarContent}>
                    <Link href="/" className={styles.logoArea}>
                        <div className={styles.logoIcon}>
                            <Building size={18} />
                        </div>
                        <span>iReside</span>
                    </Link>
                    <div className={styles.navActions}>
                        <Link href="/tenant/dashboard" className={styles.navLink}>
                            <Home size={16} />
                            <span>Dashboard</span>
                        </Link>
                    </div>
                </div>
            </header>

            <div className={styles.shell}>
                {/* Sidebar */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2 className={styles.sidebarTitle}>Community Hub</h2>
                        <div className={styles.tabGroup}>
                            <button
                                className={`${styles.tabBtn} ${view === 'complaints' ? styles.active : ''}`}
                                onClick={() => setView('complaints')}
                            >
                                Claims
                            </button>
                            <button
                                className={`${styles.tabBtn} ${view === 'neighbors' ? styles.active : ''}`}
                                onClick={() => setView('neighbors')}
                            >
                                Neighbors
                            </button>
                        </div>
                        {view === 'complaints' && (
                            <button className={styles.newBtn} onClick={() => setIsCreateOpen(true)}>
                                <Plus size={18} /> New Resolution
                            </button>
                        )}
                    </div>

                    <div className={styles.listArea}>
                        {view === 'complaints' ? (
                            complaints.length === 0 ? (
                                <div className={styles.emptyState} style={{ padding: '4rem 1rem' }}>
                                    <p>No active resolutions found.</p>
                                </div>
                            ) : (
                                complaints.map(complaint => (
                                    <div
                                        key={complaint.id}
                                        className={`${styles.cardItem} ${activeComplaint?.id === complaint.id ? styles.active : ''}`}
                                        onClick={() => setActiveComplaint(complaint)}
                                    >
                                        <div className={styles.cardHeader}>
                                            <span className={`${styles.badge} ${styles[complaint.category.toLowerCase()] || styles.other}`}>
                                                {complaint.category}
                                            </span>
                                            <span className={styles.timestamp}>
                                                {new Date(complaint.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <span className={styles.cardTitle}>
                                            Unit {complaint.respondent_unit?.unit_number}
                                        </span>
                                        <p className={styles.cardPreview}>{complaint.description}</p>
                                    </div>
                                ))
                            )
                        ) : (
                            neighbors.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>No neighbors found.</p>
                                </div>
                            ) : (
                                neighbors.map(neighbor => (
                                    <div
                                        key={neighbor.tenant_id}
                                        className={styles.neighborItem}
                                    >
                                        <div className={styles.neighborAvatar}>
                                            {neighbor.tenant_name.charAt(0)}
                                        </div>
                                        <div className={styles.neighborInfo}>
                                            <h4>{neighbor.tenant_name}</h4>
                                            <p>Unit {neighbor.unit_number}</p>
                                        </div>
                                        <button
                                            className={styles.messageBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDirectMessage(neighbor.tenant_id);
                                            }}
                                            title="Send Message"
                                        >
                                            <MessageCircle size={20} />
                                        </button>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <section className={styles.mainArea}>
                    {view === 'complaints' ? (
                        !activeComplaint ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIconCircle}>
                                    <Info size={32} />
                                </div>
                                <h3>Select a resolution ticket</h3>
                                <p>View details, chat with neighbors, or escalate issues to your landlord.</p>
                            </div>
                        ) : (
                            <>
                                <header className={styles.detailHeader}>
                                    <div className={styles.detailTitle}>
                                        <h2>Unit {activeComplaint.respondent_unit?.unit_number}</h2>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <span className={`${styles.badge} ${styles[activeComplaint.category.toLowerCase()] || styles.other}`}>
                                                {activeComplaint.category}
                                            </span>
                                            <span className={styles.statusPill} style={{
                                                background: activeComplaint.status === 'resolved' ? '#dcfce7' : activeComplaint.status === 'escalated' ? '#fee2e2' : '#e0e7ff',
                                                color: activeComplaint.status === 'resolved' ? '#166534' : activeComplaint.status === 'escalated' ? '#991b1b' : '#3730a3'
                                            }}>
                                                {activeComplaint.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.detailActions}>
                                        {activeComplaint.status !== 'resolved' && (
                                            <button className={`${styles.actionBtn} ${styles.resolve}`} onClick={handleResolve}>
                                                <CheckCircle size={18} /> Resolved
                                            </button>
                                        )}
                                        {activeComplaint.status === 'open' && (
                                            <button className={`${styles.actionBtn} ${styles.escalate}`} onClick={handleEscalate}>
                                                <AlertTriangle size={18} /> Escalate
                                            </button>
                                        )}
                                    </div>
                                </header>

                                <div className={styles.messagesContainer}>
                                    {messages.map((msg, i) => {
                                        const isOwn = msg.sender_id === user?.id;
                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`${styles.messageRow} ${isOwn ? styles.own : styles.their}`}
                                            >
                                                <div className={styles.bubble}>
                                                    {msg.content}
                                                </div>
                                                <span className={styles.messageTime}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className={styles.inputContainer}>
                                    <input
                                        type="text"
                                        className={styles.inputField}
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <button className={styles.sendBtn} onClick={handleSendMessage}>
                                        <Send size={20} />
                                    </button>
                                </div>
                            </>
                        )
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIconCircle}>
                                <Users size={32} />
                            </div>
                            <h3>Connect with Neighbors</h3>
                            <p>Find neighbors in the list to start a private conversation or view their profile.</p>
                        </div>
                    )}
                </section>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className={styles.modalOverlay}>
                        <motion.div
                            className={styles.modalContent}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                        >
                            <h2 className={styles.modalTitle}>New Resolution Ticket</h2>

                            <div className={styles.formField}>
                                <label className={styles.label}>Which unit is involved?</label>
                                <select
                                    className={styles.select}
                                    value={formData.unit_id}
                                    onChange={e => setFormData({ ...formData, unit_id: e.target.value })}
                                >
                                    <option value="">Select a unit...</option>
                                    {units.map(u => (
                                        <option key={u.id} value={u.id}>Unit {u.unit_number}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formField}>
                                <label className={styles.label}>Category</label>
                                <select
                                    className={styles.select}
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option>Noise</option>
                                    <option>Cleanliness</option>
                                    <option>Parking</option>
                                    <option>Pet Issue</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div className={styles.formField}>
                                <label className={styles.label}>Description</label>
                                <textarea
                                    className={styles.textarea}
                                    rows={4}
                                    placeholder="Describe the issue kindly..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className={styles.modalButtons}>
                                <button className={styles.cancelButton} onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </button>
                                <button className={styles.submitButton} onClick={handleCreateComplaint}>
                                    Start Resolution
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
}
