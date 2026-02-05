"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Mail, Phone, Calendar, MapPin, Clock, CheckCircle, Eye, Archive, FileText, MessageSquare } from "lucide-react";
import RequestDecisionModal from "@/components/landlord/RequestDecisionModal";
import CreateLeaseModal from "@/components/landlord/CreateLeaseModal";

type Inquiry = {
    id: string;
    listing_id: string;
    name: string;
    email: string;
    phone: string | null;
    message: string;
    preferred_move_in: string | null;
    status: 'new' | 'read' | 'replied' | 'archived';
    created_at: string;
    replied_at: string | null;
    user_id: string | null;
    listing?: {
        title: string;
        display_address: string;

        city: string;
        property_id: string;
    };
};

type StatusFilter = 'all' | 'new' | 'read' | 'replied' | 'archived';

export default function InquiriesPage() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

    const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
    const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchInquiries();
    }, []);

    async function fetchInquiries() {
        const supabase = createClient();

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error("No user found");
                setLoading(false);
                return;
            }

            // Fetch inquiries for landlord's listings
            const { data, error } = await supabase
                .from('listing_inquiries')
                .select(`
                    *,
                    listing:property_listings (
                        title,
                        display_address,
                        city,
                        price_display,
                        price_range_min,
                        property_id
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching inquiries:", error);
            } else {
                setInquiries(data || []);
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }

    async function updateInquiryStatus(inquiryId: string, newStatus: Inquiry['status']) {
        const supabase = createClient();

        const { error } = await supabase
            .from('listing_inquiries')
            .update({
                status: newStatus,
                replied_at: newStatus === 'replied' ? new Date().toISOString() : undefined
            })
            .eq('id', inquiryId);

        if (error) {
            console.error("Error updating inquiry:", error);
        } else {
            // Update local state
            setInquiries(prev => prev.map(inq =>
                inq.id === inquiryId
                    ? { ...inq, status: newStatus, replied_at: newStatus === 'replied' ? new Date().toISOString() : inq.replied_at }
                    : inq
            ));
            if (selectedInquiry?.id === inquiryId) {
                setSelectedInquiry(prev => prev ? { ...prev, status: newStatus } : null);
            }
        }
    }

    async function handleStartChat(inquiry: Inquiry) {
        if (!inquiry.user_id) {
            // Fallback for old data or edge cases
            alert("This request comes from a guest user who cannot be messaged directly via chat. Please reply via email.");
            return;
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        // Check if conversation exists
        let { data: conversation, error: fetchError } = await supabase
            .from('conversations')
            .select('id')
            .eq('listing_id', inquiry.listing_id)
            .eq('tenant_id', inquiry.user_id)
            .eq('landlord_id', user.id)
            .single();

        // If not, create one
        if (!conversation) {
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    listing_id: inquiry.listing_id,
                    tenant_id: inquiry.user_id,
                    landlord_id: user.id
                })
                .select()
                .single();

            if (createError) {
                console.error("Failed to create conversation", {
                    message: createError.message,
                    code: createError.code,
                    details: createError.details,
                    hint: createError.hint
                });
                alert(`Error starting chat: ${createError.message}`);
                return;
            }
            conversation = newConv;
        }

        // Mark request as replied automatically
        if (inquiry.status !== 'replied') {
            await updateInquiryStatus(inquiry.id, 'replied');
        }

        // Redirect to messages
        if (conversation && conversation.id) {
            router.push(`/landlord/messages?id=${conversation.id}`);
        } else {
            console.error("Failed to retrieve or create conversation");
            alert("Error: Could not start chat. Please try again.");
        }
    }

    const filteredInquiries = statusFilter === 'all'
        ? inquiries
        : inquiries.filter(inq => inq.status === statusFilter);

    const statusCounts = {
        all: inquiries.length,
        new: inquiries.filter(i => i.status === 'new').length,
        read: inquiries.filter(i => i.status === 'read').length,
        replied: inquiries.filter(i => i.status === 'replied').length,
        archived: inquiries.filter(i => i.status === 'archived').length,
    };

    function formatDate(dateString: string) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function handleInquiryClick(inquiry: Inquiry) {
        setSelectedInquiry(inquiry);

        // Mark as read if it's new
        if (inquiry.status === 'new') {
            updateInquiryStatus(inquiry.id, 'read');
        }
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Loading requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.sidebar}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Rental Requests</h1>
                    <div className={styles.filterBar}>
                        {(['all', 'new', 'read', 'replied', 'archived'] as const).map((filter) => (
                            <button
                                key={filter}
                                className={`${styles.filterBtn} ${statusFilter === filter ? styles.active : ''}`}
                                onClick={() => setStatusFilter(filter)}
                            >
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                <span className={styles.count}>
                                    {statusCounts[filter]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.inquiryList}>
                    {filteredInquiries.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Mail size={32} />
                            </div>
                            <h3>No {statusFilter !== 'all' ? statusFilter : ''} requests</h3>
                            <p>Requests from potential tenants will appear here</p>
                        </div>
                    ) : (
                        filteredInquiries.map(inquiry => (
                            <div
                                key={inquiry.id}
                                className={`${styles.inquiryCard} ${selectedInquiry?.id === inquiry.id ? styles.selected : ''} ${inquiry.status === 'new' ? styles.unread : ''}`}
                                onClick={() => handleInquiryClick(inquiry)}
                            >
                                <div className={styles.cardAvatar}>
                                    {inquiry.name.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.cardContent}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.inquirerName}>{inquiry.name}</h3>
                                        <span className={styles.inquiryTime}>
                                            {formatDate(inquiry.created_at)}
                                        </span>
                                    </div>
                                    <p className={styles.cardProperty}>
                                        {inquiry.listing?.title}
                                    </p>
                                    <p className={styles.cardPreview}>
                                        {inquiry.message}
                                    </p>
                                    <div className={styles.cardFooter}>
                                        <span className={`${styles.statusBadge} ${styles[inquiry.status]}`}>
                                            {inquiry.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className={`${styles.detailView} ${selectedInquiry ? styles.active : ''}`}>
                {selectedInquiry ? (
                    <>
                        <div className={styles.detailHeader}>
                            <button
                                className={styles.mobileBackBtn}
                                onClick={() => setSelectedInquiry(null)}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                            </button>
                            <div className={styles.detailHeaderContent}>
                                <div className={styles.detailTitle}>
                                    <h2>{selectedInquiry.name}</h2>
                                    <span className={styles.detailSubtitle}>
                                        Request for {selectedInquiry.listing?.title}
                                    </span>
                                </div>
                                <div className={styles.detailActions}>
                                    <button
                                        className={styles.actionBtnPrimary}
                                        onClick={() => setIsDecisionModalOpen(true)}
                                    >
                                        <CheckCircle size={18} />
                                        Review Request
                                    </button>

                                    {/* Start Chat Button */}
                                    <button
                                        className={styles.actionBtnSecondary}
                                        onClick={() => handleStartChat(selectedInquiry)}
                                    >
                                        <MessageSquare size={18} />
                                        Message
                                    </button>

                                    {selectedInquiry.status !== 'archived' && (
                                        <button
                                            className={styles.actionBtnSecondary}
                                            onClick={() => updateInquiryStatus(selectedInquiry.id, 'archived')}
                                            title="Archive Request"
                                        >
                                            <Archive size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={styles.detailScrollArea}>
                            <div className={styles.detailContent}>
                                <div className={styles.messageCard}>
                                    <div className={styles.messageHeader}>
                                        <div className={styles.messageAvatar}>
                                            {selectedInquiry.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className={styles.messageMeta}>
                                            <span className={styles.messageAuthor}>{selectedInquiry.name}</span>
                                            <span className={styles.messageDate}>
                                                {new Date(selectedInquiry.created_at).toLocaleString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.messageBody}>
                                        {selectedInquiry.message}
                                    </div>
                                </div>

                                <div className={styles.infoGrid}>
                                    <div className={styles.infoCard}>
                                        <h3>Contact Information</h3>
                                        <div className={styles.infoRow}>
                                            <Mail className={styles.infoIcon} size={18} />
                                            <div>
                                                <label>Email Address</label>
                                                <a href={`mailto:${selectedInquiry.email}`}>{selectedInquiry.email}</a>
                                            </div>
                                        </div>
                                        {selectedInquiry.phone && (
                                            <div className={styles.infoRow}>
                                                <Phone className={styles.infoIcon} size={18} />
                                                <div>
                                                    <label>Phone Number</label>
                                                    <a href={`tel:${selectedInquiry.phone}`}>{selectedInquiry.phone}</a>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.infoCard}>
                                        <h3>Preferences</h3>
                                        <div className={styles.infoRow}>
                                            <Calendar className={styles.infoIcon} size={18} />
                                            <div>
                                                <label>Move-in Date</label>
                                                <span>
                                                    {selectedInquiry.preferred_move_in
                                                        ? new Date(selectedInquiry.preferred_move_in).toLocaleDateString('en-US', { dateStyle: 'long' })
                                                        : 'Not specified'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.propertyCard}>
                                        <div className={styles.propertyIcon}>
                                            <MapPin size={24} />
                                        </div>
                                        <div className={styles.propertyInfo}>
                                            <label>Request for</label>
                                            <h4>{selectedInquiry.listing?.title}</h4>
                                            <p>{selectedInquiry.listing?.display_address}, {selectedInquiry.listing?.city}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <RequestDecisionModal
                            isOpen={isDecisionModalOpen}
                            onClose={() => setIsDecisionModalOpen(false)}
                            onApprove={() => {
                                setIsDecisionModalOpen(false);
                                setIsLeaseModalOpen(true);
                            }}
                            onReject={() => {
                                updateInquiryStatus(selectedInquiry.id, 'archived');
                                setIsDecisionModalOpen(false);
                            }}
                            tenantName={selectedInquiry.name}
                            tenantData={{
                                email: selectedInquiry.email,
                                phone: selectedInquiry.phone,
                                moveInDate: selectedInquiry.preferred_move_in,
                                message: selectedInquiry.message
                            }}
                            propertyDetails={selectedInquiry.listing ? {
                                title: selectedInquiry.listing.title,
                                address: selectedInquiry.listing.display_address,
                                city: selectedInquiry.listing.city,
                                price: (selectedInquiry.listing as any).price_display || ((selectedInquiry.listing as any).price_range_min ? `₱${(selectedInquiry.listing as any).price_range_min.toLocaleString()}` : null)
                            } : undefined}

                        />

                        <CreateLeaseModal
                            isOpen={isLeaseModalOpen}
                            onClose={() => setIsLeaseModalOpen(false)}
                            onSuccess={() => {
                                updateInquiryStatus(selectedInquiry.id, 'replied');
                                router.push('/landlord/tenants');
                            }}
                            propertyId={selectedInquiry.listing?.property_id || ""}
                            tenantId={selectedInquiry.user_id}
                            tenantName={selectedInquiry.name}
                            tenantEmail={selectedInquiry.email}
                        />
                    </>
                ) : (
                    <div className={styles.emptySelection}>
                        <div className={styles.emptyIllustration}>
                            <Mail size={64} />
                        </div>
                        <h3>Select a request</h3>
                        <p>Choose a request from the list to view details and respond.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
