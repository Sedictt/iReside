"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
    Wrench,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Sparkles,
    BrainCircuit,
    DollarSign,
    Hammer,
    MapPin,
    Calendar,
    User,
    ArrowRight
} from "lucide-react";

type MaintenanceRequest = {
    id: string;
    title: string;
    description: string;
    priority: 'critical' | 'warning' | 'info';
    status: 'open' | 'in_progress' | 'resolved';
    created_at: string;
    property_id: string;
    unit_id: string | null;
    tenant_id: string | null;

    // AI Fields
    ai_category?: string;
    ai_severity?: string;
    ai_summary?: string;
    ai_suggested_action?: string;
    ai_estimated_cost?: string;
    ai_confidence?: number;

    // Joined fields
    properties?: {
        name: string;
        address: string;
    };
    units?: {
        unit_number: string;
    };
    profiles?: {
        full_name: string;
        email: string;
        phone?: string;
    };
};

type FilterStatus = 'all' | 'open' | 'in_progress' | 'resolved';

export default function MaintenancePage() {
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        fetchRequests();
    }, []);

    async function fetchRequests() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('maintenance_requests')
                .select(`
                    *,
                    properties (name, address),
                    units (unit_number),
                    profiles:tenant_id (full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching maintenance requests:', JSON.stringify(error, null, 2));
            } else {
                setRequests(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAnalyze(request: MaintenanceRequest) {
        setAnalyzingId(request.id);

        try {
            // 1. Call AI API
            const response = await fetch('/api/ai/analyze-maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: `${request.title}: ${request.description}`,
                    image: null // Add image handling if needed later
                })
            });

            const aiData = await response.json();

            if (!response.ok) throw new Error(aiData.error || 'Analysis failed');

            // 2. Update Database
            const { error } = await supabase
                .from('maintenance_requests')
                .update({
                    ai_category: aiData.category,
                    ai_severity: aiData.severity,
                    ai_summary: aiData.summary,
                    ai_suggested_action: aiData.action,
                    ai_estimated_cost: aiData.estimatedCost,
                    ai_confidence: aiData.confidence
                })
                .eq('id', request.id);

            if (error) throw error;

            console.log("Database updated successfully");

            // 3. Update Local State
            const updatedRequest = {
                ...request,
                ai_category: aiData.category,
                ai_severity: aiData.severity,
                ai_summary: aiData.summary,
                ai_suggested_action: aiData.action,
                ai_estimated_cost: aiData.estimatedCost,
                ai_confidence: aiData.confidence
            };

            setRequests(prev => prev.map(r => r.id === request.id ? updatedRequest : r));
            setSelectedRequest(updatedRequest);

        } catch (err) {
            console.error('AI Analysis failed:', err);
            alert('Failed to analyze request. Please try again.');
        } finally {
            setAnalyzingId(null);
        }
    }

    const filteredRequests = requests.filter(r =>
        filter === 'all' ? true : r.status === filter
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open': return <AlertTriangle size={16} />;
            case 'in_progress': return <Clock size={16} />;
            case 'resolved': return <CheckCircle2 size={16} />;
            default: return <Wrench size={16} />;
        }
    };

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    return (
        <div className={styles.container}>
            {/* Sidebar List */}
            <div className={styles.sidebar}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Maintenance Center</h1>
                    <div className={styles.filterBar}>
                        {(['all', 'open', 'in_progress', 'resolved'] as const).map(f => (
                            <button
                                key={f}
                                className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
                                onClick={() => setFilter(f)}
                            >
                                {f === 'all' ? 'All Requests' : f.replace('_', ' ')}
                                <span className={styles.count}>
                                    {f === 'all'
                                        ? requests.length
                                        : requests.filter(r => r.status === f).length}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.requestList}>
                    {loading ? (
                        <div className={styles.emptyState}>Loading...</div>
                    ) : filteredRequests.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}><CheckCircle2 /></div>
                            <p>No {filter !== 'all' ? filter : ''} maintenance requests found</p>
                        </div>
                    ) : (
                        filteredRequests.map(req => (
                            <div
                                key={req.id}
                                className={`
                                    ${styles.requestCard} 
                                    ${selectedRequest?.id === req.id ? styles.selected : ''}
                                    ${req.ai_severity ? styles[`severity-${req.ai_severity.toLowerCase()}`] : ''}
                                `}
                                onClick={() => setSelectedRequest(req)}
                            >
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.cardTitle}>{req.title}</h3>
                                    <span className={styles.cardTime}>{formatDate(req.created_at)}</span>
                                </div>
                                <div className={styles.cardProperty}>
                                    <MapPin size={14} />
                                    {req.properties?.name}
                                    {req.units && ` • Unit ${req.units.unit_number}`}
                                </div>
                                <div className={styles.cardFooter}>
                                    <span className={`${styles.statusBadge} ${styles[req.status]}`}>
                                        {req.status.replace('_', ' ')}
                                    </span>
                                    {req.ai_category && (
                                        <span className={styles.aiBadge}>
                                            <Sparkles size={12} />
                                            {req.ai_category}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Detail View */}
            <div className={styles.detailView}>
                {selectedRequest ? (
                    <>
                        <div className={styles.detailHeader}>
                            <div className={styles.detailTitle}>
                                <h2>{selectedRequest.title}</h2>
                                <div className={styles.detailSubtitle}>
                                    <MapPin size={16} />
                                    {selectedRequest.properties?.address}
                                    {selectedRequest.units ? ` • Unit ${selectedRequest.units.unit_number}` : ''}
                                </div>
                            </div>
                            <div className={styles.detailActions}>
                                {!selectedRequest.ai_summary && (
                                    <button
                                        className={styles.actionBtnPrimary}
                                        onClick={() => handleAnalyze(selectedRequest)}
                                        disabled={analyzingId === selectedRequest.id}
                                    >
                                        {analyzingId === selectedRequest.id ? (
                                            <>Analyzing...</>
                                        ) : (
                                            <>
                                                <Sparkles size={18} />
                                                Analyze with AI
                                            </>
                                        )}
                                    </button>
                                )}
                                <button className={styles.actionBtnSecondary}>
                                    Contact Tenant
                                </button>
                            </div>
                        </div>

                        <div className={styles.detailContent}>
                            {/* AI Insights Panel */}
                            {selectedRequest.ai_summary ? (
                                <div className={styles.aiSection}>
                                    <div className={styles.aiHeader}>
                                        <div className={styles.aiTitle}>
                                            <BrainCircuit size={20} />
                                            AI Assessment
                                        </div>
                                        {selectedRequest.ai_confidence && (
                                            <div className={styles.confidenceScore}>
                                                {Math.round(selectedRequest.ai_confidence * 100)}% Confidence
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.aiBody}>
                                        <div className={styles.leftCol}>
                                            <div className={styles.aiField}>
                                                <span className={styles.aiLabel}>Summary</span>
                                                <p className={styles.aiValue}>{selectedRequest.ai_summary}</p>
                                            </div>
                                            <div className={styles.aiField}>
                                                <span className={styles.aiLabel}>Recommended Action</span>
                                                <div className={styles.aiValue} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                    <ArrowRight size={16} style={{ marginTop: '4px', color: '#6366f1' }} />
                                                    {selectedRequest.ai_suggested_action}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.rightCol}>
                                            <div className={styles.aiField}>
                                                <span className={styles.aiLabel}>Severity Level</span>
                                                <span className={`${styles.severityTag} ${styles[selectedRequest.ai_severity?.toLowerCase() || 'medium']}`}>
                                                    {selectedRequest.ai_severity}
                                                </span>
                                            </div>
                                            <div className={styles.aiField}>
                                                <span className={styles.aiLabel}>Category</span>
                                                <div className={styles.aiValue}>{selectedRequest.ai_category}</div>
                                            </div>
                                            <div className={styles.aiField}>
                                                <span className={styles.aiLabel}>Estimated Cost</span>
                                                <div className={styles.aiValue} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                                    <DollarSign size={16} />
                                                    {selectedRequest.ai_estimated_cost}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : analyzingId === selectedRequest.id && (
                                <div className={styles.aiSection} style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div className={styles.aiPulse}>
                                            <BrainCircuit size={24} />
                                        </div>
                                        <p style={{ marginTop: '1rem', color: '#64748b' }}>AI is analyzing the report...</p>
                                    </div>
                                </div>
                            )}

                            <div className={styles.mainGrid}>
                                <div className={styles.requestSection}>
                                    <h3 className={styles.sectionTitle}>Request Details</h3>
                                    <div className={styles.descriptionBox}>
                                        {selectedRequest.description}
                                    </div>

                                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#64748b' }}>Gallery</h4>
                                    <div className={styles.galleryGrid}>
                                        <div className={styles.galleryItem}></div>
                                        <div className={styles.galleryItem}></div>
                                    </div>
                                </div>

                                <div className={styles.sideInfo}>
                                    <div className={styles.infoCard}>
                                        <h3 className={styles.sectionTitle}>Tenant Info</h3>
                                        <div className={styles.infoRow}>
                                            <User className={styles.infoIcon} size={18} />
                                            <div className={styles.infoText}>
                                                <label>Name</label>
                                                <span>{selectedRequest.profiles?.full_name || 'Unknown'}</span>
                                            </div>
                                        </div>
                                        <div className={styles.infoRow}>
                                            <Calendar className={styles.infoIcon} size={18} />
                                            <div className={styles.infoText}>
                                                <label>Reported On</label>
                                                <span>{formatDate(selectedRequest.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}><Hammer size={32} /></div>
                        <h3>Select a request</h3>
                        <p>View details and convert them to work orders</p>
                    </div>
                )}
            </div>
        </div>
    );
}
