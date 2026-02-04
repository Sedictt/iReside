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
                                <button className={styles.bookBtn}>
                                    Inquire Now
                                    <MessageCircle size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
