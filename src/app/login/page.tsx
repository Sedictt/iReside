"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { login, signup } from "./actions";
import { Mail, Lock, User, Building2, UserCircle, ArrowRight, Loader2, Info } from "lucide-react";
import styles from "./login.module.css";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const message = searchParams.get("message");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        setIsLoading(true);
        // Let the form action handle the submission
    };

    return (
        <main className={styles.container}>
            <div className={styles.blob1} />
            <div className={styles.blob2} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.authCard}
            >
                <div className={styles.header}>
                    <h1 className={styles.title}>{isLogin ? "Welcome Back" : "Create Account"}</h1>
                    <p className={styles.subtitle}>
                        {isLogin
                            ? "Sign in to manage your properties or units"
                            : "Join the modern way of living"}
                    </p>
                </div>

                {error && (
                    <div className={styles.errorBanner}>
                        <Info size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {message && (
                    <div className={styles.successBanner}>
                        <Info size={18} />
                        <span>{message}</span>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    <motion.form
                        key={isLogin ? "login" : "signup"}
                        initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                        className={styles.form}
                        onSubmit={handleSubmit}
                        action={isLogin ? login : signup}
                    >
                        {!isLogin && (
                            <>
                                <div className={styles.inputGroup}>
                                    <label>Full Name</label>
                                    <div className={styles.inputWrapper}>
                                        <User size={18} className={styles.icon} />
                                        <input name="full_name" type="text" placeholder="John Doe" required />
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label>I am a...</label>
                                    <div className={styles.roleGrid}>
                                        <label className={styles.roleOption}>
                                            <input type="radio" name="role" value="tenant" defaultChecked />
                                            <div className={styles.roleCard}>
                                                <UserCircle size={20} />
                                                <span>Tenant</span>
                                            </div>
                                        </label>
                                        <label className={styles.roleOption}>
                                            <input type="radio" name="role" value="landlord" />
                                            <div className={styles.roleCard}>
                                                <Building2 size={20} />
                                                <span>Landlord</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className={styles.inputGroup}>
                            <label>Email Address</label>
                            <div className={styles.inputWrapper}>
                                <Mail size={18} className={styles.icon} />
                                <input name="email" type="email" placeholder="email@example.com" required />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label>Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock size={18} className={styles.icon} />
                                <input name="password" type="password" placeholder="••••••••" required />
                            </div>
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className={styles.spinner} size={20} />
                            ) : (
                                <>
                                    {isLogin ? "Sign In" : "Sign Up"}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </motion.form>
                </AnimatePresence>

                <div className={styles.footer}>
                    <p>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className={styles.toggleBtn}
                        >
                            {isLogin ? "Create one" : "Sign in here"}
                        </button>
                    </p>
                </div>
            </motion.div>
        </main>
    );
}
