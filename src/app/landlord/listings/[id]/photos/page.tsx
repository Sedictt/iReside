"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Upload,
    Loader2,
    Image as ImageIcon,
    Trash2,
    Star,
    GripVertical,
    X,
    Check,
    Camera,
    Home,
    Building2,
    MapPin,
    FileImage
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import styles from "./photos.module.css";

type Photo = {
    id: string;
    listing_id: string;
    url: string;
    storage_path: string | null;
    alt_text: string | null;
    caption: string | null;
    photo_type: string;
    display_order: number;
    is_primary: boolean;
    created_at: string;
};

type PhotoType = 'cover' | 'exterior' | 'interior' | 'amenity' | 'unit' | 'floor_plan' | 'document';

const photoTypeConfig: Record<PhotoType, { label: string; icon: React.ReactNode }> = {
    cover: { label: 'Cover Photo', icon: <Star size={14} /> },
    exterior: { label: 'Exterior', icon: <Building2 size={14} /> },
    interior: { label: 'Interior', icon: <Home size={14} /> },
    amenity: { label: 'Amenity', icon: <Camera size={14} /> },
    unit: { label: 'Unit', icon: <MapPin size={14} /> },
    floor_plan: { label: 'Floor Plan', icon: <FileImage size={14} /> },
    document: { label: 'Document', icon: <FileImage size={14} /> }
};

