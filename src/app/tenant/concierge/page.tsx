"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Send, ArrowLeft, Loader2, Zap, Home, Wifi, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./page.module.css";
import Image from "next/image";

type Message = {
    role: 'bot' | 'user';
    content: string;
    id: string; // Add ID for better key management in Framer Motion
};

type KnowledgeItem = {
    category: string;
    topic: string;
    content: string;
};

// Define template questions outside the component to avoid recreation
const TEMPLATE_QUESTIONS = [
    { icon: <Wifi size={14} />, text: "What's the wifi password?" },
    { icon: <Zap size={14} />, text: "How do I use the thermostat?" },
    { icon: <Home size={14} />, text: "Where is the trash disposal?" },
    { icon: <Shield size={14} />, text: "What are the quiet hours?" },
];

const BotAvatar = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <div className={className} style={{ position: 'relative', overflow: 'hidden', ...style }}>
        <Image
            src="/ai-avatar.png"
            alt="AI Concierge"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
            priority
        />
    </div>
);

export default function ConciergePage() {
    // Initial message with a unique ID
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'bot',
            content: "Hi! I'm I.R.I.S., your property assistant. How can I help you today?",
            id: 'init-1'
        }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
    const [propertyId, setPropertyId] = useState<string | null>(null);
    const [propertyInfo, setPropertyInfo] = useState<{ name: string } | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const supabase = createClient();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPropertyAndKnowledge();
    }, []);

    // Also scroll on typing status change to keep the typing indicator in view
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const fetchPropertyAndKnowledge = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data: lease } = await supabase
            .from('leases')
            .select('units(id, property_id, properties(name))')
            .eq('tenant_id', user.id)
            .eq('status', 'active')
            .single();

        const units = lease?.units as any;
        if (units?.properties) {
            setPropertyInfo({ name: units.properties.name });
            setPropertyId(units.property_id || null);

            const { data: kb } = await supabase
                .from('property_knowledge_base')
                .select('category, topic, content')
                .eq('property_id', units.property_id);

            if (kb) setKnowledgeBase(kb);
        }

        setLoading(false);
    };

    const handleSend = async (e?: React.FormEvent, overrideInput?: string) => {
        if (e) e.preventDefault();

        const textToSend = overrideInput || input.trim();
        if (!textToSend || isTyping) return;

        // Optimistically add user message
        const userMsgId = Date.now().toString();
        setMessages(prev => [...prev, { role: 'user', content: textToSend, id: userMsgId }]);
        setInput("");
        setIsTyping(true);

        try {
            const response = await fetch('/api/ai/concierge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: textToSend,
                    propertyId,
                    propertyName: propertyInfo?.name,
                }),
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const data = await response.json();
            const botResponse = data.response || "I'm sorry, I couldn't process that. Please try again.";

            setMessages(prev => [...prev, { role: 'bot', content: botResponse, id: `bot-${Date.now()}` }]);
        } catch (error) {
            console.error('Concierge error:', error);
            setMessages(prev => [
                ...prev,
                {
                    role: 'bot',
                    content: "I'm having trouble connecting to the concierge service. Please try again later.",
                    id: `error-${Date.now()}`
                },
            ]);
        } finally {
            setIsTyping(false);
            // Focus input after a short delay
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <Loader2 className={styles.loadingIcon} size={40} />
                </motion.div>
                <p>Initializing I.R.I.S....</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.bgDecoration} />

            <motion.div
                className={styles.chatInterface}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                {/* Header */}
                <header className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.push('/tenant/dashboard')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className={styles.headerContent}>
                        <div className={styles.avatarContainer}>
                            <BotAvatar className={styles.avatarImage} />
                            <div className={styles.statusDot} />
                        </div>
                        <div className={styles.headerText}>
                            <h1>I.R.I.S.</h1>
                            <span className={styles.irisMeaning}>iReside Intelligent Support</span>
                            <p>{propertyInfo?.name ? propertyInfo.name : 'Your Personal Property Assistant'}</p>
                        </div>
                    </div>
                </header>

                {/* Chat Area */}
                <div className={styles.chatWrapper}>
                    <div className={styles.messagesList}>
                        <AnimatePresence mode="popLayout">
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    layout
                                    className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : styles.botRow}`}
                                >
                                    {msg.role === 'bot' && (
                                        <div className={styles.messageAvatar}>
                                            <BotAvatar style={{ width: '100%', height: '100%' }} />
                                        </div>
                                    )}
                                    <div className={`${styles.bubble} ${styles[msg.role]}`}>
                                        {msg.role === 'bot' ? (
                                            // Simple parser for bold text (**text**)
                                            msg.content.split(/(\*\*.*?\*\*)/).map((part, index) => (
                                                part.startsWith('**') && part.endsWith('**') ? (
                                                    <strong key={index}>{part.slice(2, -2)}</strong>
                                                ) : (
                                                    <span key={index}>{part}</span>
                                                )
                                            ))
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={`${styles.messageRow} ${styles.botRow}`}
                                >
                                    <div className={styles.messageAvatar}>
                                        <BotAvatar style={{ width: '100%', height: '100%' }} />
                                    </div>
                                    <div className={`${styles.bubble} ${styles.typingBubble}`}>
                                        <span className={styles.dot} />
                                        <span className={styles.dot} />
                                        <span className={styles.dot} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Section */}
                <div className={styles.footer}>
                    <div className={styles.quickQuestions}>
                        {TEMPLATE_QUESTIONS.map((q, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(undefined, q.text)}
                                className={styles.chip}
                                disabled={isTyping}
                                type="button"
                            >
                                {q.icon}
                                <span>{q.text}</span>
                            </button>
                        ))}
                    </div>

                    <form className={styles.inputForm} onSubmit={(e) => handleSend(e)}>
                        <input
                            ref={inputRef}
                            className={styles.input}
                            placeholder="Type a message..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={isTyping}
                        />
                        <button
                            className={styles.sendButton}
                            disabled={!input.trim() || isTyping}
                            type="submit"
                        >
                            {isTyping ? <Loader2 className={styles.spin} size={18} /> : <Send size={18} />}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
