"use client";

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './Map.module.css';

// Fix Leaflet's default icon path issues in Next.js
// We still need this for internal leaflet logic potentially, but we are using divIcons mostly.
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

interface Property {
    id: string;
    name: string;
    lat: number;
    lng: number;
    price: number | null;
    price_display?: string | null;
    image?: string;
    type?: string;
}

interface MapProps {
    properties: Property[];
    center: [number, number];
    userLocation?: [number, number] | null;
    onMarkerClick?: (id: string) => void;
    focusedId?: string | null;
    searchOrigin?: [number, number] | null;
    searchRadius?: number; // meters
    showRadius?: boolean;
}

export default function LeafletMap({
    properties,
    center,
    userLocation,
    onMarkerClick,
    focusedId,
    searchOrigin,
    searchRadius = 3000,
    showRadius = true
}: MapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const radiusLayerRef = useRef<L.LayerGroup | null>(null); // New layer for radius
    const userMarkerRef = useRef<L.Marker | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize map only once
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        // Create map instance
        const map = L.map(mapContainerRef.current, {
            center: center,
            zoom: 14,
            zoomControl: false,
            layers: [
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                })
            ]
        });

        // Add zoom control to bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Create layers
        markersLayerRef.current = L.layerGroup().addTo(map);
        radiusLayerRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;
        setIsInitialized(true);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markersLayerRef.current = null;
                radiusLayerRef.current = null;
                userMarkerRef.current = null;
            }
        };
    }, []);

    // Update center when it changes
    useEffect(() => {
        if (mapInstanceRef.current && isInitialized) {
            mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom(), { animate: true, duration: 1 });
        }
    }, [center, isInitialized]);

    // Update Search Radius Bubble
    useEffect(() => {
        if (!radiusLayerRef.current || !isInitialized) return;

        radiusLayerRef.current.clearLayers();

        if (searchOrigin && showRadius) {
            // Draw Proximity Bubble
            L.circle(searchOrigin, {
                color: '#4338ca',       // Border color (Primary)
                fillColor: '#6366f1',   // Fill color (Primary light)
                fillOpacity: 0.08,      // Very subtle fill
                weight: 1.5,
                dashArray: '6, 8',
                radius: searchRadius
            }).bindTooltip(`Search Area (${(searchRadius / 1000).toFixed(1)}km)`, {
                direction: 'top',
                permanent: false,
                opacity: 0.9,
                className: styles.radiusLabel
            }).addTo(radiusLayerRef.current);

            // Also add a center point for the search origin
            L.circleMarker(searchOrigin, {
                radius: 6,
                fillColor: '#4338ca',
                color: '#fff',
                weight: 2,
                fillOpacity: 1
            }).addTo(radiusLayerRef.current);

            // Fit bounds to search radius if it's the first search or significant change?
            // Optional: mapInstanceRef.current?.fitBounds(lCircle.getBounds());
            // Leaving out to avoid annoying auto-zoom on slider change
        }
    }, [searchOrigin, isInitialized, searchRadius, showRadius]);

    // Update property markers
    useEffect(() => {
        if (!markersLayerRef.current || !isInitialized) return;

        markersLayerRef.current.clearLayers();

        properties.forEach((prop) => {
            if (prop.lat && prop.lng) {
                const isActive = focusedId === prop.id;
                const priceText = prop.price_display || (prop.price ? `₱${(prop.price / 1000).toFixed(1)}k` : 'N/A');

                const customIcon = L.divIcon({
                    className: `${styles.marker} ${isActive ? styles.markerActive : ''}`,
                    html: `<span>${priceText}</span>`,
                });

                const marker = L.marker([prop.lat, prop.lng], { icon: customIcon, zIndexOffset: isActive ? 1000 : 0 });

                // Construct Rich Tooltip HTML
                const tooltipHtml = `
                    <div class="${styles.tooltipCard}">
                        <div class="${styles.tooltipImage}" style="background-image: ${prop.image?.startsWith('url') ? prop.image : `url('${prop.image}')`}"></div>
                        <div class="${styles.tooltipContent}">
                            <div class="${styles.tooltipType}">${prop.type || 'Property'}</div>
                            <div class="${styles.tooltipTitle}">${prop.name}</div>
                            <div class="${styles.tooltipPrice}">${priceText}/mo</div>
                        </div>
                    </div>
                `;

                marker.bindTooltip(tooltipHtml, {
                    direction: 'top',
                    offset: [0, -20],
                    opacity: 1,
                    className: '' // Clean default styles to let ours take over
                });

                marker.on('click', () => {
                    onMarkerClick?.(prop.id);
                });

                markersLayerRef.current?.addLayer(marker);
            }
        });
    }, [properties, isInitialized, onMarkerClick, focusedId]);

    // Update user location marker
    useEffect(() => {
        if (!mapInstanceRef.current || !isInitialized) return;

        if (userMarkerRef.current) {
            mapInstanceRef.current.removeLayer(userMarkerRef.current);
            userMarkerRef.current = null;
        }

        if (userLocation) {
            const userIcon = L.divIcon({
                className: styles.userMarker,
                html: `<div class="${styles.userDot}"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            userMarkerRef.current = L.marker(userLocation, { icon: userIcon, zIndexOffset: 2000 })
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
