"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, Loader2, AlertCircle } from "lucide-react";
import styles from "./CreateLeaseModal.module.css";

type Unit = {
    id: string;
    unit_number: string;
    rent_amount: number;
    status: string;
};

interface CreateLeaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    propertyId: string;
    tenantId: string | null;
    tenantName: string;
    tenantEmail: string;
}

export default function CreateLeaseModal({
    isOpen,
    onClose,
    onSuccess,
    propertyId,
    tenantId,
    tenantName,
    tenantEmail
}: CreateLeaseModalProps) {
    const [units, setUnits] = useState<Unit[]>([]);
    const [isLoadingUnits, setIsLoadingUnits] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        unitId: "",
        startDate: "",
        endDate: "",
        rentAmount: ""
    });

    const supabase = createClient();

    useEffect(() => {
        if (isOpen && propertyId) {
            fetchUnits();
        }
    }, [isOpen, propertyId]);

    async function fetchUnits() {
        setIsLoadingUnits(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('units')
                .select('id, unit_number, rent_amount, status')
                .eq('property_id', propertyId)
                .eq('status', 'available');

            if (error) throw error;
            setUnits(data || []);
        } catch (err: any) {
            console.error("Error fetching units:", err);
            setError("Failed to load active units.");
        } finally {
            setIsLoadingUnits(false);
        }
    }

    // Auto-fill rent when unit changes
    const handleUnitChange = (unitId: string) => {
        const selectedUnit = units.find(u => u.id === unitId);
        setFormData(prev => ({
            ...prev,
            unitId,
            rentAmount: selectedUnit ? selectedUnit.rent_amount.toString() : prev.rentAmount
        }));
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        if (!tenantId) {
            setError("This inquiry is not linked to a registered user. Cannot create lease.");
            setIsSubmitting(false);
            return;
        }

        try {
            // 1. Create Lease
            const { error: leaseError } = await supabase
                .from('leases')
                .insert({
                    unit_id: formData.unitId,
                    tenant_id: tenantId,
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    rent_amount: parseFloat(formData.rentAmount),
                    status: 'pending'
                });

            if (leaseError) throw leaseError;

            // 2. Update Unit Status
            // Mark as occupied (or we could add a 'reserved' status, but occupied prevents double booking)
            const { error: unitError } = await supabase
                .from('units')
                .update({ status: 'occupied' })
                .eq('id', formData.unitId);

            if (unitError) throw unitError;

            // 3. Update Tenant Role (optional, but good practice if they were just 'user')
            // This might trigger a policy error if not admin/landlord, 
            // but the current user IS a landlord executing this.
            // However, editing OTHER users' profiles usually requires admin or strict RLS.
            // We'll skip profile update for now to avoid RLS issues, 
            // assuming 'role' is just for app access type. 

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error creating lease:", JSON.stringify(err, null, 2));
            console.error("Error details:", err);
            setError(err.message || "Failed to create lease.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Create Lease Agreement</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <p className={styles.subtitle}>
                        Approve <strong>{tenantName}</strong> ({tenantEmail}) as a tenant.
                    </p>

                    {error && (
                        <div className={styles.errorBanner}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label>Select Unit</label>
                            {isLoadingUnits ? (
                                <div className={styles.loadingInput}>Loading units...</div>
                            ) : units.length === 0 ? (
                                <div className={styles.emptyUnits}>
                                    No available units found for this property.
                                </div>
                            ) : (
                                <select
                                    value={formData.unitId}
                                    onChange={(e) => handleUnitChange(e.target.value)}
                                    required
                                    className={styles.select}
                                >
                                    <option value="">-- Choose a Unit --</option>
                                    {units.map(unit => (
                                        <option key={unit.id} value={unit.id}>
                                            Unit {unit.unit_number} - ₱{unit.rent_amount.toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    required
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>End Date</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    required
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Monthly Rent (₱)</label>
                            <input
                                type="number"
                                value={formData.rentAmount}
                                onChange={e => setFormData({ ...formData, rentAmount: e.target.value })}
                                required
                                min="0"
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.actions}>
                            <button type="button" onClick={onClose} className={styles.cancelBtn}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.unitId}
                                className={styles.submitBtn}
                            >
                                {isSubmitting ? <Loader2 className={styles.spinner} size={18} /> : "Confirm & Approve"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
