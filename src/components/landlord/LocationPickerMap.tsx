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

interface LocationPickerProps {
    lat: number | null;
    lng: number | null;
    onLocationSelect: (lat: number, lng: number) => void;
}

export default function LocationPickerMap({ lat, lng, onLocationSelect }: LocationPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);

    // Default center (Valenzuela City) if no coordinates provided
    const defaultCenter: [number, number] = [14.6819, 120.9772];
    const initialCenter: [number, number] = lat && lng ? [lat, lng] : defaultCenter;

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: initialCenter,
            zoom: 15,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        mapInstanceRef.current = map;

        // Click handler to move marker
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            updateMarker(lat, lng);
            onLocationSelect(lat, lng);
        });

        // Add user-provided marker initially
        if (lat && lng) {
            updateMarker(lat, lng);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
            }
        };
    }, []);

    // Update marker position when props change
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        if (lat && lng) {
            updateMarker(lat, lng);
            mapInstanceRef.current.panTo([lat, lng]);
        }
    }, [lat, lng]);

    function updateMarker(lat: number, lng: number) {
        if (!mapInstanceRef.current) return;

        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else {
            markerRef.current = L.marker([lat, lng], {
                icon: DefaultIcon,
                draggable: true
            }).addTo(mapInstanceRef.current);

            // Drag end handler
            markerRef.current.on('dragend', (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                onLocationSelect(position.lat, position.lng);
            });
        }
    }

    return (
        <div
            ref={mapContainerRef}
            style={{ width: '100%', height: '100%', borderRadius: '8px', zIndex: 0 }}
        />
    );
}
