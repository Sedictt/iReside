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
    name: string;
    type: string;
    price: number;
    rating: number;
    distance: string;
    features: string[];
    image: string;
    lat: number;
    lng: number;
}

interface LocationSuggestion {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

export default function TenantSearch() {
    const [activeType, setActiveType] = useState('apartments');
    const [mapView, setMapView] = useState(true);
    const [selectedProp, setSelectedProp] = useState<any | null>(null);

    // Real Data State
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

    // Default Center (Valenzuela City)
    const [mapCenter, setMapCenter] = useState<[number, number]>([14.6819, 120.9772]);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<LocationSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('Valenzuela City');
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

    useEffect(() => {
        async function fetchProperties() {
            const supabase = createClient();

            // Fetch properties with their units to calculate price range
            const { data, error } = await supabase
                .from('properties')
                .select(`
          id, 
          name, 
          address, 
          lat, 
          lng,
          units (
            rent_amount,
            unit_type
          )
        `);

            if (error) {
                console.error('Error fetching properties:', error);
                setLoading(false);
                return;
            }

            if (data) {
                const mappedProps = data.map((p: any) => {
                    // Calculate lowest price
                    const prices = p.units?.map((u: any) => u.rent_amount) || [];
                    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

                    // Determine simplified type
                    const type = p.units?.some((u: any) => u.unit_type === 'dorm') ? 'Dormitory' : 'Apartment';

                    // Mock visual data if missing
                    return {
                        id: p.id,
                        name: p.name,
                        type: type,
                        price: minPrice,
                        rating: 4.5 + (Math.random() * 0.5), // Mock rating
                        distance: "1.2km", // Mock distance
                        features: ["Wifi", "Security"], // Mock features
                        image: `linear-gradient(135deg, ${getRandomColor()} 0%, ${getRandomColor()} 100%)`, // Mock image
                        lat: p.lat || 14.6819 + (Math.random() - 0.5) * 0.05, // Use DB lat or random around Valenzuela
                        lng: p.lng || 120.9772 + (Math.random() - 0.5) * 0.05
                    };
                });

                setProperties(mappedProps);
            }
            setLoading(false);
        }

        fetchProperties();
    }, []);

    const getRandomColor = () => {
        const colors = ['#e0c3fc', '#8ec5fc', '#f093fb', '#f5576c', '#a8edea', '#fed6e3', '#f6d365', '#fda085'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const handleUseLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                setMapCenter([latitude, longitude]);
                setUserLocation([latitude, longitude]);
            }, (error) => {
                console.error("Error getting location:", error);
                alert("Could not get your location. Please check your permissions.");
            });
        } else {
            alert("Geolocation is not supported by your browser.");
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
                            className={`${styles.toggleItem} ${activeType === 'apartments' ? styles.active : ''}`}
                            onClick={() => setActiveType('apartments')}
                        >
                            <Building size={16} /> For Rent
                        </button>
                        <button
                            className={`${styles.toggleItem} ${activeType === 'dorms' ? styles.active : ''}`}
                            onClick={() => setActiveType('dorms')}
                        >
                            <Home size={16} /> For Sale
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
                    <div className={styles.filterSection}>
                        <h3>Category</h3>
                        <div className={styles.categorySelect}>
                            <div
                                className={`${styles.categoryOption} ${activeType === 'apartments' ? styles.selected : ''}`}
                                onClick={() => setActiveType('apartments')}
                            >
                                🏢 Apartments
                            </div>
                            <div
                                className={`${styles.categoryOption} ${activeType === 'dorms' ? styles.selected : ''}`}
                                onClick={() => setActiveType('dorms')}
                            >
                                🎓 Dorms
                            </div>
                        </div>
                    </div>

                    <div className={styles.filterSection}>
                        <h3>Amenities</h3>
                        <div className={styles.checkboxList}>
                            {['Wifi', 'Parking', 'Gym', 'Pool', 'Air Conditioning'].map((item, i) => (
                                <div key={item} className={`${styles.checkboxItem} ${i < 2 ? styles.checked : ''}`}>
                                    <div className={styles.checkboxLabel}>
                                        {item}
                                    </div>
                                    <div className={styles.customCheckbox}>
                                        {i < 2 && <Check size={12} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.filterSection}>
                        <h3>Price Range <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--muted-foreground)' }}>Per month</span></h3>
                        <div style={{ padding: '0 0.5rem' }}>
                            <input
                                type="range"
                                min="0"
                                max="3000"
                                className={styles.rangeSlider}
                                style={{ width: '100%', accentColor: 'var(--foreground)' }}
                            />
                        </div>
                        <div className={styles.rangeInputs}>
                            <span>$500</span>
                            <span>Average: $1,200</span>
                        </div>
                    </div>

                    <div className={styles.filterSection}>
                        <h3>Rating</h3>
                        <div className={styles.ratingGroup}>
                            {['Any', '3+', '4+', '★ 5'].map((r, i) => (
                                <div key={r} className={`${styles.ratingFilter} ${i === 2 ? styles.active : ''}`}>
                                    {r}
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Map & Results Area */}
                <main className={styles.resultsArea}>
                    <div className={styles.mapContainer}>
                        <LeafletMap
                            properties={properties}
                            center={mapCenter}
                            userLocation={userLocation}
                            onMarkerClick={(id) => setSelectedProp(id)}
                        />

                        {/* Floating "Search as I move" */}
                        <button className={styles.floatingSearch} onClick={handleUseLocation}>
                            <LocateFixed size={16} color="var(--primary)" />
                            {userLocation ? 'Update my location' : 'Use my GPS Location'}
                        </button>
                    </div>

                    {/* Results Overlay (Right Side) */}
                    <div className={styles.resultsOverlay}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 1rem' }}>
                            <span style={{ fontWeight: 600 }}>{properties.length} Results</span>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', cursor: 'pointer' }}>Popular first ↕</span>
                        </div>

                        <div className={styles.resultsList}>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading properties...</div>
                            ) : properties.map(prop => (
                                <div
                                    key={prop.id}
                                    className={styles.resultCard}
                                    onMouseEnter={() => {
                                        setSelectedProp(prop.id);
                                        setMapCenter([prop.lat, prop.lng]);
                                    }}
                                    style={selectedProp === prop.id ? { boxShadow: '0 0 0 2px var(--primary)' } : {}}
                                >
                                    <div className={styles.cardImages}>
                                        <div
                                            className={styles.cardImage}
                                            style={{ background: prop.image }}
                                        />
                                        <button className={styles.favoriteBtn}>
                                            <Heart size={16} />
                                        </button>
                                        {prop.rating >= 5 && (
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
                                            ₱{prop.price}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--muted-foreground)' }}>/mo</span>
                                        </div>

                                        <div className={styles.cardChips}>
                                            {prop.features.map(f => (
                                                <span key={f} className={styles.cardChip}>{f}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
