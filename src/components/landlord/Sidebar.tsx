"use client";

import {
    LayoutDashboard,
    Users,
    FileText,
    Settings,
    LogOut,
    Map,
    Building,
    Sparkles,
    BarChart3,
    Receipt,
    CheckSquare,
    Wallet,
    HelpCircle,
    Globe
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

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
            <nav className={styles.nav}>
                <div className={styles.navSection}>
                    <span className={styles.sectionLabel}>MAIN MENU</span>
                    <NavItem
                        icon={<LayoutDashboard size={20} />}
                        label="Dashboard"
                        href="/landlord/dashboard"
                        active={isActive("/landlord/dashboard")}
                    />
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
                        label="Blueprint"
                        href="/landlord/blueprint"
                        active={isActive("/landlord/blueprint")}
                    />
                    <NavItem
                        icon={<Users size={20} />}
                        label="Tenants"
                        href="/landlord/tenants"
                        active={isActive("/landlord/tenants")}
                    />
                    <NavItem
                        icon={<BarChart3 size={20} />}
                        label="Statistics"
                        href="/landlord/statistics"
                        active={isActive("/landlord/statistics")}
                    />
                    <NavItem
                        icon={<Receipt size={20} />}
                        label="Invoices"
                        href="/landlord/invoices"
                        active={isActive("/landlord/invoices")}
                        badge={1}
                    />
                    <NavItem
                        icon={<CheckSquare size={20} />}
                        label="To Do List"
                        href="/landlord/tasks"
                        active={isActive("/landlord/tasks")}
                    />
                    <NavItem
                        icon={<Wallet size={20} />}
                        label="Finances"
                        href="/landlord/finances"
                        active={isActive("/landlord/finances")}
                    />
                </div>

                <div className={styles.navSection}>
                    <span className={styles.sectionLabel}>HELP & SUPPORT</span>
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
                </div>
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