export default function PhotosPage() {
    const params = useParams();
    const router = useRouter();
    const listingId = params.id as string;

    const [photos, setPhotos] = useState<Photo[]>([]);
    const [listingTitle, setListingTitle] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
    const [draggedPhoto, setDraggedPhoto] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = useMemo(() => createClient(), []);

    const fetchPhotos = useCallback(async () => {
        setIsLoading(true);

        // Fetch listing info
        const { data: listing } = await supabase
            .from('property_listings')
            .select('title')
            .eq('id', listingId)
            .single();

        if (listing) {
            setListingTitle(listing.title);
        }

        // Fetch photos
        const { data: photosData } = await supabase
            .from('listing_photos')
            .select('*')
            .eq('listing_id', listingId)
            .order('display_order', { ascending: true });

        if (photosData) {
            setPhotos(photosData);
        }

        setIsLoading(false);
    }, [supabase, listingId]);

    useEffect(() => {
        fetchPhotos();
    }, [fetchPhotos]);

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsUploading(false);
            return;
        }

        const totalFiles = files.length;
        let uploadedCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${listingId}/${Date.now()}-${i}.${fileExt}`;

            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('listings')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                continue;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('listings')
                .getPublicUrl(fileName);

            // Create photo record
            const isPrimary = photos.length === 0 && uploadedCount === 0;
            const { error: dbError } = await supabase
                .from('listing_photos')
                .insert({
                    listing_id: listingId,
                    url: urlData.publicUrl,
                    storage_path: fileName,
                    photo_type: 'interior',
                    display_order: photos.length + uploadedCount,
                    is_primary: isPrimary
                });

            if (!dbError) {
                uploadedCount++;
            }

            setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
        }

        setIsUploading(false);
        setUploadProgress(0);
        fetchPhotos();

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    async function setPrimaryPhoto(photoId: string) {
        // Unset current primary
        await supabase
            .from('listing_photos')
            .update({ is_primary: false })
            .eq('listing_id', listingId);

        // Set new primary
        await supabase
            .from('listing_photos')
            .update({ is_primary: true })
            .eq('id', photoId);

        setPhotos(prev => prev.map(p => ({
            ...p,
            is_primary: p.id === photoId
        })));
    }

    async function updatePhotoType(photoId: string, type: PhotoType) {
        const { error } = await supabase
            .from('listing_photos')
            .update({ photo_type: type })
            .eq('id', photoId);

        if (!error) {
            setPhotos(prev => prev.map(p =>
                p.id === photoId ? { ...p, photo_type: type } : p
            ));
        }
    }

    async function updateCaption(photoId: string, caption: string) {
        await supabase
            .from('listing_photos')
            .update({ caption })
            .eq('id', photoId);

        setPhotos(prev => prev.map(p =>
            p.id === photoId ? { ...p, caption } : p
        ));
    }

    async function deletePhoto(photoId: string) {
        const photo = photos.find(p => p.id === photoId);
        if (!photo) return;

        // Delete from storage if path exists
        if (photo.storage_path) {
            await supabase.storage
                .from('listings')
                .remove([photo.storage_path]);
        }

        // Delete from database
        const { error } = await supabase
            .from('listing_photos')
            .delete()
            .eq('id', photoId);

        if (!error) {
            setPhotos(prev => prev.filter(p => p.id !== photoId));
            setSelectedPhotos(prev => prev.filter(id => id !== photoId));

            // If deleted photo was primary, set first remaining as primary
            if (photo.is_primary && photos.length > 1) {
                const remaining = photos.filter(p => p.id !== photoId);
                if (remaining.length > 0) {
                    setPrimaryPhoto(remaining[0].id);
                }
            }
        }
    }

    async function deleteSelectedPhotos() {
        if (selectedPhotos.length === 0) return;
        if (!confirm(`Delete ${selectedPhotos.length} selected photos?`)) return;

        for (const photoId of selectedPhotos) {
            await deletePhoto(photoId);
        }
        setSelectedPhotos([]);
    }

    function togglePhotoSelection(photoId: string) {
        setSelectedPhotos(prev =>
            prev.includes(photoId)
                ? prev.filter(id => id !== photoId)
                : [...prev, photoId]
        );
    }

    function selectAllPhotos() {
        if (selectedPhotos.length === photos.length) {
            setSelectedPhotos([]);
        } else {
            setSelectedPhotos(photos.map(p => p.id));
        }
    }

    // Drag and drop reordering
    function handleDragStart(photoId: string) {
        setDraggedPhoto(photoId);
    }

    async function handleDragOver(e: React.DragEvent, targetId: string) {
        e.preventDefault();
        if (!draggedPhoto || draggedPhoto === targetId) return;

        const draggedIdx = photos.findIndex(p => p.id === draggedPhoto);
        const targetIdx = photos.findIndex(p => p.id === targetId);

        if (draggedIdx === -1 || targetIdx === -1) return;

        const newPhotos = [...photos];
        const [removed] = newPhotos.splice(draggedIdx, 1);
        newPhotos.splice(targetIdx, 0, removed);

        // Update display order
        const updatedPhotos = newPhotos.map((p, idx) => ({ ...p, display_order: idx }));
        setPhotos(updatedPhotos);
    }

    async function handleDragEnd() {
        if (!draggedPhoto) return;

        // Save new order to database
        for (let i = 0; i < photos.length; i++) {
            await supabase
                .from('listing_photos')
                .update({ display_order: i })
                .eq('id', photos[i].id);
        }

        setDraggedPhoto(null);
    }

    const primaryPhoto = photos.find(p => p.is_primary);

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 className={styles.spinner} size={32} />
                <p>Loading photos...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href={`/landlord/listings/${listingId}/edit`} className={styles.backBtn}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className={styles.title}>Manage Photos</h1>
                        <p className={styles.subtitle}>{listingTitle}</p>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    {selectedPhotos.length > 0 && (
                        <>
                            <span className={styles.selectedCount}>
                                {selectedPhotos.length} selected
                            </span>
                            <button
                                className={styles.deleteSelectedBtn}
                                onClick={deleteSelectedPhotos}
                            >
                                <Trash2 size={16} />
                                Delete Selected
                            </button>
                        </>
                    )}
                    <button
                        className={styles.uploadBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 size={18} className={styles.spinner} />
                                Uploading ({uploadProgress}%)
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Upload Photos
                            </>
                        )}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className={styles.hiddenInput}
                    />
                </div>
            </header>

            {/* Primary Photo Section */}
            {primaryPhoto && (
                <div className={styles.primarySection}>
                    <h3>Cover Photo</h3>
                    <div className={styles.primaryPreview}>
                        <img src={primaryPhoto.url} alt="Cover" />
                        <div className={styles.primaryBadge}>
                            <Star size={14} fill="currentColor" />
                            Primary
                        </div>
                    </div>
                    <p className={styles.primaryHint}>
                        This photo will be shown as the main image for your listing. Click the star on any photo to change it.
                    </p>
                </div>
            )}

            {/* Upload Zone */}
            {photos.length === 0 && (
                <div
                    className={styles.uploadZone}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className={styles.uploadIcon}>
                        <ImageIcon size={48} strokeWidth={1.5} />
                    </div>
                    <h3>Add Photos to Your Listing</h3>
                    <p>Drag and drop photos here, or click to browse</p>
                    <span className={styles.uploadFormats}>
                        Supports: JPG, PNG, WebP (Max 10MB each)
                    </span>
                </div>
            )}

            {/* Photos Grid */}
            {photos.length > 0 && (
                <>
                    <div className={styles.toolbarRow}>
                        <button
                            className={styles.selectAllBtn}
                            onClick={selectAllPhotos}
                        >
                            {selectedPhotos.length === photos.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className={styles.photoCount}>{photos.length} photos</span>
                    </div>

                    <div className={styles.photosGrid}>
                        {photos.map(photo => (
                            <div
                                key={photo.id}
                                className={`${styles.photoCard} ${selectedPhotos.includes(photo.id) ? styles.selected : ''} ${draggedPhoto === photo.id ? styles.dragging : ''}`}
                                draggable
                                onDragStart={() => handleDragStart(photo.id)}
                                onDragOver={(e) => handleDragOver(e, photo.id)}
                                onDragEnd={handleDragEnd}
                            >
                                {/* Image */}
                                <div className={styles.photoImage}>
                                    <img src={photo.url} alt={photo.alt_text || 'Listing photo'} />

                                    {/* Overlay Controls */}
                                    <div className={styles.photoOverlay}>
                                        <button
                                            className={`${styles.overlayBtn} ${styles.selectBtn} ${selectedPhotos.includes(photo.id) ? styles.checked : ''}`}
                                            onClick={() => togglePhotoSelection(photo.id)}
                                        >
                                            {selectedPhotos.includes(photo.id) ? <Check size={16} /> : null}
                                        </button>

                                        <button
                                            className={`${styles.overlayBtn} ${styles.starBtn} ${photo.is_primary ? styles.active : ''}`}
                                            onClick={() => setPrimaryPhoto(photo.id)}
                                            title="Set as primary"
                                        >
                                            <Star size={16} fill={photo.is_primary ? 'currentColor' : 'none'} />
                                        </button>

                                        <button
                                            className={`${styles.overlayBtn} ${styles.deleteBtn}`}
                                            onClick={() => deletePhoto(photo.id)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Drag Handle */}
                                    <div className={styles.dragHandle}>
                                        <GripVertical size={16} />
                                    </div>

                                    {/* Primary Badge */}
                                    {photo.is_primary && (
                                        <div className={styles.primaryTag}>
                                            <Star size={12} fill="currentColor" /> Primary
                                        </div>
                                    )}
                                </div>

                                {/* Photo Info */}
                                <div className={styles.photoInfo}>
                                    <select
                                        value={photo.photo_type}
                                        onChange={(e) => updatePhotoType(photo.id, e.target.value as PhotoType)}
                                        className={styles.typeSelect}
                                    >
                                        {Object.entries(photoTypeConfig).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={photo.caption || ''}
                                        onChange={(e) => updateCaption(photo.id, e.target.value)}
                                        placeholder="Add caption..."
                                        className={styles.captionInput}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Tips */}
            <div className={styles.tips}>
                <h4>📸 Photo Tips</h4>
                <ul>
                    <li>Use natural lighting for best results</li>
                    <li>Show all rooms and key amenities</li>
                    <li>Include exterior and common areas</li>
                    <li>High-quality photos get more inquiries</li>
                    <li>Drag photos to reorder them</li>
                </ul>
            </div>
        </div>
    );
}
