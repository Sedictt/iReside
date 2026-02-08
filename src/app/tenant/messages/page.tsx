"use client";

import { useEffect, useState, useRef, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';
import { MessageSquare, Search, Send, ArrowLeft, MoreVertical, Phone, Mail, Home, Loader2, Check, CheckCheck, Eye, MapPin, User2, X } from 'lucide-react';

type Profile = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
};

type Conversation = {
    id: string;
    listing_id: string | null;
    participant1_id: string;
    participant2_id: string;
    updated_at: string;
    listing?: { title: string };
    other_participant?: Profile;
    last_message?: string;
};

type Message = {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
    delivered_at: string | null;
    seen_at: string | null;
    optimistic?: boolean;
};

type UnitInfo = {
    id: string;
    unit_number: string | null;
    property: { id: string; name: string; address: string } | null;
};

function MessagesContent() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [participantUnit, setParticipantUnit] = useState<UnitInfo | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [isUnitMapOpen, setIsUnitMapOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageListRef = useRef<HTMLDivElement>(null);
    const seenObserverRef = useRef<IntersectionObserver | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const activeConversation = conversations.find(c => c.id === selectedConvId);
    const participantName = activeConversation?.other_participant?.full_name || 'Unknown';
    const participantRole = activeConversation?.other_participant?.role || 'tenant';
    const roleLabel = participantRole === 'landlord' ? 'Landlord' : participantRole === 'admin' ? 'Admin' : 'Tenant';
    const unitLabel = participantUnit?.unit_number ? `Unit ${participantUnit.unit_number}` : null;
    const propertyLabel = participantUnit?.property?.name || participantUnit?.property?.address || null;

    // Initialize
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUser(user);
                await fetchConversations(user.id);
            } else {
                router.push('/login');
                setLoading(false);
            }
        };
        init();
    }, []);

    // Handle URL params
    useEffect(() => {
        const id = searchParams.get('id');
        if (id && conversations.length > 0) {
            // Verify access
            if (conversations.find(c => c.id === id)) {
                setSelectedConvId(id);
            }
        }
    }, [searchParams, conversations]);

    const markMessagesDelivered = useCallback(async (items: Message[]) => {
        if (!currentUser) return;
        const ids = items
            .filter(message => !message.optimistic)
            .filter(message => message.sender_id !== currentUser.id && !message.delivered_at)
            .map(message => message.id);

        if (ids.length === 0) return;
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('messages')
            .update({ delivered_at: now })
            .in('id', ids)
            .is('delivered_at', null)
            .select('id, delivered_at');

        if (error) {
            console.error('Failed to mark messages delivered:', error);
            return;
        }

        if (data && data.length > 0) {
            setMessages(prev => prev.map(message => {
                const updated = data.find(row => row.id === message.id);
                return updated ? { ...message, ...updated } : message;
            }));
        }
    }, [currentUser, supabase]);

    const markMessagesSeen = useCallback(async (items: Message[]) => {
        if (!currentUser) return;
        const ids = items
            .filter(message => !message.optimistic)
            .filter(message => message.sender_id !== currentUser.id && !message.seen_at)
            .map(message => message.id);

        if (ids.length === 0) return;
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('messages')
            .update({ seen_at: now, delivered_at: now, is_read: true })
            .in('id', ids)
            .is('seen_at', null)
            .select('id, delivered_at, seen_at, is_read');

        if (error) {
            console.error('Failed to mark messages seen:', error);
            return;
        }

        if (data && data.length > 0) {
            setMessages(prev => prev.map(message => {
                const updated = data.find(row => row.id === message.id);
                return updated ? { ...message, ...updated } : message;
            }));
        }
    }, [currentUser, supabase]);

    // Fetch messages when conversation selected
    useEffect(() => {
        if (!selectedConvId) return;
        let isActive = true;

        const fetchMessages = async (silent = false) => {
            if (!silent) {
                setMsgLoading(true);
            }

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', selectedConvId)
                .order('created_at', { ascending: true });

            if (!error && data && isActive) {
                setMessages(prev => {
                    const optimistic = prev.filter(message => message.optimistic);
                    const mergedIds = new Set(data.map(message => message.id));
                    const combined = [...data, ...optimistic.filter(message => !mergedIds.has(message.id))];
                    return combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                });
                scrollToBottom();
                void markMessagesDelivered(data);
            }

            if (!silent && isActive) {
                setMsgLoading(false);
            }
        };

        void fetchMessages();

        // Subscribe to real-time messages
        const channel = supabase
            .channel(`conversation:${selectedConvId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConvId}` },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages(prev => {
                        if (prev.some(msg => msg.id === newMsg.id)) {
                            return prev;
                        }

                        const optimisticIndex = prev.findIndex(msg =>
                            msg.optimistic &&
                            msg.sender_id === newMsg.sender_id &&
                            msg.content === newMsg.content
                        );

                        if (optimisticIndex >= 0) {
                            const updated = [...prev];
                            updated[optimisticIndex] = newMsg;
                            return updated;
                        }

                        return [...prev, newMsg];
                    });
                    scrollToBottom();

                    if (currentUser && newMsg.sender_id !== currentUser.id) {
                        void markMessagesDelivered([newMsg]);
                    }
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConvId}` },
                (payload) => {
                    const updatedMsg = payload.new as Message;
                    setMessages(prev => prev.map(message => message.id === updatedMsg.id ? updatedMsg : message));
                }
            )
            .subscribe();

        const intervalId = window.setInterval(() => {
            void fetchMessages(true);
        }, 5000);

        return () => {
            isActive = false;
            window.clearInterval(intervalId);
            supabase.removeChannel(channel);
        };
    }, [selectedConvId, supabase, currentUser, markMessagesDelivered]);

    useEffect(() => {
        if (!selectedConvId || !activeConversation?.other_participant?.id) {
            setParticipantUnit(null);
            return;
        }

        if (activeConversation.other_participant.role !== 'tenant') {
            setParticipantUnit(null);
            return;
        }

        let isActive = true;

        const fetchParticipantUnit = async () => {
            const { data, error } = await supabase
                .from('leases')
                .select(`
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
                .eq('tenant_id', activeConversation.other_participant?.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1);

            if (!isActive) return;

            if (error || !data || data.length === 0) {
                setParticipantUnit(null);
                return;
            }

            const rawData = data[0] as any;
            const unitData = Array.isArray(rawData.unit) ? rawData.unit[0] : rawData.unit;

            if (!unitData) {
                setParticipantUnit(null);
                return;
            }

            const propertyData = Array.isArray(unitData.property) ? unitData.property[0] : unitData.property;

            setParticipantUnit({
                id: unitData.id,
                unit_number: unitData.unit_number,
                property: propertyData ? {
                    id: propertyData.id,
                    name: propertyData.name,
                    address: propertyData.address
                } : null
            });
        };

        void fetchParticipantUnit();

        return () => {
            isActive = false;
        };
    }, [selectedConvId, activeConversation?.other_participant?.id, activeConversation?.other_participant?.role, supabase]);

    useEffect(() => {
        if (!selectedConvId || !currentUser || !messageListRef.current) return;

        if (seenObserverRef.current) {
            seenObserverRef.current.disconnect();
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleIds = entries
                    .filter(entry => entry.isIntersecting)
                    .map(entry => entry.target.getAttribute('data-message-id'))
                    .filter((id): id is string => Boolean(id));

                if (visibleIds.length === 0) return;

                const visibleMessages = messages.filter(message => visibleIds.includes(message.id));
                void markMessagesSeen(visibleMessages);
            },
            { root: messageListRef.current, threshold: 0.6 }
        );

        seenObserverRef.current = observer;

        const messageNodes = messageListRef.current.querySelectorAll('[data-message-id]');
        messageNodes.forEach(node => observer.observe(node));

        return () => {
            observer.disconnect();
        };
    }, [selectedConvId, currentUser, messages, markMessagesSeen]);

    useEffect(() => {
        if (!isMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const fetchConversations = async (userId: string) => {
        setLoading(true);
        // 1. Fetch conversations
        // We use OR logic for participants
        const { data: convs, error } = await supabase
            .from('conversations')
            .select(`
                *,
                listing:property_listings(title)
            `)
            .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
            .order('updated_at', { ascending: false });

        if (error || !convs) {
            console.error('Error fetching conversations:', error);
            setLoading(false);
            return;
        }

        // 2. Fetch profiles for other participants
        const otherUserIds = convs.map(c =>
            c.participant1_id === userId ? c.participant2_id : c.participant1_id
        );
        const uniqueIds = Array.from(new Set(otherUserIds));

        if (uniqueIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, role')
                .in('id', uniqueIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

            // 3. Map back to conversations
            const enrichedConvs = convs.map(c => {
                const otherId = c.participant1_id === userId ? c.participant2_id : c.participant1_id;
                return {
                    ...c,
                    other_participant: profileMap.get(otherId) || { id: otherId, full_name: 'Unknown User', avatar_url: null, role: 'tenant' }
                };
            });

            setConversations(enrichedConvs);
        } else {
            setConversations(convs as any);
            // Even if no profiles found, show the conversations (though names might be missing)
        }
        setLoading(false);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConvId || !currentUser) return;

        const msgContent = newMessage.trim();
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: Message = {
            id: tempId,
            conversation_id: selectedConvId,
            sender_id: currentUser.id,
            content: msgContent,
            created_at: new Date().toISOString(),
            is_read: false,
            delivered_at: null,
            seen_at: null,
            optimistic: true
        };

        setNewMessage(''); // Optimistic clear
        setMessages(prev => [...prev, optimisticMessage]);
        scrollToBottom();

        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: selectedConvId,
                sender_id: currentUser.id,
                content: msgContent
            })
            .select('*')
            .single();

        if (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
            setMessages(prev => prev.filter(message => message.id !== tempId));
            setNewMessage(msgContent);
        } else if (data) {
            setMessages(prev => prev.map(message => message.id === tempId ? data : message));
            // Update conversation timestamp
            await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', selectedConvId);
        }
    };

    const getMessageStatus = (message: Message) => {
        if (message.optimistic) return 'sending';
        if (message.seen_at) return 'seen';
        if (message.delivered_at) return 'delivered';
        return 'sent';
    };

    const renderStatusIcon = (status: string) => {
        switch (status) {
            case 'sending':
                return <Loader2 size={12} className={styles.statusIcon} />;
            case 'sent':
                return <Check size={12} className={styles.statusIcon} />;
            case 'delivered':
                return <CheckCheck size={12} className={styles.statusIcon} />;
            case 'seen':
                return <Eye size={12} className={styles.statusIcon} />;
            default:
                return null;
        }
    };

    // Filtered list
    const filteredConversations = conversations.filter(c =>
        c.other_participant?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.listing?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className={styles.emptyState}>Loading conversations...</div>;
    }

    return (
        <>
            <div className={styles.container}>
                {/* Sidebar */}
                <div className={`${styles.sidebar} ${selectedConvId ? styles.hidden : ''} md:flex`}>
                    <div className={styles.sidebarHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h1 className={styles.title}>Messages</h1>
                            <button
                                onClick={() => router.push('/tenant/dashboard')}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}
                                title="Back to Dashboard"
                            >
                                <Home size={20} />
                            </button>
                        </div>
                        <div className={styles.searchBar}>
                            <Search className={styles.searchIcon} size={18} />
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.conversationList}>
                        {filteredConversations.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                                <MessageSquare size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <p>No conversations yet.</p>
                                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Visit Community to message neighbors.</p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => (
                                <div
                                    key={conv.id}
                                    className={`${styles.conversationCard} ${selectedConvId === conv.id ? styles.active : ''}`}
                                    onClick={() => {
                                        setSelectedConvId(conv.id);
                                        router.push(`/tenant/messages?id=${conv.id}`);
                                    }}
                                >
                                    <div className={styles.avatar}>
                                        {conv.other_participant?.avatar_url ? (
                                            <img src={conv.other_participant.avatar_url} alt="Avatar" />
                                        ) : (
                                            <span>{conv.other_participant?.full_name?.charAt(0).toUpperCase() || '?'}</span>
                                        )}
                                    </div>
                                    <div className={styles.cardContent}>
                                        <div className={styles.cardTop}>
                                            <span className={styles.name}>{conv.other_participant?.full_name || 'Unknown'}</span>
                                            <span className={styles.time}>{new Date(conv.updated_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className={styles.listingTitle}>
                                            {conv.listing?.title || 'Direct Message'}
                                        </div>
                                        <div className={styles.lastMessage}>
                                            Click to view chat
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`${styles.chatArea} ${!selectedConvId ? styles.hidden : ''} md:flex`}>
                    {selectedConvId && activeConversation ? (
                        <>
                            <div className={styles.chatHeader}>
                                <div className={styles.chatHeaderInfo}>
                                    <button
                                        className={styles.backButton}
                                        onClick={() => {
                                            setSelectedConvId(null);
                                            router.push('/tenant/messages');
                                        }}
                                    >
                                        <ArrowLeft size={24} />
                                    </button>
                                    <div className={styles.headerAvatar}>
                                        {activeConversation.other_participant?.avatar_url ? (
                                            <img src={activeConversation.other_participant.avatar_url} alt={participantName} />
                                        ) : (
                                            <span>{participantName.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className={styles.headerText}>
                                        <div className={styles.headerNameRow}>
                                            <span className={styles.headerName}>{participantName}</span>
                                            <span className={styles.headerRole}>{roleLabel}</span>
                                        </div>
                                        <div className={styles.headerMeta}>
                                            <span className={styles.headerDetail}>
                                                {activeConversation.listing?.title || 'Direct Message'}
                                            </span>
                                            {unitLabel ? (
                                                <span className={styles.unitBadge}>
                                                    {unitLabel}{propertyLabel ? ` • ${propertyLabel}` : ''}
                                                </span>
                                            ) : (
                                                <span className={styles.unitBadgeMuted}>No unit on file</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.headerActions} ref={menuRef}>
                                    <button
                                        className={styles.iconButton}
                                        onClick={() => setIsUnitMapOpen(true)}
                                        title="Open unit map"
                                    >
                                        <MapPin size={18} />
                                    </button>
                                    <button
                                        className={styles.iconButton}
                                        onClick={() => setIsMenuOpen(prev => !prev)}
                                        title="More"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                    {isMenuOpen ? (
                                        <div className={styles.menu}>
                                            <button
                                                className={styles.menuItem}
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    setIsUnitModalOpen(true);
                                                }}
                                                disabled={!participantUnit}
                                            >
                                                View unit details
                                            </button>
                                            <button
                                                className={styles.menuItem}
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    setIsUnitMapOpen(true);
                                                }}
                                            >
                                                Open unit map
                                            </button>
                                            <button
                                                className={styles.menuItem}
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    setSelectedConvId(null);
                                                    router.push('/tenant/messages');
                                                }}
                                            >
                                                Close chat
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className={styles.messageList} ref={messageListRef}>
                                {msgLoading ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading messages...</div>
                                ) : messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                        No messages yet. Say hello!
                                    </div>
                                ) : (
                                    messages.map(msg => {
                                        const isMe = msg.sender_id === currentUser?.id;
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`${styles.messageGroup} ${isMe ? styles.sent : styles.received}`}
                                                data-message-id={msg.id}
                                            >
                                                <div className={styles.messageBubble}>
                                                    {msg.content}
                                                </div>
                                                <div className={styles.messageMeta}>
                                                    <span className={styles.messageTime}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe ? (() => {
                                                        const status = getMessageStatus(msg);
                                                        return (
                                                            <span className={styles.messageStatus}>
                                                                {renderStatusIcon(status)}
                                                                <span>{status}</span>
                                                            </span>
                                                        );
                                                    })() : null}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className={styles.inputArea}>
                                <form className={styles.inputForm} onSubmit={handleSendMessage}>
                                    <textarea
                                        className={styles.messageInput}
                                        placeholder="Type a message..."
                                        rows={1}
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        className={styles.sendButton}
                                        disabled={!newMessage.trim()}
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <MessageSquare size={32} />
                            </div>
                            <h3>Your Messages</h3>
                            <p>Select a conversation from the sidebar to start chatting.</p>
                        </div>
                    )}
                </div>
            </div>
            {isUnitModalOpen ? (
                <div className={styles.modalOverlay} onClick={() => setIsUnitModalOpen(false)}>
                    <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div>
                                <p className={styles.modalTitle}>Unit details</p>
                                <p className={styles.modalSubtitle}>{participantName}</p>
                            </div>
                            <button className={styles.iconButton} onClick={() => setIsUnitModalOpen(false)}>
                                <MoreVertical size={18} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.detailRow}>
                                <User2 size={18} />
                                <div>
                                    <p className={styles.detailLabel}>Role</p>
                                    <p className={styles.detailValue}>{roleLabel}</p>
                                </div>
                            </div>
                            <div className={styles.detailRow}>
                                <MapPin size={18} />
                                <div>
                                    <p className={styles.detailLabel}>Unit</p>
                                    <p className={styles.detailValue}>
                                        {unitLabel || 'No unit on file'}
                                    </p>
                                    {propertyLabel ? (
                                        <p className={styles.detailSubValue}>{propertyLabel}</p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => setIsUnitModalOpen(false)}
                            >
                                Close
                            </button>
                            <button
                                className={styles.primaryButton}
                                onClick={() => {
                                    setIsUnitModalOpen(false);
                                    setIsUnitMapOpen(true);
                                }}
                            >
                                Open unit map
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {isUnitMapOpen ? (
                <div className={styles.modalOverlay} onClick={() => setIsUnitMapOpen(false)}>
                    <div className={styles.mapModalCard} onClick={(event) => event.stopPropagation()}>
                        <button className={styles.mapCloseButton} onClick={() => setIsUnitMapOpen(false)}>
                            <X size={18} />
                        </button>
                        <div className={styles.mapFrame}>
                            <iframe
                                title="Unit map"
                                src="/tenant/unit-map?embed=1"
                                className={styles.mapIframe}
                            />
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}

export default function TenantMessagesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MessagesContent />
        </Suspense>
    );
}
