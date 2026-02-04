"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
    ArrowLeft,
    Save,
    Eye,
    Loader2,
    Building2,
    MapPin,
    DollarSign,
    Info,
    Phone,
    Home,
    Shield,
    FileText,
    Settings,
    Image as ImageIcon,
    ChevronRight,
    Globe,
    CheckCircle2,
    AlertCircle,
    Users,
    Clock,
    BadgeCheck
} from "lucide-react";

// Dynamically import Map to prevent SSR issues
const LocationPickerMap = dynamic(() => import('@/components/landlord/LocationPickerMap'), {
    ssr: false,
    loading: () => <div style={{ height: '300px', width: '100%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>
});
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import styles from "./edit.module.css";

type Amenity = {
    id: string;
    name: string;
    icon: string;
    category: string;
};

type ListingData = {
    id: string;
    property_id: string;
    title: string;
    headline: string;
    description: string;
    status: 'draft' | 'published' | 'paused' | 'archived';
    is_featured: boolean;
    display_address: string;
    city: string;
    barangay: string;
    landmark: string;
    lat: number | null;
    lng: number | null;
    price_range_min: number | null;
    price_range_max: number | null;
    price_display: string;
    property_type: string;
    total_units: number;
    available_units: number;
    show_phone: boolean;
    contact_phone: string;
    show_email: boolean;
    contact_email: string;
    whatsapp_number: string;
    facebook_page: string;
    pets_allowed: boolean;
    smoking_allowed: boolean;
    visitors_allowed: boolean;
    curfew_time: string | null;
    gender_restriction: string;
    min_lease_months: number;
    max_lease_months: number | null;
    deposit_months: number;
    advance_months: number;
    meta_description: string;
    keywords: string[];
    slug: string;
    view_count: number;
    inquiry_count: number;
    published_at: string | null;
    created_at: string;
    updated_at: string;
};

const defaultListing: Partial<ListingData> = {
    title: '',
    headline: '',
    description: '',
    display_address: '',
    city: '',
    barangay: '',
    landmark: '',
    price_display: '',
    property_type: 'apartment',
    total_units: 1,
    available_units: 0,
    show_phone: true,
    contact_phone: '',
    show_email: true,
    contact_email: '',
    whatsapp_number: '',
    facebook_page: '',
    pets_allowed: false,
    smoking_allowed: false,
    visitors_allowed: true,
    curfew_time: null,
    gender_restriction: 'none',
    min_lease_months: 1,
    max_lease_months: null,
    deposit_months: 1,
    advance_months: 1,
    meta_description: '',
    keywords: []
};

export default function EditListingPage() {
    const params = useParams();
    const router = useRouter();
    const listingId = params.id as string;

    const [listing, setListing] = useState<Partial<ListingData>>(defaultListing);
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [hasChanges, setHasChanges] = useState(false);
    const [photoCount, setPhotoCount] = useState(0);

    const supabase = useMemo(() => createClient(), []);

    const fetchListing = useCallback(async () => {
        setIsLoading(true);

        // Fetch listing data
        const { data: listingData, error } = await supabase
            .from('property_listings')
            .select('*')
            .eq('id', listingId)
            .single();

        if (error || !listingData) {
            alert('Listing not found');
            router.push('/landlord/listings');
            return;
        }

        setListing(listingData);

        // Fetch amenities
        const { data: amenitiesData } = await supabase
            .from('amenities')
            .select('*')
            .order('category', { ascending: true });

        if (amenitiesData) {
            setAmenities(amenitiesData);
        }

        // Fetch selected amenities
        const { data: listingAmenities } = await supabase
            .from('listing_amenities')
            .select('amenity_id')
            .eq('listing_id', listingId);

        if (listingAmenities) {
            setSelectedAmenities(listingAmenities.map(la => la.amenity_id));
        }

        // Fetch photo count
        const { count } = await supabase
            .from('listing_photos')
            .select('*', { count: 'exact', head: true })
            .eq('listing_id', listingId);

        setPhotoCount(count || 0);

        setIsLoading(false);
    }, [supabase, listingId, router]);

    useEffect(() => {
        fetchListing();
    }, [fetchListing]);

    function updateField<K extends keyof ListingData>(field: K, value: ListingData[K]) {
        setListing(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    }

    function toggleAmenity(amenityId: string) {
        setSelectedAmenities(prev =>
            prev.includes(amenityId)
                ? prev.filter(id => id !== amenityId)
                : [...prev, amenityId]
        );
        setHasChanges(true);
    }

    async function saveListing(publish = false) {
        setIsSaving(true);

        const updateData = {
            ...listing,
            status: publish ? 'published' : listing.status,
            published_at: publish && !listing.published_at ? new Date().toISOString() : listing.published_at
        };

        // Remove fields that shouldn't be updated
        delete (updateData as any).id;
        delete (updateData as any).created_at;
        delete (updateData as any).updated_at;
        delete (updateData as any).view_count;
        delete (updateData as any).inquiry_count;
        delete (updateData as any).slug;

        const { error } = await supabase
            .from('property_listings')
            .update(updateData)
            .eq('id', listingId);

        if (error) {
            alert('Error saving listing: ' + error.message);
            setIsSaving(false);
            return;
        }

        // Update amenities
        await supabase
            .from('listing_amenities')
            .delete()
            .eq('listing_id', listingId);

        if (selectedAmenities.length > 0) {
            await supabase
                .from('listing_amenities')
                .insert(selectedAmenities.map(amenityId => ({
                    listing_id: listingId,
                    amenity_id: amenityId
                })));
        }

        setIsSaving(false);
        setHasChanges(false);

        if (publish) {
            alert('Listing published successfully!');
        }
    }

    async function geocodeAddress() {
        if (!listing.city) return;

        // Construct query: Display Address + City + Barangay + "Philippines"
        const queryParts = [listing.display_address, listing.barangay, listing.city, 'Philippines']
            .filter(part => part && part.trim() !== '');

        const query = queryParts.join(', ');

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                updateField('lat', parseFloat(lat));
                updateField('lng', parseFloat(lon));
                alert(`Location found: ${data[0].display_name}`);
            } else {
                alert('Could not find coordinates for this address. Please try adding more details or manually enter lat/long.');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            alert('Error fetching coordinates. Please try again.');
        }
    }

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: <Info size={18} /> },
        { id: 'location', label: 'Location', icon: <MapPin size={18} /> },
        { id: 'pricing', label: 'Pricing', icon: <DollarSign size={18} /> },
        { id: 'amenities', label: 'Amenities', icon: <Home size={18} /> },
        { id: 'rules', label: 'House Rules', icon: <Shield size={18} /> },
        { id: 'contact', label: 'Contact', icon: <Phone size={18} /> },
        { id: 'terms', label: 'Lease Terms', icon: <FileText size={18} /> },
        { id: 'seo', label: 'SEO', icon: <Settings size={18} /> },
    ];

    const amenitiesByCategory = useMemo(() => {
        return amenities.reduce((acc, amenity) => {
            if (!acc[amenity.category]) {
                acc[amenity.category] = [];
            }
            acc[amenity.category].push(amenity);
            return acc;
        }, {} as Record<string, Amenity[]>);
    }, [amenities]);

    const getPublishReadiness = () => {
        const issues: string[] = [];
        if (!listing.title) issues.push('Title is required');
        if (!listing.city) issues.push('City is required');
        if (!listing.description) issues.push('Description is recommended');
        if (photoCount === 0) issues.push('At least one photo is recommended');
        if (!listing.contact_phone && !listing.contact_email) issues.push('At least one contact method is recommended');

        return {
            ready: issues.length <= 2,
            issues
        };
    };

    const readiness = getPublishReadiness();

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 className={styles.spinner} size={32} />
                <p>Loading listing...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/landlord/listings" className={styles.backBtn}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className={styles.title}>Edit Listing</h1>
                        <p className={styles.subtitle}>{listing.title}</p>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <div className={styles.statusIndicator}>
                        {listing.status === 'published' ? (
                            <><Globe size={16} className={styles.green} /> Published</>
                        ) : listing.status === 'draft' ? (
                            <><Clock size={16} className={styles.orange} /> Draft</>
                        ) : (
                            <><AlertCircle size={16} className={styles.gray} /> {listing.status}</>
                        )}
                    </div>

                    <Link href={`/landlord/listings/${listingId}/photos`} className={styles.photosBtn}>
                        <ImageIcon size={18} />
                        Photos ({photoCount})
                    </Link>

                    <button
                        className={styles.saveBtn}
                        onClick={() => saveListing(false)}
                        disabled={isSaving || !hasChanges}
                    >
                        {isSaving ? <Loader2 size={18} className={styles.spinner} /> : <Save size={18} />}
                        Save Draft
                    </button>

                    {listing.status !== 'published' && (
                        <button
                            className={styles.publishBtn}
                            onClick={() => saveListing(true)}
                            disabled={isSaving}
                        >
                            <Eye size={18} />
                            Publish
                        </button>
                    )}
                </div>
            </header>

            {/* Readiness Check */}
            {listing.status === 'draft' && (
                <div className={`${styles.readinessCard} ${readiness.ready ? styles.ready : styles.notReady}`}>
                    {readiness.ready ? (
                        <CheckCircle2 size={20} />
                    ) : (
                        <AlertCircle size={20} />
                    )}
                    <div className={styles.readinessText}>
                        <strong>{readiness.ready ? 'Ready to publish!' : 'Almost there...'}</strong>
                        <p>
                            {readiness.issues.length === 0
                                ? 'Your listing looks great and is ready to go live.'
                                : readiness.issues.join(' • ')
                            }
                        </p>
                    </div>
                </div>
            )}

            <div className={styles.layout}>
                {/* Sidebar Tabs */}
                <aside className={styles.sidebar}>
                    <nav className={styles.tabNav}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.icon}
                                {tab.label}
                                <ChevronRight size={16} className={styles.tabArrow} />
                            </button>
                        ))}
                    </nav>

                    {/* Quick Stats */}
                    <div className={styles.statsCard}>
                        <h4>Listing Stats</h4>
                        <div className={styles.statItem}>
                            <Eye size={16} />
                            <span>{listing.view_count || 0} views</span>
                        </div>
                        <div className={styles.statItem}>
                            <Users size={16} />
                            <span>{listing.inquiry_count || 0} inquiries</span>
                        </div>
                        <div className={styles.statItem}>
                            <ImageIcon size={16} />
                            <span>{photoCount} photos</span>
                        </div>
                        <div className={styles.statItem}>
                            <BadgeCheck size={16} />
                            <span>{selectedAmenities.length} amenities</span>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className={styles.main}>
                    {/* Basic Info Tab */}
                    {activeTab === 'basic' && (
                        <div className={styles.tabContent}>
                            <h2>Basic Information</h2>
                            <p className={styles.tabDesc}>The essential details about your property listing.</p>

                            <div className={styles.formGroup}>
                                <label>Listing Title *</label>
                                <input
                                    type="text"
                                    value={listing.title || ''}
                                    onChange={(e) => updateField('title', e.target.value)}
                                    placeholder="e.g., Modern Studios Near University Belt"
                                />
                                <span className={styles.hint}>Make it catchy and descriptive</span>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Headline / Tagline</label>
                                <input
                                    type="text"
                                    value={listing.headline || ''}
                                    onChange={(e) => updateField('headline', e.target.value)}
                                    placeholder="e.g., Affordable living with premium amenities"
                                    maxLength={100}
                                />
                                <span className={styles.hint}>A short, compelling tagline (max 100 chars)</span>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Property Type *</label>
                                <select
                                    value={listing.property_type || 'apartment'}
                                    onChange={(e) => updateField('property_type', e.target.value)}
                                >
                                    <option value="apartment">Apartment</option>
                                    <option value="dormitory">Dormitory</option>
                                    <option value="boarding_house">Boarding House</option>
                                    <option value="condo">Condominium</option>
                                    <option value="townhouse">Townhouse</option>
                                    <option value="house">House</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Full Description</label>
                                <textarea
                                    value={listing.description || ''}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    placeholder="Describe your property in detail. Include information about the neighborhood, nearby establishments, transportation options, and what makes your property special."
                                    rows={8}
                                />
                                <span className={styles.hint}>Be detailed to attract the right tenants</span>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Total Units</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={listing.total_units || 1}
                                        onChange={(e) => updateField('total_units', parseInt(e.target.value) || 1)}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Available Units</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={listing.available_units || 0}
                                        onChange={(e) => updateField('available_units', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Location Tab */}
                    {activeTab === 'location' && (
                        <div className={styles.tabContent}>
                            <h2>Location Details</h2>
                            <p className={styles.tabDesc}>Help potential tenants find your property.</p>

                            <div className={styles.formGroup}>
                                <label>City *</label>
                                <input
                                    type="text"
                                    value={listing.city || ''}
                                    onChange={(e) => updateField('city', e.target.value)}
                                    placeholder="e.g., Valenzuela City"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Barangay</label>
                                <input
                                    type="text"
                                    value={listing.barangay || ''}
                                    onChange={(e) => updateField('barangay', e.target.value)}
                                    placeholder="e.g., Karuhatan"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Display Address</label>
                                <input
                                    type="text"
                                    value={listing.display_address || ''}
                                    onChange={(e) => updateField('display_address', e.target.value)}
                                    placeholder="e.g., 123 Main Street (you can hide exact address for privacy)"
                                />
                                <span className={styles.hint}>This is what potential tenants will see publicly</span>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Nearby Landmark</label>
                                <input
                                    type="text"
                                    value={listing.landmark || ''}
                                    onChange={(e) => updateField('landmark', e.target.value)}
                                    placeholder="e.g., Near SM Valenzuela, 5 mins from LRT station"
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={listing.lat || ''}
                                        onChange={(e) => updateField('lat', parseFloat(e.target.value) || null)}
                                        placeholder="e.g., 14.6819"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={listing.lng || ''}
                                        onChange={(e) => updateField('lng', parseFloat(e.target.value) || null)}
                                        placeholder="e.g., 120.9772"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    onClick={geocodeAddress}
                                    disabled={!listing.city}
                                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                                >
                                    <MapPin size={14} style={{ marginRight: 6 }} />
                                    Get Coordinates from Address
                                </button>
                                <span className={styles.hint} style={{ marginTop: 0 }}>
                                    (Required for map display)
                                </span>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Pin Location on Map</label>
                                <div style={{ height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                    <LocationPickerMap
                                        lat={listing.lat || null}
                                        lng={listing.lng || null}
                                        onLocationSelect={(lat, lng) => {
                                            updateField('lat', lat);
                                            updateField('lng', lng);
                                        }}
                                    />
                                </div>
                                <span className={styles.hint}>Click on the map or drag the pin to set the precise location</span>
                            </div>
                        </div>
                    )}

                    {/* Pricing Tab */}
                    {activeTab === 'pricing' && (
                        <div className={styles.tabContent}>
                            <h2>Pricing Information</h2>
                            <p className={styles.tabDesc}>Set your rental prices to attract the right tenants.</p>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Minimum Price (₱)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={listing.price_range_min || ''}
                                        onChange={(e) => updateField('price_range_min', parseFloat(e.target.value) || null)}
                                        placeholder="e.g., 5000"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Maximum Price (₱)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={listing.price_range_max || ''}
                                        onChange={(e) => updateField('price_range_max', parseFloat(e.target.value) || null)}
                                        placeholder="e.g., 15000"
                                    />
                                </div>
                            </div>
                            <span className={styles.hint}>Leave blank if you prefer not to show pricing publicly</span>

                            <div className={styles.formGroup}>
                                <label>Price Display Text</label>
                                <input
                                    type="text"
                                    value={listing.price_display || ''}
                                    onChange={(e) => updateField('price_display', e.target.value)}
                                    placeholder="e.g., Starting at ₱5,000/month or Contact for pricing"
                                />
                                <span className={styles.hint}>Custom text to display instead of exact pricing</span>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Deposit (months)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.5}
                                        value={listing.deposit_months || 1}
                                        onChange={(e) => updateField('deposit_months', parseFloat(e.target.value) || 1)}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Advance (months)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.5}
                                        value={listing.advance_months || 1}
                                        onChange={(e) => updateField('advance_months', parseFloat(e.target.value) || 1)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Amenities Tab */}
                    {activeTab === 'amenities' && (
                        <div className={styles.tabContent}>
                            <h2>Property Amenities</h2>
                            <p className={styles.tabDesc}>Select all amenities available at your property.</p>

                            <div className={styles.selectedCount}>
                                <BadgeCheck size={18} />
                                {selectedAmenities.length} amenities selected
                            </div>

                            {Object.entries(amenitiesByCategory).map(([category, categoryAmenities]) => (
                                <div key={category} className={styles.amenityCategory}>
                                    <h3 className={styles.categoryTitle}>
                                        {category.charAt(0).toUpperCase() + category.slice(1)}
                                    </h3>
                                    <div className={styles.amenityGrid}>
                                        {categoryAmenities.map(amenity => (
                                            <button
                                                key={amenity.id}
                                                className={`${styles.amenityBtn} ${selectedAmenities.includes(amenity.id) ? styles.selected : ''}`}
                                                onClick={() => toggleAmenity(amenity.id)}
                                            >
                                                {selectedAmenities.includes(amenity.id) && <CheckCircle2 size={16} />}
                                                {amenity.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* House Rules Tab */}
                    {activeTab === 'rules' && (
                        <div className={styles.tabContent}>
                            <h2>House Rules</h2>
                            <p className={styles.tabDesc}>Set clear expectations for potential tenants.</p>

                            <div className={styles.toggleGrid}>
                                <div className={styles.toggleItem}>
                                    <div>
                                        <strong>Pets Allowed</strong>
                                        <p>Allow tenants to have pets</p>
                                    </div>
                                    <label className={styles.toggle}>
                                        <input
                                            type="checkbox"
                                            checked={listing.pets_allowed || false}
                                            onChange={(e) => updateField('pets_allowed', e.target.checked)}
                                        />
                                        <span className={styles.toggleSlider}></span>
                                    </label>
                                </div>

                                <div className={styles.toggleItem}>
                                    <div>
                                        <strong>Smoking Allowed</strong>
                                        <p>Allow smoking in the premises</p>
                                    </div>
                                    <label className={styles.toggle}>
                                        <input
                                            type="checkbox"
                                            checked={listing.smoking_allowed || false}
                                            onChange={(e) => updateField('smoking_allowed', e.target.checked)}
                                        />
                                        <span className={styles.toggleSlider}></span>
                                    </label>
                                </div>

                                <div className={styles.toggleItem}>
                                    <div>
                                        <strong>Visitors Allowed</strong>
                                        <p>Allow tenants to have visitors</p>
                                    </div>
                                    <label className={styles.toggle}>
                                        <input
                                            type="checkbox"
                                            checked={listing.visitors_allowed ?? true}
                                            onChange={(e) => updateField('visitors_allowed', e.target.checked)}
                                        />
                                        <span className={styles.toggleSlider}></span>
                                    </label>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Gender Restriction</label>
                                <select
                                    value={listing.gender_restriction || 'none'}
                                    onChange={(e) => updateField('gender_restriction', e.target.value)}
                                >
                                    <option value="none">No Restriction</option>
                                    <option value="male_only">Males Only</option>
                                    <option value="female_only">Females Only</option>
                                    <option value="couples_only">Couples Only</option>
                                    <option value="family_only">Families Only</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Curfew Time</label>
                                <input
                                    type="time"
                                    value={listing.curfew_time || ''}
                                    onChange={(e) => updateField('curfew_time', e.target.value || null)}
                                />
                                <span className={styles.hint}>Leave blank if there&apos;s no curfew</span>
                            </div>
                        </div>
                    )}

                    {/* Contact Tab */}
                    {activeTab === 'contact' && (
                        <div className={styles.tabContent}>
                            <h2>Contact Information</h2>
                            <p className={styles.tabDesc}>How potential tenants can reach you.</p>

                            <div className={styles.toggleItem}>
                                <div>
                                    <strong>Show Phone Number</strong>
                                    <p>Display your phone number on the listing</p>
                                </div>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={listing.show_phone ?? true}
                                        onChange={(e) => updateField('show_phone', e.target.checked)}
                                    />
                                    <span className={styles.toggleSlider}></span>
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Contact Phone</label>
                                <input
                                    type="tel"
                                    value={listing.contact_phone || ''}
                                    onChange={(e) => updateField('contact_phone', e.target.value)}
                                    placeholder="e.g., 09171234567"
                                />
                            </div>

                            <div className={styles.toggleItem}>
                                <div>
                                    <strong>Show Email</strong>
                                    <p>Display your email on the listing</p>
                                </div>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={listing.show_email ?? true}
                                        onChange={(e) => updateField('show_email', e.target.checked)}
                                    />
                                    <span className={styles.toggleSlider}></span>
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Contact Email</label>
                                <input
                                    type="email"
                                    value={listing.contact_email || ''}
                                    onChange={(e) => updateField('contact_email', e.target.value)}
                                    placeholder="e.g., landlord@email.com"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>WhatsApp Number</label>
                                <input
                                    type="tel"
                                    value={listing.whatsapp_number || ''}
                                    onChange={(e) => updateField('whatsapp_number', e.target.value)}
                                    placeholder="e.g., +639171234567"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Facebook Page</label>
                                <input
                                    type="url"
                                    value={listing.facebook_page || ''}
                                    onChange={(e) => updateField('facebook_page', e.target.value)}
                                    placeholder="e.g., https://facebook.com/yourpage"
                                />
                            </div>
                        </div>
                    )}

                    {/* Lease Terms Tab */}
                    {activeTab === 'terms' && (
                        <div className={styles.tabContent}>
                            <h2>Lease Terms</h2>
                            <p className={styles.tabDesc}>Define the rental terms for your property.</p>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Minimum Lease (months)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={listing.min_lease_months || 1}
                                        onChange={(e) => updateField('min_lease_months', parseInt(e.target.value) || 1)}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Maximum Lease (months)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={listing.max_lease_months || ''}
                                        onChange={(e) => updateField('max_lease_months', parseInt(e.target.value) || null)}
                                        placeholder="No maximum"
                                    />
                                </div>
                            </div>
                            <span className={styles.hint}>Leave maximum blank for no upper limit</span>
                        </div>
                    )}

                    {/* SEO Tab */}
                    {activeTab === 'seo' && (
                        <div className={styles.tabContent}>
                            <h2>SEO Settings</h2>
                            <p className={styles.tabDesc}>Optimize your listing for search engines.</p>

                            <div className={styles.formGroup}>
                                <label>URL Slug</label>
                                <div className={styles.slugPreview}>
                                    <span>yourdomain.com/browse/</span>
                                    <strong>{listing.slug || 'your-listing-slug'}</strong>
                                </div>
                                <span className={styles.hint}>Auto-generated from title. Cannot be edited.</span>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Meta Description</label>
                                <textarea
                                    value={listing.meta_description || ''}
                                    onChange={(e) => updateField('meta_description', e.target.value)}
                                    placeholder="A brief description for search engines (150-160 characters recommended)"
                                    rows={3}
                                    maxLength={160}
                                />
                                <span className={styles.hint}>{(listing.meta_description || '').length}/160 characters</span>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
