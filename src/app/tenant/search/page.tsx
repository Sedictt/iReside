"use client";
import React from 'react';
import { Search, MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TenantSearch() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem' }}>
            <header style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '3rem' }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    <ArrowLeft size={16} /> Back to Home
                </Link>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>Find your next home</h1>

                <div className="glass" style={{ display: 'flex', padding: '0.5rem', borderRadius: '12px', maxWidth: '600px' }}>
                    <Search size={20} style={{ margin: '1rem', color: 'var(--muted-foreground)' }} />
                    <input
                        type="text"
                        placeholder="Search by city, school, or workplace..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '1rem',
                            outline: 'none'
                        }}
                    />
                    <button className="btn btn-primary">Search</button>
                </div>
            </header>

            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="glass-panel" style={{ overflow: 'hidden', transition: 'transform 0.2s', cursor: 'pointer' }}>
                        <div style={{ height: '200px', background: '#27272a', position: 'relative' }}>
                            {/* Placeholder Image */}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}>
                                Unit Image
                            </div>
                            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                {i % 2 === 0 ? 'Dormitory' : 'Apartment'}
                            </div>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Sunny Heights {i}</h3>
                                <div style={{ color: 'var(--success)', fontWeight: 600 }}>$450<span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>/mo</span></div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                <MapPin size={14} /> 123 University Ave, NY
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%' }}>View Details</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
