"use client";

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Custom User Location Icon
const UserIcon = L.divIcon({
    className: 'user-location-marker',
    html: '<div style="background-color: #2563eb; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.3);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

interface Property {
    id: string;
    name: string;
    lat: number;
    lng: number;
    price: number | null;
    price_display?: string | null;
}

interface MapProps {
    properties: Property[];
    center: [number, number];
    userLocation?: [number, number] | null;
    onMarkerClick?: (id: string) => void;
}

export default function LeafletMap({ properties, center, userLocation, onMarkerClick }: MapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const userMarkerRef = useRef<L.Marker | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize map only once
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        // Create map instance
        const map = L.map(mapContainerRef.current, {
            center: center,
            zoom: 14,
            zoomControl: false
        });

        // Add tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Create markers layer group
        markersLayerRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;
        setIsInitialized(true);

        // Cleanup on unmount
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markersLayerRef.current = null;
                userMarkerRef.current = null;
            }
        };
    }, []);

    // Update center when it changes
    useEffect(() => {
        if (mapInstanceRef.current && isInitialized) {
            mapInstanceRef.current.flyTo(center, 15, { duration: 1 });
        }
    }, [center, isInitialized]);

    // Update property markers when properties change
    useEffect(() => {
        if (!markersLayerRef.current || !isInitialized) return;

        // Clear existing markers
        markersLayerRef.current.clearLayers();

        // Add new markers
        properties.forEach((prop) => {
            if (prop.lat && prop.lng) {
                const priceText = prop.price_display || (prop.price ? `₱${prop.price.toLocaleString()}/mo` : 'Contact for price');
                const marker = L.marker([prop.lat, prop.lng], { icon: DefaultIcon })
                    .bindPopup(`<div style="font-weight: bold;">${prop.name}</div><div>${priceText}</div>`);

                marker.on('click', () => {
                    onMarkerClick?.(prop.id);
                });

                markersLayerRef.current?.addLayer(marker);
            }
        });
    }, [properties, isInitialized, onMarkerClick]);

    // Update user location marker
    useEffect(() => {
        if (!mapInstanceRef.current || !isInitialized) return;

        // Remove existing user marker
        if (userMarkerRef.current) {
            mapInstanceRef.current.removeLayer(userMarkerRef.current);
            userMarkerRef.current = null;
        }

        // Add new user marker if location exists
        if (userLocation) {
            userMarkerRef.current = L.marker(userLocation, { icon: UserIcon, zIndexOffset: 1000 })
                .bindPopup('<div style="font-weight: bold; color: #2563eb;">You are here</div>')
                .addTo(mapInstanceRef.current);
        }
    }, [userLocation, isInitialized]);

    return (
        <div
            ref={mapContainerRef}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
        />
    );
}
