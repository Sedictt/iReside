"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, Bot, Save, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import styles from "./ConciergeModal.module.css";

type KnowledgeItem = {
    id: string;
    category: string;
    topic: string;
    content: string;
};

type ConciergeModalProps = {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    propertyName: string;
};

export default function ConciergeModal({ isOpen, onClose, propertyId, propertyName }: ConciergeModalProps) {
    const [items, setItems] = useState<KnowledgeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ category: 'General', topic: '', content: '' });
    const [isAdding, setIsAdding] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        if (isOpen && propertyId) {
            fetchKnowledge();
        }
    }, [isOpen, propertyId]);

    const fetchKnowledge = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('property_knowledge_base')
            .select('*')
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false });

        if (data) setItems(data);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newItem.topic || !newItem.content) return;
        setIsAdding(true);

        const { data, error } = await supabase
            .from('property_knowledge_base')
            .insert({
                property_id: propertyId,
                category: newItem.category,
                topic: newItem.topic,
                content: newItem.content
            })
            .select()
            .single();

        if (data) {
            setItems([data, ...items]);
            setNewItem({ category: 'General', topic: '', content: '' });
        }
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('property_knowledge_base')
            .delete()
            .eq('id', id);

        if (!error) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>
                            <Bot className={styles.icon} size={24} />
                            AI Concierge Knowledge Base
                        </h2>
                        <p className={styles.subtitle}>Teach the AI about <strong>{propertyName}</strong> so it can answer tenant questions.</p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.formSection}>
                        <h3>Add New Rule / Info</h3>
                        <div className={styles.grid}>
                            <div className={styles.inputGroup}>
                                <label>Category</label>
                                <select
                                    value={newItem.category}
                                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                >
                                    <option>General</option>
                                    <option>Wifi & Internet</option>
                                    <option>Trash & Recycling</option>
                                    <option>Emergency</option>
                                    <option>Amenities</option>
                                    <option>Policies</option>
                                </select>
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Topic / Question</label>
                                <input
                                    placeholder="e.g. Wifi Password, Trash Pickup Day"
                                    value={newItem.topic}
                                    onChange={e => setNewItem({ ...newItem, topic: e.target.value })}
                                />
                            </div>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label>Answer / Content</label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. The password is 'House123!'"
                                    value={newItem.content}
                                    onChange={e => setNewItem({ ...newItem, content: e.target.value })}
                                />
                            </div>
                        </div>
                        <button
                            className={styles.addBtn}
                            onClick={handleAdd}
                            disabled={!newItem.topic || !newItem.content || isAdding}
                        >
                            {isAdding ? <Loader2 className={styles.spin} size={16} /> : <Plus size={16} />}
                            Add Rule
                        </button>
                    </div>

                    <div className={styles.listSection}>
                        <h3>Existing Knowledge ({items.length})</h3>
                        {loading ? (
                            <div className={styles.loading}>Loading...</div>
                        ) : items.length === 0 ? (
                            <div className={styles.empty}>No information added yet.</div>
                        ) : (
                            <div className={styles.list}>
                                {items.map(item => (
                                    <div key={item.id} className={styles.item}>
                                        <div className={styles.itemContent}>
                                            <span className={styles.itemCategory}>{item.category}</span>
                                            <div className={styles.itemTopic}>{item.topic}</div>
                                            <div className={styles.itemText}>{item.content}</div>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => handleDelete(item.id)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
