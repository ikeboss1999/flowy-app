"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { Employee } from "@/types/employee"

type AuthProfile = {
    role: string
    permissions: any
    companyOwnerId: string
} | null

type AuthContextType = {
    user: User | null
    session: Session | null
    currentEmployee: Employee | null
    profile: AuthProfile
    isLoading: boolean
    signIn: (email: string) => Promise<{ error: any }>
    signOut: () => Promise<{ error: any }>
    loginAsEmployee: (staffId: string, pin: string) => Promise<{ success: boolean, error?: string }>
    logoutEmployee: () => void
    refreshEmployee: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
    const [profile, setProfile] = useState<AuthProfile>(null)
    const [isLoading, setIsLoading] = useState(true);

    const refreshProfile = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    setProfile({
                        role: data.user.role,
                        permissions: data.user.permissions || {},
                        companyOwnerId: data.user.companyOwnerId
                    });
                    setCurrentEmployee(data.employee || null);
                } else {
                    setProfile(null);
                    setCurrentEmployee(null);
                }
            } else {
                setProfile(null);
                setCurrentEmployee(null);
            }
        } catch (e) {
            console.error("[AuthContext] Failed to fetch profile:", e);
            setProfile(null);
            setCurrentEmployee(null);
        }
    };

    const refreshEmployee = async () => {
        try {
            const response = await fetch('/api/auth/me');
            if (!response.ok) return;
            const data = await response.json();
            if (data.employee) {
                setCurrentEmployee(data.employee);
            }
        } catch (e) {
            console.error("Auto-refresh failed", e);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            // 1. Cookie-backed session check, including PIN employees.
            await refreshProfile();

            // 2. Supabase Session Check
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted && session) {
                    try {
                        const syncRes = await fetch('/api/auth/sync-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ access_token: session.access_token })
                        });
                        if (syncRes.ok) {
                            setSession(session);
                            setUser(session.user ?? null);
                            await refreshProfile();
                        }
                    } catch (e) {
                        console.error('[Auth] Session sync failed', e);
                    }
                }
            } catch (err) {
                console.error("Supabase session error:", err);
            }

            if (mounted) setIsLoading(false);
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (event === 'SIGNED_OUT') {
                document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                setSession(null);
                setUser(null);
                setProfile(null);
                return;
            }

            if (session?.access_token) {
                try {
                    const syncRes = await fetch('/api/auth/sync-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ access_token: session.access_token })
                    });
                    if (syncRes.ok) {
                        setCurrentEmployee(null);
                        setSession(session);
                        setUser(session.user ?? null);
                        await refreshProfile();
                    }
                } catch (e) {
                    console.error('[Auth] Session sync failed', e);
                }
            }
        });

        // Global focus listener for cookie-backed employee refresh
        const handleFocus = () => refreshEmployee();
        window.addEventListener('focus', handleFocus);
        const visibilityHandler = () => {
            if (document.visibilityState === 'visible') handleFocus();
        }
        window.addEventListener('visibilitychange', visibilityHandler);

        // Background refresh every 5 minutes while app is active
        const refreshInterval = setInterval(() => {
            refreshEmployee();
        }, 1000 * 60 * 5);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('visibilitychange', visibilityHandler);
            clearInterval(refreshInterval);
        };
    }, []);

    const signIn = async (email: string) => {
        return { error: null }
    }

    const signOut = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error("Logout request failed", e);
        }
        document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        setCurrentEmployee(null);
        setUser(null);
        setSession(null);
        setProfile(null);
        const res = await supabase.auth.signOut();
        window.location.href = '/login';
        return res;
    }

    const loginAsEmployee = async (staffId: string, pin: string) => {
        try {
            const response = await fetch('/api/auth/employee-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffId: staffId.trim(),
                    pin: pin.trim()
                })
            });

            if (!response.ok) {
                const text = await response.text();
                try {
                    const errorData = JSON.parse(text);
                    return { success: false, error: errorData.message || 'Login fehlgeschlagen' };
                } catch {
                    console.error('[EmployeeLogin] API Error (HTML?):', text.substring(0, 200));
                    return { success: false, error: 'Serverfehler: API antwortet nicht mit JSON.' };
                }
            }

            const data = await response.json();

            if (data.success && data.employee) {
                // Clear any active owner session and cookies first
                document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                await supabase.auth.signOut();
                setUser(null);
                setSession(null);
                setProfile(null);

                setCurrentEmployee(data.employee);
                await refreshProfile();
                return { success: true };
            } else {
                return { success: false, error: data.message || 'Login fehlgeschlagen' };
            }
        } catch (error) {
            console.error('Employee Login Error:', error);
            return { success: false, error: 'Verbindungsfehler' };
        }
    };

    const logoutEmployee = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error("Logout failed", e);
        } finally {
            document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            setCurrentEmployee(null);
            setUser(null);
            setSession(null);
            setProfile(null);
            await supabase.auth.signOut();
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            currentEmployee,
            profile,
            isLoading,
            signIn,
            signOut,
            loginAsEmployee,
            logoutEmployee,
            refreshEmployee,
            refreshProfile
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}

