"use client";

import Sidebar from "@/components/landlord/Sidebar";

export default function LandlordLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--background)' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {children}
            </main>
        </div>
    );
}
