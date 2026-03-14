"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, Lock, User, Chrome } from "lucide-react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

export default function SignupPage() {
    const { signInWithGoogle, user } = useAuth();
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in (must be in effect, not during render)
    useEffect(() => {
        // Auth state check (silenced)
        if (user) {
            // User detected, redirecting
            router.push('/');
        }
    }, [user, router]);

    if (user) return null;

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            router.push("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 relative overflow-hidden bg-background">
            {/* Background patterns */}
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl relative z-10 shadow-2xl"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(139,92,246,0.3)]"
                    >
                        <UserPlus className="text-primary-foreground w-8 h-8" />
                    </motion.div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter">Join SongDB</h1>
                    <p className="text-white/50 text-sm mt-2">Create your account to start discovering</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-xs p-3 rounded-xl mb-6 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 8 characters"
                                minLength={8}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] disabled:opacity-50 mt-4 active:scale-95"
                    >
                        {loading ? "Creating Account..." : "CREATE ACCOUNT"}
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-black px-4 text-white/30 tracking-widest font-medium">Or sign up with</span>
                    </div>
                </div>

                <button
                    onClick={signInWithGoogle}
                    className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 py-3.5 rounded-2xl transition-colors text-sm font-medium"
                >
                    <Chrome className="w-4 h-4" />
                    Continue with Google
                </button>

                <p className="text-center text-sm mt-8 text-white/40">
                    Already have an account?{" "}
                    <Link href="/auth/login" className="text-primary font-bold hover:underline">
                        Log in
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
