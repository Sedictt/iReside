"use client";

import { LayoutDashboard, Users, FileText, Settings, ArrowUpFromLine, Map, Building, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <aside className="glass" style={{ width: '280px', borderRight: '1px solid var(--surface-border)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2rem', height: '2rem', background: 'var(--success)', borderRadius: '6px' }}></div>
                Landlord Pro
            </div>
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" href="/landlord/dashboard" active={isActive("/landlord/dashboard")} />
                <NavItem icon={<Map size={20} />} label="Blueprint" href="/landlord/blueprint" active={isActive("/landlord/blueprint")} />
                <NavItem icon={<Building size={20} />} label="Properties" href="/landlord/properties" active={isActive("/landlord/properties")} />
                <NavItem icon={<Users size={20} />} label="Tenants" href="/landlord/tenants" active={isActive("/landlord/tenants")} />
                <NavItem icon={<FileText size={20} />} label="Documents" href="/landlord/documents" active={isActive("/landlord/documents")} />
                <NavItem icon={<Settings size={20} />} label="Settings" href="/landlord/settings" active={isActive("/landlord/settings")} />
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Pro Plan</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Expires in 12 days</div>
                </div>
                <button
                    onClick={async () => {
                        const { createClient } = await import('@/utils/supabase/client');
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        window.location.href = '/';
                    }}
                    style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: 'none',
                        transition: 'all 0.2s ease',
                        fontWeight: 600,
                        width: '100%',
                        textAlign: 'left'
                    }}
                >
                    <ArrowUpFromLine size={20} style={{ transform: 'rotate(180deg)' }} />
                    Logout
                </button>
            </div>
        </aside>
    );
}

function NavItem({ icon, label, active = false, href }: { icon: React.ReactNode, label: string, active?: boolean, href: string }) {
    const style: React.CSSProperties = {
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        color: active ? 'var(--success)' : 'var(--muted-foreground)',
        background: active ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
        transition: 'all 0.2s ease',
        fontWeight: 500,
        textDecoration: 'none'
    };

    return (
        <Link href={href} style={style}>
            {icon}
            {label}
        </Link>
    );
}
