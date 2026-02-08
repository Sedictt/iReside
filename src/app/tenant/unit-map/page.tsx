"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Building2, ChevronLeft, Loader2, MessageSquare, Users } from "lucide-react";
import styles from "./unit-map.module.css";
import VisualBuilder from "@/components/landlord/VisualBuilder";

export const dynamic = 'force-dynamic';

type ProfileRow = {
    full_name: string | null;
    is_name_private?: boolean | null;
    avatar_url?: string | null;
};

type LeaseRow = {
    status: string;
    tenant_id: string | null;
    profiles?: ProfileRow | ProfileRow[] | null;
};

type UnitRow = {
    id: string;
    unit_type: string;
    grid_x: number;
    grid_y: number;
    status: string;
    unit_number: string | null;
    leases?: LeaseRow[] | null;
};

type PropertySummary = {
    id: string;
    name: string;
    address: string;
};

type LeaseSummary = {
    id: string;
    unit: {
        id: string;
        unit_number: string;
        property: PropertySummary | null;
    } | null;
};

type UnitStatus = "occupied" | "vacant" | "maintenance" | "neardue" | "stairs";

function normalizeStatus(status: string) {
    if (status === "available") return "vacant";
    if (status === "vacant") return "vacant";
    if (status === "occupied" || status === "maintenance" || status === "neardue") return status;
    return "vacant";
}

