"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { Plus, Building, MapPin, ChevronLeft, Loader2, Home } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import VisualBuilder from "@/components/landlord/VisualBuilder";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./blueprint.module.css";

type UnitRow = {
    id: string;
    unit_type: string;
    grid_x: number;
    grid_y: number;
    status: string;
    unit_number: string | null;
    rent_amount: number | null;
};

type PropertyRow = {
    id: string;
    name: string;
    address: string;
    description: string | null;
    units?: UnitRow[];
};

export default function BlueprintContent() {
    const [properties, setProperties] = useState<PropertyRow[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<PropertyRow | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingProperty, setIsAddingProperty] = useState(false);
    const supabase = useMemo(() => createClient(), []);

    const fetchProperties = useCallback(async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsLoading(false);
            return;
        }

        const { data } = await supabase
            .from('properties')
            .select('*, units(*)')
            .eq('landlord_id', user.id);

        if (data) setProperties(data);
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        const id = requestAnimationFrame(() => {
            void fetchProperties();
        });
        return () => cancelAnimationFrame(id);
    }, [fetchProperties]);

    async function handleAddProperty(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const { data: { user } } = await supabase.auth.getUser();

        const newProperty = {
            landlord_id: user?.id,
            name: formData.get('name'),
            address: formData.get('address'),
            description: formData.get('description'),
        };

        const { data } = await supabase
            .from('properties')
            .insert([newProperty])
            .select();

        if (data) {
            setProperties([...properties, { ...data[0], units: [] }]);
            setIsAddingProperty(false);
        }
    }

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 className={styles.spinner} />
                <p>Loading your portfolio...</p>
            </div>
        );
    }

    if (selectedProperty) {
        return (
            <div className={styles.viewContainer}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <button onClick={() => setSelectedProperty(null)} className={styles.backBtn}>
                            <ChevronLeft size={20} />
                            Back to Portfolio
                        </button>
                        <h1 className={styles.title}>{selectedProperty.name}</h1>
                    </div>
                    <div className={styles.headerRight}>
                        <span className={styles.badge}>{selectedProperty.units?.length || 0} Units</span>
                    </div>
                </header>
                <div className={styles.visualBuilderWrapper}>
                    <VisualBuilder propertyId={selectedProperty.id} initialUnits={selectedProperty.units ?? []} />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.overview}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Unit Maps</h1>
                    <p className={styles.subtitle}>Visually manage your property layouts and units.</p>
                </div>
                <button onClick={() => setIsAddingProperty(true)} className={styles.primaryBtn}>
                    <Plus size={18} />
                    New Unit Map
                </button>
            </header>

            <div className={styles.propertyGrid}>
                {properties.map((property) => (
                    <div
                        key={property.id}
                        className={styles.propertyCard}
                        onClick={() => setSelectedProperty(property)}
                    >
                        <div className={styles.propertyIcon}>
                            <Building size={24} />
                        </div>
                        <div className={styles.propertyInfo}>
                            <h3 className={styles.propertyName}>{property.name}</h3>
                            <p className={styles.propertyAddress}>
                                <MapPin size={14} />
                                {property.address}
                            </p>
                            <div className={styles.propertyMeta}>
                                <span>{property.units?.length || 0} Units Configured</span>
                            </div>
                        </div>
                    </div>
                ))}

                {properties.length === 0 && (
                    <div className={styles.emptyState}>
                        <Home size={48} />
                        <h3>No unit maps yet</h3>
                        <p>Start by adding a property to create your first visual map.</p>
                        <button onClick={() => setIsAddingProperty(true)} className={styles.secondaryBtn}>
                            Get Started
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isAddingProperty && (
                    <div className={styles.modalOverlay}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={styles.modal}
                        >
                            <h2 className={styles.modalTitle}>Create New Unit Map</h2>
                            <form onSubmit={handleAddProperty} className={styles.form}>
                                <div className={styles.inputGroup}>
                                    <label>Property Name</label>
                                    <input name="name" placeholder="e.g. Sunset Heights" required />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Address</label>
                                    <input name="address" placeholder="123 Main St, City" required />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Description (Optional)</label>
                                    <textarea name="description" placeholder="A brief description..." rows={3} />
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="button" onClick={() => setIsAddingProperty(false)} className={styles.ghostBtn}>
                                        Cancel
                                    </button>
                                    <button type="submit" className={styles.primaryBtn}>
                                        Create
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
