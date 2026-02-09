"use client";

import { useState, useEffect } from "react";

import {
    LayoutDashboard,
    Users,
    FileText,
    Settings,
    LogOut,
    Map,
    Building,
    BarChart3,
    Receipt,
    CheckSquare,
    Wallet,
    HelpCircle,
    Globe,
    Bell,
    Wrench,
    ChevronDown,
    LayoutList,
    Home,
    UserCheck,
    BadgeDollarSign,
    LifeBuoy,
    MessageSquare
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

export default function Sidebar({ inquiryCount }: { inquiryCount?: number }) {
    const pathname = usePathname();
    const [internalCount, setInternalCount] = useState(0);

    // Use passed prop if available, otherwise use internal state
    const countToDisplay = inquiryCount !== undefined ? inquiryCount : internalCount;

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    useEffect(() => {
        // Only fetch internally if prop is not provided
        if (inquiryCount === undefined) {
            fetchNewInquiriesCount();
            const interval = setInterval(fetchNewInquiriesCount, 30000);
            return () => clearInterval(interval);
        }
    }, [inquiryCount]);

    async function fetchNewInquiriesCount() {
        try {
            const { createClient } = await import('@/utils/supabase/client');
            const supabase = createClient();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { count } = await supabase
                .from('listing_inquiries')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'new');

            setInternalCount(count || 0);
        } catch (err) {
            console.error('Error fetching inquiry count:', err);
        }
    }


    return (
        <aside className={styles.sidebar}>
            {/* Logo Section */}
            <div className={styles.logoSection}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <Building size={20} />
                    </div>
                    <div className={styles.logoText}>
                        <span className={styles.logoTitle}>LANDLORD</span>
                        <span className={styles.logoSubtitle}>Property Management</span>
                    </div>
                </div>
            </div>

            {/* Main Menu */}
            {/* Main Menu */}
            <nav className={styles.nav}>
                <NavSection label="MENU" icon={<LayoutList size={16} />}>
                    <NavItem
                        icon={<LayoutDashboard size={20} />}
                        label="Dashboard"
                        href="/landlord/dashboard"
                        active={isActive("/landlord/dashboard")}
                    />
                    <NavItem
                        icon={<CheckSquare size={20} />}
                        label="To Do List"
                        href="/landlord/tasks"
                        active={isActive("/landlord/tasks")}
                    />
                </NavSection>

                <NavSection label="PROPERTIES" icon={<Home size={16} />}>
                    <NavItem
                        icon={<Building size={20} />}
                        label="Properties"
                        href="/landlord/properties"
                        active={isActive("/landlord/properties")}
                    />
                    <NavItem
                        icon={<Globe size={20} />}
                        label="Listings"
                        href="/landlord/listings"
                        active={isActive("/landlord/listings")}
                    />
                    <NavItem
                        icon={<Map size={20} />}
                        label="Unit Map"
                        href="/landlord/unit-map"
                        active={isActive("/landlord/unit-map")}
                    />
                    <NavItem
                        icon={<Wrench size={20} />}
                        label="Maintenance"
                        href="/landlord/maintenance"
                        active={isActive("/landlord/maintenance")}
                    />
                </NavSection>

                <NavSection label="TENANCY" icon={<UserCheck size={16} />}>
                    <NavItem
                        icon={<Users size={20} />}
                        label="Tenants"
                        href="/landlord/tenants"
                        active={isActive("/landlord/tenants")}
                    />
                    <NavItem
                        icon={<Bell size={20} />}
                        label="Requests"
                        href="/landlord/inquiries"
                        active={isActive("/landlord/inquiries")}
                        badge={countToDisplay}
                    />
                    <NavItem
                        icon={<MessageSquare size={20} />}
                        label="Messages"
                        href="/landlord/messages"
                        active={isActive("/landlord/messages")}
                    />
                </NavSection>

                <NavSection label="FINANCE" icon={<BadgeDollarSign size={16} />}>
                    <NavItem
                        icon={<Wallet size={20} />}
                        label="Finances"
                        href="/landlord/finances"
                        active={isActive("/landlord/finances")}
                    />
                    <NavItem
                        icon={<Receipt size={20} />}
                        label="Invoices"
                        href="/landlord/invoices"
                        active={isActive("/landlord/invoices")}
                        badge={1}
                    />
                    <NavItem
                        icon={<BarChart3 size={20} />}
                        label="Statistics"
                        href="/landlord/statistics"
                        active={isActive("/landlord/statistics")}
                    />
                </NavSection>

                <NavSection label="SUPPORT" icon={<LifeBuoy size={16} />}>
                    <NavItem
                        icon={<HelpCircle size={20} />}
                        label="Help & Center"
                        href="/landlord/help"
                        active={isActive("/landlord/help")}
                    />
                    <NavItem
                        icon={<Settings size={20} />}
                        label="Settings"
                        href="/landlord/settings"
                        active={isActive("/landlord/settings")}
                    />
                </NavSection>
            </nav>

            {/* Logout Button */}
            <div className={styles.footer}>
                <button
                    className={styles.logoutBtn}
                    onClick={async () => {
                        const { createClient } = await import('@/utils/supabase/client');
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        window.location.href = '/';
                    }}
                >
                    <LogOut size={20} />
                    <span>Log Out</span>
                </button>
            </div>
        </aside>
    );
}

type NavItemProps = {
    icon: React.ReactNode;
    label: string;
    href: string;
    active?: boolean;
    badge?: number;
};

function NavItem({ icon, label, active = false, href, badge }: NavItemProps) {
    return (
        <Link
            href={href}
            className={`${styles.navItem} ${active ? styles.active : ''}`}
            title={label}
        >
            <span className={styles.navIcon}>{icon}</span>
            <span className={styles.navLabel}>{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className={styles.badge}>{badge}</span>
            )}
        </Link>
    );
}

function NavSection({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className={styles.navSection}>
            <button
                className={styles.sectionHeader}
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <div className={styles.sectionHeaderLeft}>
                    <span className={styles.sectionIcon}>{icon}</span>
                    <span className={styles.sectionLabel}>{label}</span>
                </div>
                <ChevronDown
                    size={16}
                    className={`${styles.sectionChevron} ${!isOpen ? styles.collapsed : ''}`}
                />
            </button>
            <div className={`${styles.sectionContent} ${!isOpen ? styles.hidden : ''}`}>
                <div className={styles.sectionInner}>
                    {children}
                </div>
            </div>
        </div>
    );
}
