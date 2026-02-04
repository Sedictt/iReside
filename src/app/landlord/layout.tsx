"use client";

import Sidebar from "@/components/landlord/Sidebar";
import { Search, Bell, MessageSquare, ChevronDown, ShieldAlert, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./layout.module.css";

type UserRole = "tenant" | "landlord" | "admin";

export default function LandlordLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                // Not logged in, redirect to login
                router.push("/login");
                return;
            }

            // Get user's role from profiles table
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", authUser.id)
                .single();

            const userRole = profile?.role || "tenant";
            setRole(userRole as UserRole);

            setUser({
                email: authUser.email,
                name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User'
            });

            setIsLoading(false);
        };
        fetchUser();
    }, [router]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 size={32} className={styles.spinner} />
                <p>Loading...</p>
            </div>
        );
    }

    // If user is not a landlord, show access denied
    if (role !== "landlord" && role !== "admin") {
        return (
            <div className={styles.accessDenied}>
                <div className={styles.accessCard}>
                    <ShieldAlert size={48} className={styles.accessIcon} />
                    <h1>Landlord Access Required</h1>
                    <p>
                        You need to be a verified landlord to access this dashboard.
                        Apply to become a landlord from your account page.
                    </p>
                    <div className={styles.accessActions}>
                        <Link href="/account" className={styles.primaryBtn}>
                            Apply to Become a Landlord
                        </Link>
                        <Link href="/" className={styles.secondaryBtn}>
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.layout}>
            <Sidebar />
            <div className={styles.mainArea}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.greeting}>
                        <h1>{getGreeting()}, {user?.name} 👋</h1>
                    </div>

                    <div className={styles.headerActions}>
                        {/* Search Bar */}
                        <div className={styles.searchBar}>
                            <Search size={18} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search Anything..."
                                className={styles.searchInput}
                            />
                        </div>

                        {/* Notifications */}
                        <button className={styles.iconBtn}>
                            <MessageSquare size={20} />
                        </button>
                        <button className={styles.iconBtn}>
                            <Bell size={20} />
                            <span className={styles.notifDot}></span>
                        </button>

                        {/* User Profile */}
                        <Link href="/account" className={styles.userProfile}>
                            <div className={styles.avatar}>
                                {user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className={styles.userName}>{user?.name}</span>
                            <ChevronDown size={16} className={styles.chevron} />
                        </Link>
                    </div>
                </header>

                {/* Main Content */}
                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
}
