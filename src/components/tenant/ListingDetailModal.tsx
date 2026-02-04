"use client";

import { useEffect, useState, useMemo } from "react";
import {
    X,
    ChevronLeft,
    ChevronRight,
    MapPin,
    DollarSign,
    Users,
    Clock,
    Check,
    Phone,
    MessageCircle,
    Loader2,
    Send,
    User,
    Mail,
    Calendar,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import styles from "./ListingDetailModal.module.css";

type ListingDetailModalProps = {
    listingId: string;
    onClose: () => void;
};

// Simplified type for the modal
type ListingData = {
    id: string;
    title: string;
    headline: string | null;
    description: string | null;
    property_type: string;
    available_units: number;
    price_range_min: number | null;
    price_range_max: number | null;
    price_display: string | null;
    deposit_months: number;
    advance_months: number;
    min_lease_months: number;
    listing_photos: { id: string; url: string; caption: string | null; is_primary: boolean }[];
    listing_amenities: { amenities: { name: string } | null }[];
    display_address: string | null;
    city: string;
    contact_phone: string | null;
    show_phone: boolean;
};

const propertyTypeLabels: Record<string, string> = {
    apartment: 'Apartment',
    dormitory: 'Dormitory',
    boarding_house: 'Boarding House',
    condo: 'Condominium',
    townhouse: 'Townhouse',
    house: 'House'
};

export default function ListingDetailModal({ listingId, onClose }: ListingDetailModalProps) {
    const [listing, setListing] = useState<ListingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    // Inquiry form state
    const [showInquiryForm, setShowInquiryForm] = useState(false);
    const [inquiryForm, setInquiryForm] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
        preferred_move_in: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inquirySuccess, setInquirySuccess] = useState(false);
    const [inquiryError, setInquiryError] = useState<string | null>(null);

    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const fetchListing = async () => {
            setIsLoading(true);
            const { data } = await supabase
                .from('property_listings')
                .select(`
                    id, title, headline, description, property_type, available_units,
                    price_range_min, price_range_max, price_display,
                    deposit_months, advance_months, min_lease_months,
                    display_address, city, contact_phone, show_phone,
                    listing_photos (id, url, caption, is_primary),
                    listing_amenities (amenities (name))
                `)
                .eq('id', listingId)
                .single();

            if (data) {
                // Sort photos so primary is first
                const photos = data.listing_photos?.sort((a: any, b: any) =>
                    (b.is_primary === true ? 1 : 0) - (a.is_primary === true ? 1 : 0)
                ) || [];

                // Map amenities safely
                const amenities = (data.listing_amenities || []).map((item: any) => ({
                    amenities: Array.isArray(item.amenities) ? item.amenities[0] : item.amenities
                }));

                setListing({
                    ...data,
                    listing_photos: photos,
                    listing_amenities: amenities
                });
            }
            setIsLoading(false);

            // Pre-fill user data if logged in
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setInquiryForm(prev => ({
                    ...prev,
                    email: user.email || '',
                    name: user.user_metadata?.full_name || ''
                }));
            }
        };

        fetchListing();

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [listingId, supabase]);

    const nextPhoto = () => {
        if (!listing?.listing_photos.length) return;
        setCurrentPhotoIndex(prev => (prev === listing.listing_photos.length - 1 ? 0 : prev + 1));
    };

    const prevPhoto = () => {
        if (!listing?.listing_photos.length) return;
        setCurrentPhotoIndex(prev => (prev === 0 ? listing.listing_photos.length - 1 : prev - 1));
    };

    const handleInquirySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setInquiryError(null);

        try {
            // Validate required fields
            if (!inquiryForm.name.trim() || !inquiryForm.email.trim() || !inquiryForm.message.trim()) {
                throw new Error('Please fill in all required fields');
            }

            // Get current user if logged in
            const { data: { user } } = await supabase.auth.getUser();

            // Submit inquiry
            const { error } = await supabase
                .from('listing_inquiries')
                .insert({
                    listing_id: listingId,
                    name: inquiryForm.name.trim(),
                    email: inquiryForm.email.trim(),
                    phone: inquiryForm.phone.trim() || null,
                    message: inquiryForm.message.trim(),
                    preferred_move_in: inquiryForm.preferred_move_in || null,
                    user_id: user?.id || null
                });

            if (error) {
                console.error('Inquiry error:', error);
                throw new Error('Failed to submit inquiry. Please try again.');
            }

            setInquirySuccess(true);
            // Reset form after success
            setTimeout(() => {
                setShowInquiryForm(false);
                setInquirySuccess(false);
            }, 3000);

        } catch (err) {
            setInquiryError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!listing && !isLoading) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={24} />
                </button>

                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                        <Loader2 className={styles.spinner} size={40} color="var(--primary)" />
                    </div>
                ) : (
                    <>
                        {/* LEFT: Immersive Gallery */}
                        <div className={styles.galleryColumn}>
                            <div className={styles.mainImageContainer}>
                                {listing?.listing_photos && listing.listing_photos.length > 0 ? (
                                    <>
                                        <img
                                            src={listing.listing_photos[currentPhotoIndex].url}
                                            alt={listing.listing_photos[currentPhotoIndex].caption || listing.title}
                                            className={styles.mainImage}
                                        />
                                        <div className={styles.galleryOverlay}>
                                            <div className={styles.galleryCounter}>
                                                {currentPhotoIndex + 1} / {listing.listing_photos.length}
                                            </div>
                                            {listing.listing_photos[currentPhotoIndex].caption && (
                                                <p>{listing.listing_photos[currentPhotoIndex].caption}</p>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>
                                        No Photos Available
                                    </div>
                                )}

                                {/* Navigation Arrows */}
                                {listing?.listing_photos && listing.listing_photos.length > 1 && (
                                    <>
                                        <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={prevPhoto}>
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={nextPhoto}>
                                            <ChevronRight size={24} />
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Thumbnail Strip */}
                            {listing?.listing_photos && listing.listing_photos.length > 1 && (
                                <div className={styles.thumbnailStrip}>
                                    {listing.listing_photos.map((photo, idx) => (
                                        <div
                                            key={photo.id}
                                            className={`${styles.thumbnail} ${idx === currentPhotoIndex ? styles.active : ''}`}
                                            onClick={() => setCurrentPhotoIndex(idx)}
                                        >
                                            <img src={photo.url} alt="" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Content & Details */}
                        <div className={styles.contentColumn}>
                            {!showInquiryForm ? (
                                <>
                                    <div className={styles.contentHeader}>
                                        <div className={styles.breadCrumb}>
                                            {listing ? (propertyTypeLabels[listing.property_type] || listing.property_type) : 'Property'}
                                            <span style={{ color: '#cbd5e1' }}>•</span>
                                            <span>ID: {listingId.slice(0, 8)}</span>
                                        </div>
                                        <h2 className={styles.title}>{listing?.title}</h2>
                                        <div className={styles.location}>
                                            <MapPin size={18} />
                                            {listing?.display_address || "Address Hidden"}, {listing?.city}
                                        </div>

                                        <div className={styles.statsRow}>
                                            <div className={styles.statItem}>
                                                <span className={styles.statValue}>
                                                    <Users size={18} color="var(--primary)" />
                                                    {listing?.available_units}
                                                </span>
                                                <span className={styles.statLabel}>Available Units</span>
                                            </div>
                                            <div className={styles.statItem}>
                                                <span className={styles.statValue}>
                                                    <DollarSign size={18} color="var(--primary)" />
                                                    {listing?.deposit_months}mo
                                                </span>
                                                <span className={styles.statLabel}>Deposit</span>
                                            </div>
                                            <div className={styles.statItem}>
                                                <span className={styles.statValue}>
                                                    <Clock size={18} color="var(--primary)" />
                                                    {listing?.min_lease_months}mo+
                                                </span>
                                                <span className={styles.statLabel}>Min Lease</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className={styles.section}>
                                        <h3 className={styles.sectionTitle}>About this property</h3>
                                        <div className={styles.description}>
                                            {listing?.description || "No description provided."}
                                        </div>
                                    </div>

                                    {/* Amenities */}
                                    {listing?.listing_amenities && listing.listing_amenities.length > 0 && (
                                        <div className={styles.section}>
                                            <h3 className={styles.sectionTitle}>Amenities & Features</h3>
                                            <div className={styles.amenitiesGrid}>
                                                {listing.listing_amenities.map((item, i) => (
                                                    <div key={i} className={styles.amenityItem}>
                                                        <div className={styles.amenityIcon}>
                                                            <Check size={18} />
                                                        </div>
                                                        {item.amenities?.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sticky Footer Action */}
                                    <div className={styles.footerAction}>
                                        <div className={styles.priceBlock}>
                                            <span className={styles.price}>
                                                {listing?.price_display || (listing?.price_range_min ? `₱${listing.price_range_min.toLocaleString()}` : 'Contact Us')}
                                            </span>
                                            <span className={styles.priceSub}>per month</span>
                                        </div>
                                        <button
                                            className={styles.bookBtn}
                                            onClick={() => setShowInquiryForm(true)}
                                        >
                                            Inquire Now
                                            <MessageCircle size={20} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* Inquiry Form */
                                <div className={styles.inquiryFormContainer}>
                                    {inquirySuccess ? (
                                        <div className={styles.successMessage}>
                                            <CheckCircle2 size={48} color="var(--success)" />
                                            <h3>Inquiry Sent!</h3>
                                            <p>The landlord will get back to you soon via email.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles.inquiryHeader}>
                                                <button
                                                    className={styles.backBtn}
                                                    onClick={() => setShowInquiryForm(false)}
                                                >
                                                    <ChevronLeft size={20} />
                                                    Back
                                                </button>
                                                <h3>Send an Inquiry</h3>
                                                <p>Interested in <strong>{listing?.title}</strong>? Send a message to the landlord.</p>
                                            </div>

                                            {inquiryError && (
                                                <div className={styles.errorBanner}>
                                                    <AlertCircle size={18} />
                                                    <span>{inquiryError}</span>
                                                </div>
                                            )}

                                            <form onSubmit={handleInquirySubmit} className={styles.inquiryForm}>
                                                <div className={styles.formRow}>
                                                    <div className={styles.formGroup}>
                                                        <label>
                                                            <User size={16} />
                                                            Full Name *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="Your full name"
                                                            value={inquiryForm.name}
                                                            onChange={(e) => setInquiryForm(f => ({ ...f, name: e.target.value }))}
                                                            required
                                                        />
                                                    </div>
                                                    <div className={styles.formGroup}>
                                                        <label>
                                                            <Mail size={16} />
                                                            Email Address *
                                                        </label>
                                                        <input
                                                            type="email"
                                                            placeholder="your@email.com"
                                                            value={inquiryForm.email}
                                                            onChange={(e) => setInquiryForm(f => ({ ...f, email: e.target.value }))}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className={styles.formRow}>
                                                    <div className={styles.formGroup}>
                                                        <label>
                                                            <Phone size={16} />
                                                            Phone (Optional)
                                                        </label>
                                                        <input
                                                            type="tel"
                                                            placeholder="+63 9XX XXX XXXX"
                                                            value={inquiryForm.phone}
                                                            onChange={(e) => setInquiryForm(f => ({ ...f, phone: e.target.value }))}
                                                        />
                                                    </div>
                                                    <div className={styles.formGroup}>
                                                        <label>
                                                            <Calendar size={16} />
                                                            Preferred Move-in
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={inquiryForm.preferred_move_in}
                                                            onChange={(e) => setInquiryForm(f => ({ ...f, preferred_move_in: e.target.value }))}
                                                        />
                                                    </div>
                                                </div>

                                                <div className={styles.formGroup}>
                                                    <label>
                                                        <MessageCircle size={16} />
                                                        Your Message *
                                                    </label>
                                                    <textarea
                                                        placeholder="Hi, I'm interested in this property. I would like to schedule a viewing..."
                                                        rows={4}
                                                        value={inquiryForm.message}
                                                        onChange={(e) => setInquiryForm(f => ({ ...f, message: e.target.value }))}
                                                        required
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    className={styles.submitBtn}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? (
                                                        <Loader2 size={20} className={styles.spinner} />
                                                    ) : (
                                                        <>
                                                            <Send size={18} />
                                                            Send Inquiry
                                                        </>
                                                    )}
                                                </button>
                                            </form>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
