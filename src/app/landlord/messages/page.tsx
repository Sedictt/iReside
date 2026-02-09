"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';
import { MessageSquare, Search, Send, ArrowLeft, MoreVertical, Phone, Mail } from 'lucide-react';

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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();

    // Initialize
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUser(user);
                await fetchConversations(user.id);
            } else {
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

    // Fetch messages when conversation selected
    useEffect(() => {
        if (!selectedConvId) return;

        const fetchMessages = async () => {
            setMsgLoading(true);
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', selectedConvId)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setMessages(data);
                // Mark as read (optional, can be done later)
            }
            setMsgLoading(false);
            scrollToBottom();
        };

        fetchMessages();

        // Subscribe to real-time messages
        const channel = supabase
            .channel(`conversation:${selectedConvId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConvId}` },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages(prev => [...prev, newMsg]);
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedConvId]);

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
        }
        setLoading(false);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConvId || !currentUser) return;

        const msgContent = newMessage.trim();
        setNewMessage(''); // Optimistic clear

        // Optimistic update
        // (Skipping for simplicity, relying on realtime)

        const { error } = await supabase
            .from('messages')
            .insert({
                conversation_id: selectedConvId,
                sender_id: currentUser.id,
                content: msgContent
            });

        if (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } else {
            // Update conversation timestamp
            await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', selectedConvId);
        }
    };

    // Derived state
    const activeConversation = conversations.find(c => c.id === selectedConvId);

    // Filtered list
    const filteredConversations = conversations.filter(c =>
        c.other_participant?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.listing?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className={styles.emptyState}>Loading conversations...</div>;
    }

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <div className={`${styles.sidebar} ${selectedConvId ? styles.hidden : ''} md:flex`}>
                <div className={styles.sidebarHeader}>
                    <h1 className={styles.title}>Messages</h1>
                    <div className={styles.searchBar}>
                        <Search className={styles.searchIcon} size={18} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search messages..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.conversationList}>
                    {filteredConversations.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                            No conversations found
                        </div>
                    ) : (
                        filteredConversations.map(conv => (
                            <div
                                key={conv.id}
                                className={`${styles.conversationCard} ${selectedConvId === conv.id ? styles.active : ''}`}
                                onClick={() => {
                                    setSelectedConvId(conv.id);
                                    router.push(`/landlord/messages?id=${conv.id}`);
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
                                    {conv.listing && (
                                        <div className={styles.listingTitle}>{conv.listing.title}</div>
                                    )}
                                    <div className={styles.lastMessage}>
                                        {/* We could fetch last message snippet if we want */}
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
                                        router.push('/landlord/messages');
                                    }}
                                >
                                    <ArrowLeft size={24} />
                                </button>
                                <div>
                                    <div className={styles.headerName}>{activeConversation.other_participant?.full_name}</div>
                                    <div className={styles.headerDetail}>
                                        {activeConversation.listing?.title || 'General Inquiry'}
                                    </div>
                                </div>
                            </div>
                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {/* Placeholder actions */}
                            </div>
                        </div>

                        <div className={styles.messageList}>
                            {msgLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                    No messages yet. Start the conversation!
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isMe = msg.sender_id === currentUser?.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`${styles.messageGroup} ${isMe ? styles.sent : styles.received}`}
                                        >
                                            <div className={styles.messageBubble}>
                                                {msg.content}
                                            </div>
                                            <span className={styles.messageTime}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
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
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className={styles.emptyState}>Loading messages...</div>}>
            <MessagesContent />
        </Suspense>
    );
}
