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
    AlertCircle,
    LayoutTemplate,
    Maximize2,
    Minimize2,
    PawPrint,
    Cigarette,
    Ban,
    Clock3,
    Ghost,
    ChevronDown,
    Key
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import VisualBuilder from "@/components/landlord/VisualBuilder";
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
    property_id: string; // Needed for blueprint

    // Rules & Terms
    pets_allowed: boolean;
    smoking_allowed: boolean;
    visitors_allowed: boolean;
    curfew_time: string | null;
    gender_restriction: string;
    max_lease_months: number | null;
};

type UnitData = {
    id: string;
    unit_type: string;
    grid_x: number;
    grid_y: number;
    map_x?: number | null;
    map_y?: number | null;
    map_floor?: number | null;
    status: string;
    unit_number: string | null;
    rent_amount: number | null;
};

type TileData = {
    id: string;
    tile_type: string;
    grid_x: number;
    grid_y: number;
    floor: number | null;
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
    const [activeTab, setActiveTab] = useState<'photos' | 'blueprint'>('photos');
    const [isExpanded, setIsExpanded] = useState(false);
    const [units, setUnits] = useState<UnitData[]>([]);
    const [tiles, setTiles] = useState<TileData[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

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
                    deposit_months, advance_months, min_lease_months, max_lease_months,
                    pets_allowed, smoking_allowed, visitors_allowed, curfew_time, gender_restriction,
                    display_address, city, contact_phone, show_phone, property_id,
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

                // Fetch units for blueprint
                if (data.property_id) {
                    const { data: unitData } = await supabase
                        .from('units')
                        .select('id, unit_type, grid_x, grid_y, map_x, map_y, map_floor, status, unit_number, rent_amount')
                        .eq('property_id', data.property_id);

                    if (unitData) setUnits(unitData);

                    const { data: tileData } = await supabase
                        .from('unit_map_tiles')
                        .select('id, tile_type, grid_x, grid_y, floor')
                        .eq('property_id', data.property_id);

                    if (tileData) setTiles(tileData);
                }
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

    const handleUnitClick = (unit: any) => {
        if (!unit.unit_number) return;

        setSelectedUnit(unit.unit_number);
        setShowInquiryForm(true);
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
            const finalMessage = selectedUnit
                ? `[Interested in Unit: ${selectedUnit}] ${inquiryForm.message}`
                : inquiryForm.message;

            const { error } = await supabase
                .from('listing_inquiries')
                .insert({
                    listing_id: listingId,
                    name: inquiryForm.name.trim(),
                    email: inquiryForm.email.trim(),
                    phone: inquiryForm.phone.trim() || null,
                    message: finalMessage,
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
                        {/* LEFT: Immersive Gallery or Blueprint */}
                        <div className={styles.galleryColumn}>
                            {/* View Switcher */}
                            <div className={styles.viewSwitcher}>
                                <button
                                    className={`${styles.viewBtn} ${activeTab === 'photos' ? styles.activeView : ''}`}
                                    onClick={() => setActiveTab('photos')}
                                >
                                    Photos
                                </button>
                                <button
                                    className={`${styles.viewBtn} ${activeTab === 'blueprint' ? styles.activeView : ''}`}
                                    onClick={() => setActiveTab('blueprint')}
                                >
                                    <LayoutTemplate size={16} style={{ marginRight: 6 }} />
                                    Unit Map
                                </button>
                            </div>

                            {activeTab === 'photos' ? (
                                <>
                                    <div className={styles.mainImageContainer}>
                                        {/* Expand Button */}
                                        <button
                                            className={styles.expandTriggerBtn}
                                            onClick={() => setIsExpanded(true)}
                                            title="Expand View"
                                        >
                                            <Maximize2 size={18} />
                                        </button>

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
                                </>
                            ) : (
                                /* BLUEPRINT VIEW */
                                <div className={styles.blueprintContainer}>
                                    {/* Expand Button */}
                                    <button
                                        className={styles.expandTriggerBtn}
                                        onClick={() => setIsExpanded(true)}
                                        title="Expand Map"
                                    >
                                        <Maximize2 size={18} />
                                    </button>

                                    <VisualBuilder
                                        propertyId={listing?.property_id || ''}
                                        initialUnits={units}
                                        initialTiles={tiles}
                                        readOnly={true}
                                        onUnitClick={handleUnitClick}
                                    />
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

                                    {/* House Rules & Terms */}
                                    <div className={styles.section}>
                                        <h3 className={styles.sectionTitle}>House Rules & Terms</h3>
                                        <div className={styles.rulesGrid}>
                                            {/* Pets */}
                                            <div className={`${styles.ruleItem} ${listing?.pets_allowed ? styles.allowed : styles.notAllowed}`}>
                                                <PawPrint size={18} />
                                                <span>{listing?.pets_allowed ? 'Pets Allowed' : 'No Pets'}</span>
                                            </div>

                                            {/* Smoking */}
                                            <div className={`${styles.ruleItem} ${listing?.smoking_allowed ? styles.allowed : styles.notAllowed}`}>
                                                <div className={styles.iconContainer}>
                                                    <Cigarette size={18} />
                                                    {!listing?.smoking_allowed && <Ban size={14} className={styles.banOverlay} />}
                                                </div>
                                                <span>{listing?.smoking_allowed ? 'Smoking Allowed' : 'No Smoking'}</span>
                                            </div>

                                            {/* Visitors */}
                                            <div className={`${styles.ruleItem} ${listing?.visitors_allowed ? styles.allowed : styles.notAllowed}`}>
                                                <Users size={18} />
                                                <span>{listing?.visitors_allowed ? 'Visitors Allowed' : 'No Visitors'}</span>
                                            </div>

                                            {/* Curfew */}
                                            {listing?.curfew_time && (
                                                <div className={styles.ruleItem}>
                                                    <Clock3 size={18} />
                                                    <span>Curfew: {listing.curfew_time}</span>
                                                </div>
                                            )}

                                            {/* Gender Restriction */}
                                            {listing?.gender_restriction !== 'none' && (
                                                <div className={styles.ruleItem}>
                                                    <User size={18} />
                                                    <span style={{ textTransform: 'capitalize' }}>
                                                        {listing?.gender_restriction?.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className={styles.termsRow}>
                                            <div className={styles.termTag}>
                                                <span className={styles.termLabel}>Advance:</span>
                                                <span className={styles.termValue}>{listing?.advance_months} months</span>
                                            </div>
                                            {listing?.max_lease_months && (
                                                <div className={styles.termTag}>
                                                    <span className={styles.termLabel}>Max Lease:</span>
                                                    <span className={styles.termValue}>{listing.max_lease_months} months</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

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
                                            Request to Rent
                                            <Key size={20} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* Inquiry Form Container */
                                <div className={styles.inquiryFormContainer}>
                                    {!inquiryForm.email ? (
                                        /* LOGIN REQUIRED STATE */
                                        <div className={styles.loginRequired}>
                                            <div className={styles.loginCard}>
                                                <div className={styles.loginHeader}>
                                                    <div className={styles.loginIconWrapper}>
                                                        <Key size={32} />
                                                    </div>
                                                    <button
                                                        className={styles.closeLoginBtn}
                                                        onClick={() => setShowInquiryForm(false)}
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                <div className={styles.loginContent}>
                                                    <h3>Log in to Request</h3>
                                                    <p>Connect with landlords securely. Creating an account takes less than a minute.</p>

                                                    <div className={styles.loginActions}>
                                                        <a href={`/login?redirect=/tenant/search`} className={styles.primaryLoginBtn}>
                                                            <User size={18} />
                                                            Log In / Sign Up
                                                        </a>
                                                        <button
                                                            className={styles.secondaryLoginBtn}
                                                            onClick={() => setShowInquiryForm(false)}
                                                        >
                                                            Maybe Later
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : inquirySuccess ? (
                                        <div className={styles.successMessage}>
                                            <div className={styles.successIconWrapper}>
                                                <CheckCircle2 size={48} />
                                            </div>
                                            <h3>Request Sent!</h3>
                                            <p>Your rental request has been sent to the landlord. You will be notified via email when they respond.</p>
                                            <button
                                                className={styles.backToPropertyBtn}
                                                onClick={() => {
                                                    setShowInquiryForm(false);
                                                    setInquirySuccess(false);
                                                }}
                                            >
                                                Back to Property
                                            </button>
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
                                                <div className={styles.headerTitleBlock}>
                                                    <h3>Request to Rent</h3>
                                                    <p>Send a request to secure this unit</p>
                                                </div>
                                            </div>

                                            {inquiryError && (
                                                <div className={styles.errorBanner}>
                                                    <AlertCircle size={18} />
                                                    <span>{inquiryError}</span>
                                                </div>
                                            )}

                                            <form onSubmit={handleInquirySubmit} className={styles.inquiryForm}>
                                                {/* Selected Unit Card */}
                                                {selectedUnit && (
                                                    <div className={styles.selectedUnitCard}>
                                                        <div className={styles.unitCardIcon}>
                                                            <LayoutTemplate size={18} />
                                                        </div>
                                                        <div className={styles.unitCardInfo}>
                                                            <span className={styles.unitCardLabel}>Inquiring about</span>
                                                            <span className={styles.unitCardValue}>Unit {selectedUnit}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className={styles.clearUnitBtn}
                                                            onClick={() => setSelectedUnit(null)}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}

                                                <div className={styles.formRow}>
                                                    <div className={styles.inputGroup}>
                                                        <label>Full Name</label>
                                                        <div className={styles.inputWrapper}>
                                                            <User size={18} className={styles.inputIcon} />
                                                            <input
                                                                type="text"
                                                                value={inquiryForm.name}
                                                                readOnly
                                                                className={styles.inputField}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>Email Address</label>
                                                        <div className={styles.inputWrapper}>
                                                            <Mail size={18} className={styles.inputIcon} />
                                                            <input
                                                                type="email"
                                                                value={inquiryForm.email}
                                                                readOnly
                                                                className={styles.inputField}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={styles.formRow}>
                                                    <div className={styles.inputGroup}>
                                                        <label>Phone Number <span className={styles.optionalLabel}>(Optional)</span></label>
                                                        <div className={styles.inputWrapper}>
                                                            <Phone size={18} className={styles.inputIcon} />
                                                            <input
                                                                type="tel"
                                                                placeholder="+63 9XX XXX XXXX"
                                                                value={inquiryForm.phone}
                                                                onChange={(e) => setInquiryForm(f => ({ ...f, phone: e.target.value }))}
                                                                className={styles.inputField}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>Move-in Date <span className={styles.optionalLabel}>(Preferred)</span></label>
                                                        <div className={styles.inputWrapper}>
                                                            <input
                                                                type="date"
                                                                value={inquiryForm.preferred_move_in}
                                                                onChange={(e) => setInquiryForm(f => ({ ...f, preferred_move_in: e.target.value }))}
                                                                className={`${styles.inputField} ${styles.dateInput}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {!selectedUnit && (
                                                    <div className={styles.inputGroup}>
                                                        <label>Specific Unit <span className={styles.optionalLabel}>(Optional)</span></label>
                                                        <div
                                                            className={`${styles.customSelectWrapper} ${isUnitDropdownOpen ? styles.active : ''}`}
                                                            onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                                                        >
                                                            <div className={styles.customSelectTrigger}>
                                                                <LayoutTemplate size={18} className={styles.inputIcon} />
                                                                <span className={selectedUnit ? styles.selectedValue : styles.placeholder}>
                                                                    {selectedUnit
                                                                        ? `Unit ${selectedUnit}`
                                                                        : "Any / No Preference"
                                                                    }
                                                                </span>
                                                                <ChevronDown size={16} className={styles.chevron} />
                                                            </div>

                                                            {isUnitDropdownOpen && (
                                                                <div className={styles.customSelectDropdown} onClick={(e) => e.stopPropagation()}>
                                                                    <div
                                                                        className={styles.customOption}
                                                                        onClick={() => {
                                                                            setSelectedUnit(null);
                                                                            setIsUnitDropdownOpen(false);
                                                                        }}
                                                                    >
                                                                        <div className={styles.optionContent}>
                                                                            <span className={styles.optionTitle}>Any / No Preference</span>
                                                                            <span className={styles.optionSubtitle}>I'm open to any available unit</span>
                                                                        </div>
                                                                        {!selectedUnit && <Check size={16} className={styles.checkIcon} />}
                                                                    </div>

                                                                    {units
                                                                        .filter(u => u.status === 'vacant' || u.status === 'available')
                                                                        .map(u => (
                                                                            <div
                                                                                key={u.id}
                                                                                className={`${styles.customOption} ${selectedUnit === u.unit_number ? styles.selected : ''}`}
                                                                                onClick={() => {
                                                                                    if (u.unit_number) {
                                                                                        setSelectedUnit(u.unit_number);
                                                                                        setIsUnitDropdownOpen(false);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <div className={styles.optionContent}>
                                                                                    <span className={styles.optionTitle}>Unit {u.unit_number}</span>
                                                                                    <span className={styles.optionSubtitle}>
                                                                                        {u.rent_amount ? `₱${u.rent_amount.toLocaleString()}/mo` : 'Price on Request'}
                                                                                    </span>
                                                                                </div>
                                                                                {selectedUnit === u.unit_number && <Check size={16} className={styles.checkIcon} />}
                                                                            </div>
                                                                        ))
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className={styles.inputGroup}>
                                                    <label>Message</label>
                                                    <div className={`${styles.inputWrapper} ${styles.textareaWrapper}`}>
                                                        <textarea
                                                            placeholder="Hi, I'm interested in this property..."
                                                            rows={4}
                                                            value={inquiryForm.message}
                                                            onChange={(e) => setInquiryForm(f => ({ ...f, message: e.target.value }))}
                                                            required
                                                            className={styles.textareaField}
                                                        />
                                                    </div>
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
                                                            <span>Send Request</span>
                                                            <Send size={18} />
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

            {/* FULLSCREEN OVERLAY */}
            {isExpanded && (
                <div className={styles.expandedOverlay}>
                    {/* Header Controls */}
                    <div className={styles.expandedHeader}>
                        <div className={styles.expandedHeaderContent}>
                            {/* Allow switching views even in expanded mode */}
                            <button
                                className={`${styles.viewBtn} ${activeTab === 'photos' ? styles.activeView : ''}`}
                                onClick={() => setActiveTab('photos')}
                            >
                                Photos
                            </button>
                            <button
                                className={`${styles.viewBtn} ${activeTab === 'blueprint' ? styles.activeView : ''}`}
                                onClick={() => setActiveTab('blueprint')}
                            >
                                <LayoutTemplate size={16} style={{ marginRight: 6 }} />
                                Unit Map
                            </button>
                        </div>

                        <button
                            className={styles.expandedCloseBtn}
                            onClick={() => setIsExpanded(false)}
                            title="Exit Fullscreen"
                        >
                            <Minimize2 size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className={styles.expandedContent}>
                        {activeTab === 'photos' ? (
                            <>
                                {listing?.listing_photos && listing.listing_photos.length > 0 ? (
                                    <img
                                        src={listing.listing_photos[currentPhotoIndex].url}
                                        alt={listing.listing_photos[currentPhotoIndex].caption || listing.title}
                                        className={styles.expandedImage}
                                    />
                                ) : (
                                    <div style={{ color: 'white' }}>No Photos</div>
                                )}

                                {/* Photo Navigation in Fullscreen */}
                                {listing?.listing_photos && listing.listing_photos.length > 1 && (
                                    <>
                                        <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={prevPhoto}>
                                            <ChevronLeft size={32} />
                                        </button>
                                        <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={nextPhoto}>
                                            <ChevronRight size={32} />
                                        </button>

                                        {/* Bottom Caption Overlay */}
                                        <div className={styles.galleryOverlay}>
                                            <div className={styles.galleryCounter}>
                                                {currentPhotoIndex + 1} / {listing.listing_photos.length}
                                            </div>
                                            {listing.listing_photos[currentPhotoIndex].caption && (
                                                <p>{listing.listing_photos[currentPhotoIndex].caption}</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            /* Expanded Blueprint */
                            <VisualBuilder
                                propertyId={listing?.property_id || ''}
                                initialUnits={units}
                                initialTiles={tiles}
                                readOnly={true}
                                onUnitClick={handleUnitClick}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
