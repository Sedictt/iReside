"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Plus,
    Building2,
    Eye,
    EyeOff,
    Edit3,
    Trash2,
    Image as ImageIcon,
    MapPin,
    Users,
    Clock,
    TrendingUp,
    MoreVertical,
    Search,
    Filter,
    Globe,
    PauseCircle,
    PlayCircle,
    Loader2,
    ChevronRight,
    Star,
    ExternalLink
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import styles from "./listings.module.css";

type ListingStatus = 'draft' | 'published' | 'paused' | 'archived';

type PropertyListing = {
    id: string;
    property_id: string;
    title: string;
    headline: string | null;
    description: string | null;
    status: ListingStatus;
    is_featured: boolean;
    published_at: string | null;
    display_address: string | null;
    city: string;
    property_type: string;
    total_units: number;
    available_units: number;
    price_range_min: number | null;
    price_range_max: number | null;
    view_count: number;
    inquiry_count: number;
    slug: string | null;
    created_at: string;
    updated_at: string;
    cover_photo?: string | null;
    properties?: {
        name: string;
        address: string;
    };
};

type Property = {
    id: string;
    name: string;
    address: string;
    has_listing: boolean;
};

export default function ListingsPage() {
    const [listings, setListings] = useState<PropertyListing[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);

    const supabase = useMemo(() => createClient(), []);

    const fetchListings = useCallback(async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsLoading(false);
            return;
        }

        // Fetch listings with cover photo
        const { data: listingsData } = await supabase
            .from('property_listings')
            .select(`
                *,
                properties (name, address),
                listing_photos (url, is_primary)
            `)
            .eq('landlord_id', user.id)
            .order('updated_at', { ascending: false });

        if (listingsData) {
            const listings = listingsData.map((l: any) => ({
                ...l,
                cover_photo: l.listing_photos?.find((p: any) => p.is_primary)?.url || l.listing_photos?.[0]?.url || null
            }));
            setListings(listings);
        }

        // Fetch properties without listings for creation
        const { data: propsData } = await supabase
            .from('properties')
            .select('id, name, address')
            .eq('landlord_id', user.id);

        if (propsData && listingsData) {
            const listingPropertyIds = listingsData.map((l: any) => l.property_id);
            setProperties(propsData.map(p => ({
                ...p,
                has_listing: listingPropertyIds.includes(p.id)
            })));
        }

        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchListings();
    }, [fetchListings]);

    async function toggleListingStatus(listing: PropertyListing) {
        const newStatus = listing.status === 'published' ? 'paused' : 'published';
        const { error } = await supabase
            .from('property_listings')
            .update({
                status: newStatus,
                published_at: newStatus === 'published' ? new Date().toISOString() : listing.published_at
            })
            .eq('id', listing.id);

        if (!error) {
            setListings(prev => prev.map(l =>
                l.id === listing.id ? { ...l, status: newStatus } : l
            ));
        }
        setActionMenuId(null);
    }

    async function deleteListing(listingId: string) {
        if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
            return;
        }

        const { error } = await supabase
            .from('property_listings')
            .delete()
            .eq('id', listingId);

        if (!error) {
            setListings(prev => prev.filter(l => l.id !== listingId));
        }
        setActionMenuId(null);
    }

    const filteredListings = useMemo(() => {
        return listings.filter(listing => {
            const matchesSearch = !searchQuery ||
                listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                listing.city.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [listings, searchQuery, statusFilter]);

    const stats = useMemo(() => ({
        total: listings.length,
        published: listings.filter(l => l.status === 'published').length,
        drafts: listings.filter(l => l.status === 'draft').length,
        totalViews: listings.reduce((sum, l) => sum + (l.view_count || 0), 0),
        totalInquiries: listings.reduce((sum, l) => sum + (l.inquiry_count || 0), 0),
    }), [listings]);

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 className={styles.spinner} size={32} />
                <p>Loading listings...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <div>
                        <h1 className={styles.title}>Property Listings</h1>
                        <p className={styles.subtitle}>Manage and publish your properties to attract tenants</p>
                    </div>
                    <button
                        className={styles.createBtn}
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={18} />
                        Create Listing
                    </button>
                </div>

                {/* Stats Row */}
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}><Building2 size={20} /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats.total}</span>
                            <span className={styles.statLabel}>Total Listings</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.green}`}><Globe size={20} /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats.published}</span>
                            <span className={styles.statLabel}>Published</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.orange}`}><Clock size={20} /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats.drafts}</span>
                            <span className={styles.statLabel}>Drafts</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.purple}`}><TrendingUp size={20} /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats.totalViews.toLocaleString()}</span>
                            <span className={styles.statLabel}>Total Views</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.blue}`}><Users size={20} /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats.totalInquiries}</span>
                            <span className={styles.statLabel}>Inquiries</span>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className={styles.filtersRow}>
                    <div className={styles.searchBox}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search listings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <Filter size={16} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="published">Published</option>
                            <option value="draft">Drafts</option>
                            <option value="paused">Paused</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* Listings Grid */}
            {filteredListings.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <Building2 size={48} strokeWidth={1.5} />
                    </div>
                    <h2>No listings yet</h2>
                    <p>Create your first listing to start attracting potential tenants.</p>
                    <button
                        className={styles.createBtn}
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={18} />
                        Create Your First Listing
                    </button>
                </div>
            ) : (
                <div className={styles.listingsGrid}>
                    {filteredListings.map(listing => (
                        <ListingCard
                            key={listing.id}
                            listing={listing}
                            isMenuOpen={actionMenuId === listing.id}
                            onToggleMenu={() => setActionMenuId(actionMenuId === listing.id ? null : listing.id)}
                            onToggleStatus={() => toggleListingStatus(listing)}
                            onDelete={() => deleteListing(listing.id)}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateListingModal
                    properties={properties}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={fetchListings}
                />
            )}
        </div>
    );
}

