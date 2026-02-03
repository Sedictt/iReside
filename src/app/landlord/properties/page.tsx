"use client";

import { useState, useEffect } from "react";
import { Building, MapPin, Loader2, Edit2, Check, X, User, Filter, ArrowUpDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import styles from "./properties.module.css";

// Interface matches database
type Unit = {
    id: string;
    unit_number: string;
    unit_type: string;
    rent_amount: number;
    status: 'available' | 'occupied' | 'maintenance' | 'neardue';
    leases?: any[];
};

type Property = {
    id: string;
    name: string;
    address: string;
    units: Unit[];
};

export default function PropertiesPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUnit, setEditingUnit] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ rent: number; status: string }>({ rent: 0, status: '' });

    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('unit_number');

    const supabase = createClient();

    useEffect(() => {
        fetchProperties();
    }, []);

    async function fetchProperties() {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch properties with units and active leases
        const { data, error } = await supabase
            .from('properties')
            .select(`
        *,
        units (
          *,
          leases (
            *,
            profiles (*)
          )
        )
      `)
            .eq('landlord_id', user.id)
            .order('created_at', { ascending: true });

        if (data) {
            // Sort units by number naturally
            const props = data.map((p: any) => ({
                ...p,
                units: p.units.sort((a: any, b: any) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }))
            }));
            setProperties(props);
        }
        setIsLoading(false);
    }

    function startEdit(unit: Unit) {
        setEditingUnit(unit.id);
        setEditForm({
            rent: unit.rent_amount,
            status: unit.status
        });
    }

    function cancelEdit() {
        setEditingUnit(null);
    }

    async function saveEdit(unitId: string) {
        const { error } = await supabase
            .from('units')
            .update({
                rent_amount: editForm.rent,
                status: editForm.status
            })
            .eq('id', unitId);

        if (!error) {
            setProperties(prev => prev.map(p => ({
                ...p,
                units: p.units.map(u => u.id === unitId ? { ...u, rent_amount: editForm.rent, status: editForm.status as any } : u)
            })));
            setEditingUnit(null);
        }
    }

    function getActiveTenant(unit: Unit) {
        // Only looking for active leases
        const lease = unit.leases?.find((l: any) => l.status === 'active');
        return lease?.profiles?.full_name || '-';
    }

    function getFilteredAndSortedUnits(units: Unit[]) {
        let result = [...units];

        // Filter
        if (filterStatus !== 'all') {
            result = result.filter(u => u.status === filterStatus);
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'rent_asc') return a.rent_amount - b.rent_amount;
            if (sortBy === 'rent_desc') return b.rent_amount - a.rent_amount;
            // Default: Unit Number
            return a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true });
        });

        return result;
    }

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 className={styles.spinner} size={32} />
                <p>Loading properties...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 className={styles.title}>Properties & Units</h1>
                        <p className={styles.subtitle}>Manage your portfolio details, rent pricing, and unit statuses.</p>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className={styles.controlGroup}>
                            <Filter size={16} className={styles.controlIcon} />
                            <select
                                className={styles.controlSelect}
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="available">Vacant</option>
                                <option value="occupied">Occupied</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="neardue">Payment Due</option>
                            </select>
                        </div>
                        <div className={styles.controlGroup}>
                            <ArrowUpDown size={16} className={styles.controlIcon} />
                            <select
                                className={styles.controlSelect}
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="unit_number">Sort by Unit #</option>
                                <option value="rent_asc">Rent (Low to High)</option>
                                <option value="rent_desc">Rent (High to Low)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            {properties.map(property => (
                <div key={property.id} className={styles.propertySection}>
                    <div className={styles.propertyHeader}>
                        <div>
                            <div className={styles.propertyName}>
                                <Building size={18} />
                                {property.name}
                            </div>
                            <div className={styles.propertyAddress}>
                                <MapPin size={14} />
                                {property.address}
                            </div>
                        </div>
                        <div className={styles.unitBadge}>
                            {property.units.length} Units
                        </div>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Unit</th>
                                    <th>Type</th>
                                    <th>Tenant</th>
                                    <th>Status</th>
                                    <th>Monthly Rent</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {property.units.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className={styles.emptyState}>No units configured. Use the Blueprint to add units.</td>
                                    </tr>
                                ) : (
                                    getFilteredAndSortedUnits(property.units).map(unit => {
                                        const isEditing = editingUnit === unit.id;
                                        return (
                                            <tr key={unit.id}>
                                                <td><strong>{unit.unit_number}</strong></td>
                                                <td style={{ textTransform: 'capitalize' }}>{unit.unit_type}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {getActiveTenant(unit) !== '-' && <User size={14} />}
                                                        {getActiveTenant(unit)}
                                                    </div>
                                                </td>
                                                <td>
                                                    {isEditing ? (
                                                        <select
                                                            className={styles.statusSelect}
                                                            value={editForm.status}
                                                            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                                        >
                                                            <option value="available">Available</option>
                                                            <option value="occupied">Occupied</option>
                                                            <option value="maintenance">Maintenance</option>
                                                            <option value="neardue">Payment Due</option>
                                                        </select>
                                                    ) : (
                                                        <StatusBadge status={unit.status} />
                                                    )}
                                                </td>
                                                <td>
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            className={styles.rentInput}
                                                            value={editForm.rent}
                                                            onChange={e => setEditForm({ ...editForm, rent: Number(e.target.value) })}
                                                        />
                                                    ) : (
                                                        `₱${unit.rent_amount.toLocaleString()}`
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {isEditing ? (
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                            <button onClick={() => saveEdit(unit.id)} className={`${styles.actionBtn} ${styles.saveBtn}`}>
                                                                <Check size={18} />
                                                            </button>
                                                            <button onClick={cancelEdit} className={`${styles.actionBtn} ${styles.cancelBtn}`}>
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => startEdit(unit)} className={styles.actionBtn}>
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: any = {
        available: { bg: '#dcfce7', text: '#166534', label: 'Vacant' },
        occupied: { bg: '#e0e7ff', text: '#3730a3', label: 'Occupied' },
        maintenance: { bg: '#fef9c3', text: '#854d0e', label: 'Maintenance' },
        neardue: { bg: '#fee2e2', text: '#991b1b', label: 'Late Payment' },
    };

    // Fallback
    const config = colors[status] || colors.available;

    return (
        <span style={{
            background: config.bg,
            color: config.text,
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 700
        }}>
            {config.label}
        </span>
    );
}
