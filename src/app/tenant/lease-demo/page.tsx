"use client";

import { useState } from "react";
import LeaseSigningModal from "@/components/tenant/LeaseSigningModal";
import styles from "./page.module.css"; // We'll create a simple css or inline it if needed

export default function LeaseDemoPage() {
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [signedImage, setSignedImage] = useState<string | null>(null);

    const handleSign = (signatureDataUrl: string) => {
        setSignedImage(signatureDataUrl);
        setIsModalOpen(false);
    };

    return (
        <div style={{ padding: '2rem', height: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1>Lease Signing Demo</h1>
            <p style={{ marginBottom: '2rem', color: '#64748b' }}>Simulating tenant lease signing process.</p>

            <button
                onClick={() => setIsModalOpen(true)}
                style={{
                    padding: '1rem 2rem',
                    background: '#0f172a',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem'
                }}
            >
                Open Signature Pad
            </button>

            {signedImage && (
                <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                    <h3>Captured Signature</h3>
                    <div style={{ border: '1px solid #cbd5e1', padding: '1rem', background: 'white', borderRadius: '12px', marginTop: '1rem' }}>
                        <img src={signedImage} alt="Tenant Signature" style={{ height: '100px' }} />
                    </div>
                </div>
            )}

            <LeaseSigningModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSign={handleSign}
                propertyName="Evergreen Lake"
                unitName="Unit 304"
                tenantName="John Doe"
            />
        </div>
    );
}