function TenantUnitMapContent() {
    const [units, setUnits] = useState<UnitRow[]>([]);
    const [property, setProperty] = useState<PropertySummary | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserInitials, setCurrentUserInitials] = useState<string | null>(null);
    const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
    const [currentUserUnitId, setCurrentUserUnitId] = useState<string | null>(null);
    const [chattingUnitId, setChattingUnitId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const isEmbed = searchParams.get("embed") === "1";
    const supabase = useMemo(() => createClient(), []);

    const fetchUnitMap = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/login");
            return;
        }
        setCurrentUserId(user.id);
        const fallbackInitials = (user.user_metadata?.full_name || user.email || "Me")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part: string) => part[0].toUpperCase())
            .join("");
        setCurrentUserInitials(fallbackInitials || "ME");

        const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .maybeSingle();

        if (!profileError && profileData?.avatar_url) {
            setCurrentUserAvatarUrl(profileData.avatar_url);
        }

        const { data: leaseRows, error: leaseError } = await supabase
            .from("leases")
            .select(`
                id,
                unit:units (
                    id,
                    unit_number,
                    property:properties (
                        id,
                        name,
                        address
                    )
                )
            `)
            .eq("tenant_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1);

        if (leaseError) {
            console.error("Failed to load active lease:", leaseError?.message || leaseError);
            setErrorMessage("Unable to load your unit map right now.");
            setIsLoading(false);
            return;
        }

        const activeLease = (leaseRows && leaseRows.length > 0 ? leaseRows[0] : null) as LeaseSummary | null;
        if (!activeLease?.unit?.property) {
            setProperty(null);
            setUnits([]);
            setIsLoading(false);
            return;
        }

        setProperty(activeLease.unit.property);
        setCurrentUserUnitId(activeLease.unit.id);

        const { data: unitData, error: unitError } = await supabase
            .from("units")
            .select(`
                id,
                unit_type,
                grid_x,
                grid_y,
                status,
                unit_number,
                leases (
                    status,
                    tenant_id,
                    profiles (
                        full_name,
                        is_name_private,
                        avatar_url
                    )
                )
            `)
            .eq("property_id", activeLease.unit.property.id);

        if (unitError) {
            console.error("Failed to load units:", unitError);
            setErrorMessage("Unable to load unit map data.");
            setUnits([]);
        } else {
            const mappedUnits = (unitData || []).map((unit: any) => ({
                id: unit.id,
                unit_type: unit.unit_type,
                grid_x: unit.grid_x,
                grid_y: unit.grid_y,
                status: unit.status,
                unit_number: unit.unit_number,
                leases: unit.leases || []
            })) as UnitRow[];

            setUnits(mappedUnits.sort((a, b) => (a.grid_y - b.grid_y) || (a.grid_x - b.grid_x)));

            if (!currentUserUnitId && currentUserId) {
                const myUnit = mappedUnits.find((unit) =>
                    unit.leases?.some((lease) => lease.tenant_id === currentUserId)
                );
                if (myUnit) {
                    setCurrentUserUnitId(myUnit.id);
                }
            }
        }

        setIsLoading(false);
    }, [router, supabase]);

    useEffect(() => {
        fetchUnitMap();
    }, [fetchUnitMap]);

    const selectedUnit = units.find((unit) => unit.id === selectedUnitId) || null;

    const getActiveLease = (unit: UnitRow) => unit.leases?.find((lease) => lease.status === "active");

    const getLeaseProfile = (lease?: LeaseRow | null) => {
        if (!lease?.profiles) return null;
        if (Array.isArray(lease.profiles)) return lease.profiles[0] || null;
        return lease.profiles;
    };

    const getDisplayName = (lease: LeaseRow | undefined | null) => {
        const profile = getLeaseProfile(lease);
        const name = profile?.full_name;
        const isPrivate = profile?.is_name_private === true;
        if (!name || isPrivate) return "Resident";
        return name;
    };

    const getUnitStatus = (unit: UnitRow): UnitStatus => {
        if (unit.unit_type === "stairs") return "stairs";
        const hasActiveLease = Boolean(getActiveLease(unit));
        if (hasActiveLease) return "occupied";
        return normalizeStatus(unit.status) as UnitStatus;
    };

    const visualUnits = useMemo(() => {
        return units.map((unit) => {
            const activeLease = getActiveLease(unit);
            const tenantName = getDisplayName(activeLease);
            const status = activeLease ? "occupied" : unit.status;
            const tenantIsPrivate = getLeaseProfile(activeLease)?.is_name_private ?? null;
            const tenantAvatarUrl = getLeaseProfile(activeLease)?.avatar_url ?? null;

            return {
                ...unit,
                status,
                tenant_name: tenantName,
                tenant_is_private: tenantIsPrivate,
                tenant_avatar_url: tenantAvatarUrl
            };
        });
    }, [units]);

    const handleChat = async (unit: UnitRow) => {
        const activeLease = getActiveLease(unit);
        const otherUserId = activeLease?.tenant_id;
        if (!otherUserId || !currentUserId || otherUserId === currentUserId) return;

        setChattingUnitId(unit.id);

        const { data: existingConversations, error: existingError } = await supabase
            .from("conversations")
            .select("id")
            .is("listing_id", null)
            .or(
                `and(participant1_id.eq.${currentUserId},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${currentUserId})`
            )
            .limit(1);

        if (existingError) {
            console.error("Failed to check conversations:", existingError);
            setChattingUnitId(null);
            return;
        }

        let conversationId = existingConversations?.[0]?.id;

        if (!conversationId) {
            const { data: created, error: createError } = await supabase
                .from("conversations")
                .insert({
                    participant1_id: currentUserId,
                    participant2_id: otherUserId,
                    listing_id: null
                })
                .select("id")
                .single();

            if (createError) {
                console.error("Failed to create conversation:", createError);
                setChattingUnitId(null);
                return;
            }

            conversationId = created?.id;
        }

        setChattingUnitId(null);

        if (conversationId) {
            router.push(`/tenant/messages?id=${conversationId}`);
        }
    };

    const handleMessageFromMap = (unitId: string) => {
        const unit = units.find((item) => item.id === unitId);
        if (unit) {
            setSelectedUnitId(unitId);
            void handleChat(unit);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 size={32} className={styles.spinner} />
                <p>Loading unit map...</p>
            </div>
        );
    }

    if (!property) {
        return (
            <div className={styles.emptyState}>
                <Building2 size={42} />
                <h2>No active home found</h2>
                <p>Once you have an active lease, your unit map will appear here.</p>
                {!isEmbed ? (
                    <Link href="/tenant/dashboard" className={styles.primaryLink}>
                        Back to Dashboard
                    </Link>
                ) : null}
            </div>
        );
    }

    if (isEmbed) {
        return (
            <div className={styles.embedPage}>
                {errorMessage && (
                    <div className={styles.errorBanner}>{errorMessage}</div>
                )}
                <div className={styles.embedBuilder}>
                    <VisualBuilder
                        propertyId={property.id}
                        initialUnits={visualUnits}
                        readOnly
                        selectedUnitId={selectedUnitId}
                        onUnitClick={(unitId) => setSelectedUnitId(unitId)}
                        currentUserUnitId={currentUserUnitId}
                        currentUserInitials={currentUserInitials || undefined}
                        currentUserAvatarUrl={currentUserAvatarUrl}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <Link href="/tenant/dashboard" className={styles.backLink}>
                        <ChevronLeft size={16} />
                        Back to Dashboard
                    </Link>
                    <h1 className={styles.title}>Unit Map</h1>
                    <p className={styles.subtitle}>{property.name} - {property.address}</p>
                </div>
            </header>

            {errorMessage && (
                <div className={styles.errorBanner}>{errorMessage}</div>
            )}

            <div className={styles.mapShell}>
                <div className={styles.builderWrap}>
                    <VisualBuilder
                        propertyId={property.id}
                        initialUnits={visualUnits}
                        readOnly
                        selectedUnitId={selectedUnitId}
                        onUnitClick={(unitId) => setSelectedUnitId(unitId)}
                        onUnitMessageClick={handleMessageFromMap}
                        currentUserUnitId={currentUserUnitId}
                        currentUserInitials={currentUserInitials || undefined}
                        currentUserAvatarUrl={currentUserAvatarUrl}
                    />
                </div>

                <aside className={styles.detailsPanel}>
                    <div className={styles.detailsHeader}>
                        <Users size={18} />
                        <h2>Unit Details</h2>
                    </div>

                    {!selectedUnit && (
                        <p className={styles.detailsEmpty}>Select a unit to view resident info.</p>
                    )}

                    {selectedUnit && (() => {
                        const activeLease = getActiveLease(selectedUnit);
                        const unitStatus = getUnitStatus(selectedUnit);
                        const isPrivate = getLeaseProfile(activeLease)?.is_name_private === true;
                        const canChat = Boolean(activeLease?.tenant_id && currentUserId && activeLease?.tenant_id !== currentUserId);

                        return (
                            <div className={styles.detailsContent}>
                                <div className={styles.detailsTitleRow}>
                                    <h3>Unit {selectedUnit.unit_number || "--"}</h3>
                                    <span className={`${styles.statusBadge} ${styles[unitStatus]}`}>
                                        {unitStatus === "neardue" ? "Payment Due" : unitStatus}
                                    </span>
                                </div>
                                <div className={styles.detailsRow}>
                                    <span className={styles.detailsLabel}>Resident</span>
                                    <span className={styles.detailsValue}>{getDisplayName(activeLease)}</span>
                                    {isPrivate && <span className={styles.privateBadge}>Private</span>}
                                </div>
                                <div className={styles.detailsRow}>
                                    <span className={styles.detailsLabel}>Unit Type</span>
                                    <span className={styles.detailsValue}>
                                        {selectedUnit.unit_type === "studio"
                                            ? "Studio"
                                            : selectedUnit.unit_type === "stairs"
                                                ? "Stairs"
                                                : selectedUnit.unit_type.replace("br", " BR")}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className={styles.chatButton}
                                    onClick={() => handleChat(selectedUnit)}
                                    disabled={!canChat || chattingUnitId === selectedUnit.id}
                                >
                                    <MessageSquare size={16} />
                                    {chattingUnitId === selectedUnit.id ? "Opening chat..." : "Message Resident"}
                                </button>

                                {!canChat && (
                                    <p className={styles.chatHint}>
                                        Chat is available for occupied units that are not yours.
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                </aside>
            </div>
        </div>
    );
}

export default function TenantUnitMapPage() {
    return (
        <Suspense fallback={<div className={styles.emptyState}><Loader2 size={32} /></div>}>
            <TenantUnitMapContent />
        </Suspense>
    );
}