function ListingCard({
    listing,
    isMenuOpen,
    onToggleMenu,
    onToggleStatus,
    onDelete
}: {
    listing: PropertyListing;
    isMenuOpen: boolean;
    onToggleMenu: () => void;
    onToggleStatus: () => void;
    onDelete: () => void;
}) {
    const statusConfig = {
        published: { label: 'Published', color: '#10b981', bg: '#d1fae5' },
        draft: { label: 'Draft', color: '#f59e0b', bg: '#fef3c7' },
        paused: { label: 'Paused', color: '#6b7280', bg: '#f3f4f6' },
        archived: { label: 'Archived', color: '#ef4444', bg: '#fee2e2' }
    };

    const status = statusConfig[listing.status];

    const propertyTypeLabels: Record<string, string> = {
        apartment: 'Apartment',
        dormitory: 'Dormitory',
        boarding_house: 'Boarding House',
        condo: 'Condominium',
        townhouse: 'Townhouse',
        house: 'House'
    };

    return (
        <div className={styles.listingCard}>
            {/* Cover Image */}
            <div className={styles.cardImage}>
                {listing.cover_photo ? (
                    <img src={listing.cover_photo} alt={listing.title} />
                ) : (
                    <div className={styles.noImage}>
                        <ImageIcon size={32} strokeWidth={1.5} />
                        <span>No photos</span>
                    </div>
                )}

                {/* Status Badge */}
                <span
                    className={styles.statusBadge}
                    style={{ background: status.bg, color: status.color }}
                >
                    {listing.status === 'published' ? <Eye size={12} /> : <EyeOff size={12} />}
                    {status.label}
                </span>

                {listing.is_featured && (
                    <span className={styles.featuredBadge}>
                        <Star size={12} fill="currentColor" />
                        Featured
                    </span>
                )}

                {/* Action Menu Toggle */}
                <button className={styles.menuBtn} onClick={onToggleMenu}>
                    <MoreVertical size={18} />
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                    <div className={styles.actionMenu}>
                        <Link href={`/landlord/listings/${listing.id}/edit`} className={styles.menuItem}>
                            <Edit3 size={16} />
                            Edit Listing
                        </Link>
                        <Link href={`/landlord/listings/${listing.id}/photos`} className={styles.menuItem}>
                            <ImageIcon size={16} />
                            Manage Photos
                        </Link>
                        {listing.status === 'published' && (
                            <a
                                href={`/tenant/search?id=${listing.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.menuItem}
                            >
                                <ExternalLink size={16} />
                                View Public Page
                            </a>
                        )}
                        <button className={styles.menuItem} onClick={onToggleStatus}>
                            {listing.status === 'published' ? (
                                <><PauseCircle size={16} /> Pause Listing</>
                            ) : (
                                <><PlayCircle size={16} /> Publish Listing</>
                            )}
                        </button>
                        <button className={`${styles.menuItem} ${styles.danger}`} onClick={onDelete}>
                            <Trash2 size={16} />
                            Delete Listing
                        </button>
                    </div>
                )}
            </div>

            {/* Card Content */}
            <div className={styles.cardContent}>
                <span className={styles.propertyType}>
                    {propertyTypeLabels[listing.property_type] || listing.property_type}
                </span>
                <h3 className={styles.cardTitle}>{listing.title}</h3>
                {listing.headline && <p className={styles.headline}>{listing.headline}</p>}

                <div className={styles.cardMeta}>
                    <span className={styles.location}>
                        <MapPin size={14} />
                        {listing.display_address || listing.city}
                    </span>
                    {(listing.price_range_min || listing.price_range_max) && (
                        <span className={styles.price}>
                            {listing.price_range_min && listing.price_range_max ? (
                                `₱${listing.price_range_min.toLocaleString()} - ₱${listing.price_range_max.toLocaleString()}`
                            ) : listing.price_range_min ? (
                                `From ₱${listing.price_range_min.toLocaleString()}`
                            ) : (
                                `Up to ₱${listing.price_range_max?.toLocaleString()}`
                            )}
                        </span>
                    )}
                </div>

                <div className={styles.cardStats}>
                    <div className={styles.stat}>
                        <Building2 size={14} />
                        <span>{listing.available_units}/{listing.total_units} Available</span>
                    </div>
                    <div className={styles.stat}>
                        <Eye size={14} />
                        <span>{listing.view_count} Views</span>
                    </div>
                    <div className={styles.stat}>
                        <Users size={14} />
                        <span>{listing.inquiry_count} Inquiries</span>
                    </div>
                </div>

                <Link
                    href={`/landlord/listings/${listing.id}/edit`}
                    className={styles.editLink}
                >
                    Edit Listing <ChevronRight size={16} />
                </Link>
            </div>
        </div>
    );
}

function CreateListingModal({
    properties,
    onClose,
    onCreated
}: {
    properties: Property[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
    const [title, setTitle] = useState("");
    const [propertyType, setPropertyType] = useState("apartment");
    const [city, setCity] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const supabase = useMemo(() => createClient(), []);

    const availableProperties = properties.filter(p => !p.has_listing);

    async function handleCreate() {
        if (!selectedPropertyId || !title || !propertyType || !city) {
            alert("Please fill in all required fields");
            return;
        }

        setIsCreating(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsCreating(false);
            return;
        }

        const { error } = await supabase
            .from('property_listings')
            .insert({
                property_id: selectedPropertyId,
                landlord_id: user.id,
                title,
                property_type: propertyType,
                city,
                status: 'draft'
            });

        setIsCreating(false);

        if (error) {
            alert("Error creating listing: " + error.message);
            return;
        }

        onCreated();
        onClose();
    }

    const selectedProperty = properties.find(p => p.id === selectedPropertyId);

    useEffect(() => {
        if (selectedProperty) {
            setTitle(selectedProperty.name);
            // Extract city from address (basic extraction)
            const addressParts = selectedProperty.address.split(',');
            if (addressParts.length >= 2) {
                setCity(addressParts[addressParts.length - 1].trim());
            }
        }
    }, [selectedProperty]);

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Create New Listing</h2>
                    <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                </div>

                <div className={styles.modalBody}>
                    {availableProperties.length === 0 ? (
                        <div className={styles.noProperties}>
                            <Building2 size={40} strokeWidth={1.5} />
                            <h3>No properties available</h3>
                            <p>All your properties already have listings, or you need to add properties first.</p>
                            <Link href="/landlord/properties" className={styles.linkBtn}>
                                Go to Properties
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className={styles.formGroup}>
                                <label>Select Property *</label>
                                <select
                                    value={selectedPropertyId}
                                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                                >
                                    <option value="">Choose a property...</option>
                                    {availableProperties.map(prop => (
                                        <option key={prop.id} value={prop.id}>
                                            {prop.name} - {prop.address}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Listing Title *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Modern Studio Apartments in Valenzuela"
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Property Type *</label>
                                    <select
                                        value={propertyType}
                                        onChange={(e) => setPropertyType(e.target.value)}
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
                                    <label>City *</label>
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="e.g., Valenzuela City"
                                    />
                                </div>
                            </div>

                            <p className={styles.hint}>
                                You can add more details, photos, and amenities after creating the listing.
                            </p>
                        </>
                    )}
                </div>

                {availableProperties.length > 0 && (
                    <div className={styles.modalFooter}>
                        <button className={styles.cancelBtn} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className={styles.submitBtn}
                            onClick={handleCreate}
                            disabled={isCreating || !selectedPropertyId || !title}
                        >
                            {isCreating ? (
                                <><Loader2 size={16} className={styles.spinner} /> Creating...</>
                            ) : (
                                <>Create Listing <ChevronRight size={16} /></>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
