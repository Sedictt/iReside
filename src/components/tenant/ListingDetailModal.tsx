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
    Loader2
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

    if (!listing && !isLoading) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={20} />
                </button>

                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                        <Loader2 className={styles.spinner} size={32} />
                    </div>
                ) : (
                    <div className={styles.modalBody}>
                        {/* Left Side: Gallery */}
                        <div className={styles.gallerySection}>
                            <div className={styles.mainPhoto}>
                                {listing?.listing_photos && listing.listing_photos.length > 0 ? (
                                    <img
                                        src={listing.listing_photos[currentPhotoIndex].url}
                                        alt={listing.listing_photos[currentPhotoIndex].caption || listing.title}
                                    />
                                ) : (
                                    <div style={{ color: 'white' }}>No Photos Available</div>
                                )}

                                {listing?.listing_photos && listing.listing_photos.length > 1 && (
                                    <>
                                        <button className={`${styles.galleryNav} ${styles.prev}`} onClick={prevPhoto}>
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button className={`${styles.galleryNav} ${styles.next}`} onClick={nextPhoto}>
                                            <ChevronRight size={24} />
                                        </button>
                                    </>
                                )}
                            </div>

                            {listing?.listing_photos && listing.listing_photos.length > 1 && (
                                <div className={styles.photoTabs}>
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

                        {/* Right Side: Content */}
                        <div className={styles.contentSection}>
                            <span className={styles.typeBadge}>
                                {listing ? (propertyTypeLabels[listing.property_type] || listing.property_type) : ''}
                            </span>
                            <h2 className={styles.title}>{listing?.title}</h2>
                            {listing?.headline && <p className={styles.headline}>{listing.headline}</p>}

                            <div className={styles.priceDisplay}>
                                {listing?.price_display ? (
                                    <span className={styles.priceValue}>{listing.price_display}</span>
                                ) : listing?.price_range_min ? (
                                    <>
                                        <span className={styles.priceValue}>
                                            ₱{listing.price_range_min.toLocaleString()}
                                            {listing.price_range_max && ` - ${listing.price_range_max.toLocaleString()}`}
                                        </span>
                                        <span className={styles.priceUnit}>/mo</span>
                                    </>
                                ) : (
                                    <span style={{ fontSize: '1.2rem', color: '#64748b' }}>Contact for price</span>
                                )}
                            </div>

                            <div className={styles.gridInfo}>
                                <div className={styles.gridItem}>
                                    <span className={styles.gridLabel}>Available Units</span>
                                    <span className={styles.gridValue}>
                                        <Users size={16} /> {listing?.available_units} units
                                    </span>
                                </div>
                                <div className={styles.gridItem}>
                                    <span className={styles.gridLabel}>Min Lease</span>
                                    <span className={styles.gridValue}>
                                        <Clock size={16} /> {listing?.min_lease_months} months
                                    </span>
                                </div>
                                <div className={styles.gridItem}>
                                    <span className={styles.gridLabel}>Deposit</span>
                                    <span className={styles.gridValue}>
                                        <DollarSign size={16} /> {listing?.deposit_months} mo.
                                    </span>
                                </div>
                                <div className={styles.gridItem}>
                                    <span className={styles.gridLabel}>Advance</span>
                                    <span className={styles.gridValue}>
                                        <DollarSign size={16} /> {listing?.advance_months} mo.
                                    </span>
                                </div>
                            </div>

                            {listing?.listing_amenities && listing.listing_amenities.length > 0 && (
                                <>
                                    <h3 className={styles.sectionTitle}>Amenities</h3>
                                    <div className={styles.amenityGrid}>
                                        {listing.listing_amenities.map((item, i) => (
                                            <div key={i} className={styles.amenityChip}>
                                                <Check size={14} color="#16a34a" />
                                                {item.amenities?.name}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <h3 className={styles.sectionTitle}>About this property</h3>
                            <div className={styles.description}>
                                {listing?.description || "No description provided."}
                            </div>

                            <div className={styles.actionFooter}>
                                <button className={styles.contactBtn}>
                                    <MessageCircle size={18} />
                                    Send Inquiry
                                </button>
                                {listing?.show_phone && listing.contact_phone && (
                                    <a href={`tel:${listing.contact_phone}`} className={styles.phoneLink}>
                                        <Phone size={20} />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
