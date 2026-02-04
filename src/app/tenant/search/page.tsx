"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search,
    MapPin,
    ArrowLeft,
    Building,
    Home,
    Check,
    List,
    Map as MapIcon,
    Heart,
    Star,
    LocateFixed,
    X,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import { createClient } from '@/utils/supabase/client';
import ListingDetailModal from '@/components/tenant/ListingDetailModal';

// Dynamically import Map to avoid SSR issues
const LeafletMap = dynamic(() => import('@/components/tenant/Map'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#94a3b8' }}>
            Loading Map...
        </div>
    )
});

interface Property {
    id: any;
    name: string; // mapped from title
    type: string; // mapped from property_type
    price: number; // mapped from price_range_min
    rating: number; // mock or calculated
    distance: string; // calculated
    features: string[]; // mapped from amenities
    image: string; // mapped from cover_photo
    lat: number;
    lng: number;
    description?: string;
}

interface LocationSuggestion {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

import { useRouter, useSearchParams } from 'next/navigation';

export default function TenantSearch() {
    const searchParams = useSearchParams();
    const initialListingId = searchParams.get('id');

    const [activeType, setActiveType] = useState('all');
    const [mapView, setMapView] = useState(true);
    const [selectedPropId, setSelectedPropId] = useState<string | null>(initialListingId); // Used for Modal
    const [focusedPropId, setFocusedPropId] = useState<string | null>(null); // Used for Map highlight/focus

    // Real Data State
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

    // Default Center (Valenzuela City)
    const [mapCenter, setMapCenter] = useState<[number, number]>([14.6819, 120.9772]);
    // Search Origin (Separate from map center to prevent re-fetching on hover/pan)
    const [searchOrigin, setSearchOrigin] = useState<[number, number]>([14.6819, 120.9772]);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<LocationSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('Valenzuela City');

    // Filters
    const [priceRange, setPriceRange] = useState<number>(10000);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

    // Search Radius State
    const [searchRadius, setSearchRadius] = useState<number>(3000);
    const [showSearchRadius, setShowSearchRadius] = useState<boolean>(true);

    const searchRef = useRef<HTMLDivElement>(null);
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    // Debounced location search using OpenStreetMap Nominatim
    const searchLocation = useCallback(async (query: string) => {
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&limit=5`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await response.json();
            setSearchResults(data);
            setShowDropdown(true);
        } catch (error) {
            console.error('Error searching location:', error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Handle search input change with debounce
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            searchLocation(value);
        }, 300);
    };

    // Handle location selection
    const handleSelectLocation = (location: LocationSuggestion) => {
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon);
        setMapCenter([lat, lng]);
        setSearchOrigin([lat, lng]);
        setSelectedLocation(location.display_name.split(',')[0]);
        setSearchQuery('');
        setShowDropdown(false);
        setSearchResults([]);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchProperties = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();

        // Fetch published listings
        const { data, error } = await supabase
            .from('property_listings')
            .select(`
                id, 
                title, 
                property_type,
                price_range_min,
                lat, 
                lng,
                description,
                listing_photos (url, is_primary),
                listing_amenities (amenities (name))
            `)
            .eq('status', 'published');

        if (error) {
            console.error('Error fetching properties:', error);
            setLoading(false);
            return;
        }

        if (data) {
            const mappedProps: Property[] = data.map((p: any) => {
                // Determine cover photo
                const coverPhoto = p.listing_photos?.find((ph: any) => ph.is_primary)?.url
                    || p.listing_photos?.[0]?.url
                    || null;

                // Map amenities names
                const features = p.listing_amenities?.map((la: any) => la.amenities?.name).filter(Boolean) || [];

                // Use random color if no image
                const image = coverPhoto
                    ? `url(${coverPhoto})`
                    : `linear-gradient(135deg, ${getRandomColor()} 0%, ${getRandomColor()} 100%)`;

                // Calculate pseudo-distance (mock for now as we don't have user's exact starting point or routing)
                // In a real app, this would calculate distance from `searchOrigin`
                const distanceVal = calculateDistance(searchOrigin[0], searchOrigin[1], p.lat || searchOrigin[0], p.lng || searchOrigin[1]);

                return {
                    id: p.id,
                    name: p.title,
                    type: p.property_type,
                    price: p.price_range_min || 0,
                    rating: 4.5 + (Math.random() * 0.5), // Mock rating since we don't have reviews yet
                    distance: distanceVal < 1 ? `${(distanceVal * 1000).toFixed(0)}m` : `${distanceVal.toFixed(1)}km`,
                    features: features,
                    image: image,
                    lat: p.lat || searchOrigin[0] + (Math.random() - 0.5) * 0.02, // Fallback random pos if no lat/lng
                    lng: p.lng || searchOrigin[1] + (Math.random() - 0.5) * 0.02,
                    description: p.description
                };
            });

            // Filter based on active filters
            let filtered = mappedProps;

            if (activeType !== 'all') {
                if (activeType === 'dorms') {
                    filtered = filtered.filter(p => p.type === 'dormitory' || p.type === 'boarding_house');
                } else if (activeType === 'apartments') {
                    filtered = filtered.filter(p => p.type === 'apartment' || p.type === 'condo' || p.type === 'house');
                }
            }

            if (priceRange < 15000) {
                filtered = filtered.filter(p => p.price <= priceRange);
            }

            if (selectedAmenities.length > 0) {
                filtered = filtered.filter(p =>
                    selectedAmenities.every(amenity => p.features.includes(amenity))
                );
            }

            setProperties(filtered);
        }
        setLoading(false);
    }, [searchOrigin, activeType, priceRange, selectedAmenities]);

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    };

    const deg2rad = (deg: number) => {
        return deg * (Math.PI / 180);
    };

    const getRandomColor = () => {
        const colors = ['#e0c3fc', '#8ec5fc', '#f093fb', '#f5576c', '#a8edea', '#fed6e3', '#f6d365', '#fda085'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const handleUseLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                setMapCenter([latitude, longitude]);
                setSearchOrigin([latitude, longitude]);
                setUserLocation([latitude, longitude]);
            }, (error) => {
                console.error("Error getting location:", error);
                alert("Could not get your location. Please check your permissions.");
            });
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    const toggleAmenity = (amenity: string) => {
        if (selectedAmenities.includes(amenity)) {
            setSelectedAmenities(prev => prev.filter(a => a !== amenity));
        } else {
            setSelectedAmenities(prev => [...prev, amenity]);
        }
    };

    return (
        <div className={styles.container}>
            {/* Top Navigation Bar */}
            <header className={styles.topBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)' }}>
                        <ArrowLeft size={18} />
                    </Link>

                    {/* Functional Search Bar */}
                    <div className={styles.searchBarContainer} ref={searchRef}>
                        <div className={styles.searchInputWrapper}>
                            <Search size={18} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder={`Search in ${selectedLocation}...`}
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                className={styles.searchInput}
                            />
                            {isSearching && <Loader2 size={16} className={styles.searchSpinner} />}
                            {searchQuery && !isSearching && (
                                <button
                                    className={styles.clearSearch}
                                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {showDropdown && searchResults.length > 0 && (
                            <div className={styles.searchDropdown}>
                                {searchResults.map((result) => (
                                    <div
                                        key={result.place_id}
                                        className={styles.searchResultItem}
                                        onClick={() => handleSelectLocation(result)}
                                    >
                                        <MapPin size={16} />
                                        <span>{result.display_name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.headerActions}>
                    <div className={styles.toggleGroup}>
                        <button
                            className={`${styles.toggleItem} ${activeType === 'all' ? styles.active : ''}`}
                            onClick={() => setActiveType('all')}
                        >
                            <List size={16} /> All
                        </button>
                        <button
                            className={`${styles.toggleItem} ${activeType === 'apartments' ? styles.active : ''}`}
                            onClick={() => setActiveType('apartments')}
                        >
                            <Building size={16} /> Apartments
                        </button>
                        <button
                            className={`${styles.toggleItem} ${activeType === 'dorms' ? styles.active : ''}`}
                            onClick={() => setActiveType('dorms')}
                        >
                            <Home size={16} /> Dorms
                        </button>
                    </div>

                    <div className={styles.toggleGroup}>
                        <button
                            className={`${styles.toggleItem} ${!mapView ? styles.active : ''}`}
                            onClick={() => setMapView(false)}
                        >
                            <List size={16} /> List
                        </button>
                        <button
                            className={`${styles.toggleItem} ${mapView ? styles.active : ''}`}
                            onClick={() => setMapView(true)}
                        >
                            <MapIcon size={16} /> Map
                        </button>
                    </div>
                </div>
            </header>

            <div className={styles.contentArea}>
                {/* Sidebar Filters */}
                <aside className={styles.filterSidebar}>
                    <div className={styles.filterScroll}>
                        <div className={styles.filterSection}>
                            <h3>Category</h3>
                            <div className={styles.categorySelect}>
                                <div
                                    className={`${styles.categoryOption} ${activeType === 'apartments' ? styles.selected : ''}`}
                                    onClick={() => setActiveType(activeType === 'apartments' ? 'all' : 'apartments')}
                                >
                                    <span style={{ fontSize: '1.5rem' }}>🏢</span>
                                    <span>Apartments</span>
                                </div>
                                <div
                                    className={`${styles.categoryOption} ${activeType === 'dorms' ? styles.selected : ''}`}
                                    onClick={() => setActiveType(activeType === 'dorms' ? 'all' : 'dorms')}
                                >
                                    <span style={{ fontSize: '1.5rem' }}>🎓</span>
                                    <span>Dorms</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.filterSection}>
                            <h3>Amenities</h3>
                            <div className={styles.checkboxList}>
                                {['Wifi', 'Parking', 'Gym', 'Pool', 'Air Conditioning', 'Pets Allowed'].map((item, i) => (
                                    <div
                                        key={item}
                                        className={`${styles.checkboxItem} ${selectedAmenities.includes(item) ? styles.checked : ''}`}
                                        onClick={() => toggleAmenity(item)}
                                    >
                                        <div className={styles.checkboxLabel}>
                                            <div className={styles.customCheckbox}>
                                                {selectedAmenities.includes(item) && <Check size={14} strokeWidth={3} />}
                                            </div>
                                            {item}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.filterSection}>
                            <h3>Search Distance</h3>
                            <div
                                className={`${styles.checkboxItem} ${showSearchRadius ? styles.checked : ''}`}
                                onClick={() => setShowSearchRadius(!showSearchRadius)}
                            >
                                <div className={styles.checkboxLabel}>
                                    <div className={styles.customCheckbox}>
                                        {showSearchRadius && <Check size={14} strokeWidth={3} />}
                                    </div>
                                    Show Proximity Bubble
                                </div>
                            </div>

                            {showSearchRadius && (
                                <div style={{ marginTop: '1rem', padding: '0 0.5rem' }}>
                                    <input
                                        type="range"
                                        min="500"
                                        max="10000"
                                        step="500"
                                        value={searchRadius}
                                        onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                                        className={styles.rangeSlider}
                                    />
                                    <div className={styles.rangeInputs} style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                        <span>{(searchRadius / 1000).toFixed(1)} km</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.filterSection}>
                            <h3>Price Range</h3>
                            <div className={styles.rangeInputs}>
                                <span>₱0</span>
                                <span>₱{priceRange.toLocaleString()}</span>
                            </div>
                            <input
                                type="range"
                                min="1000"
                                max="30000"
                                step="500"
                                value={priceRange}
                                onChange={(e) => setPriceRange(parseInt(e.target.value))}
                                className={styles.rangeSlider}
                            />
                        </div>
                    </div>
                </aside>

                {/* Map & Results Area */}
                <main className={styles.resultsArea}>
                    {mapView && (
                        <div className={styles.mapContainer}>
                            <LeafletMap
                                properties={properties}
                                center={mapCenter}
                                userLocation={userLocation}
                                onMarkerClick={(id) => {
                                    setFocusedPropId(String(id));
                                }}
                                focusedId={focusedPropId}
                                searchOrigin={searchOrigin}
                                searchRadius={searchRadius}
                                showRadius={showSearchRadius}
                            />

                            {/* Floating "Search as I move" */}
                            <button className={styles.floatingSearch} onClick={handleUseLocation}>
                                <LocateFixed size={16} color="var(--primary)" />
                                {userLocation ? 'Update my location' : 'Use my GPS Location'}
                            </button>
                        </div>
                    )}

                    {/* Results Overlay (Right Side on Map View, Full width on List View) */}
                    <div className={mapView ? styles.resultsOverlay : styles.resultsListFull}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem', marginBottom: '1rem', pointerEvents: 'auto' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{properties.length} Properties</span>
                            <button style={{
                                background: 'white',
                                border: '1px solid var(--border)',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                color: 'var(--muted-foreground)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                Popular <ArrowLeft size={12} style={{ transform: 'rotate(-90deg)' }} />
                            </button>
                        </div>

                        <div className={mapView ? styles.resultsList : styles.resultsGrid}>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading properties...</div>
                            ) : properties.map(prop => (
                                <div
                                    key={prop.id}
                                    className={`${styles.resultCard} ${focusedPropId === prop.id ? styles.active : ''}`}
                                    onClick={() => {
                                        setFocusedPropId(prop.id);
                                        setMapCenter([prop.lat, prop.lng]);
                                    }}
                                >
                                    <div className={styles.cardImages}>
                                        <div
                                            className={styles.cardImage}
                                            style={{
                                                background: prop.image.startsWith('url') ? prop.image : prop.image,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }}
                                        />
                                        <button className={styles.favoriteBtn}>
                                            <Heart size={16} />
                                        </button>
                                        {prop.rating >= 4.8 && (
                                            <div className={styles.cardBadge}>
                                                <Star size={12} fill="currentColor" style={{ display: 'inline', marginRight: 4 }} />
                                                Top Rated
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.cardContent}>
                                        <div className={styles.cardHeader}>
                                            <div>
                                                <h3 className={styles.cardTitle}>{prop.name}</h3>
                                                <div className={styles.cardMeta}>{prop.distance} • {prop.type}</div>
                                            </div>
                                            <div className={styles.cardBadge} style={{ position: 'static', background: '#f0f9ff', color: 'var(--primary)', marginTop: 0 }}>
                                                ★ {prop.rating.toFixed(1)}
                                            </div>
                                        </div>

                                        <div className={styles.cardPrice}>
                                            ₱{prop.price.toLocaleString()}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--muted-foreground)' }}>/mo</span>
                                        </div>

                                        <div className={styles.cardChips}>
                                            {prop.features.slice(0, 3).map(f => (
                                                <span key={f} className={styles.cardChip}>{f}</span>
                                            ))}
                                            {prop.features.length > 3 && (
                                                <span className={styles.cardChip}>+{prop.features.length - 3}</span>
                                            )}
                                        </div>

                                        {/* View Details Button - Shows when focused or in grid view */}
                                        {(focusedPropId === prop.id || !mapView) && (
                                            <button
                                                className={styles.viewDetailsBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent re-triggering card click
                                                    setSelectedPropId(prop.id);
                                                }}
                                            >
                                                See Details
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>

            {/* Listing Detail Modal */}
            {selectedPropId && (
                <ListingDetailModal
                    listingId={selectedPropId}
                    onClose={() => setSelectedPropId(null)}
                />
            )}
        </div>
    );
}
