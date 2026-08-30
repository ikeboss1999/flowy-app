"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { Employee } from "@/types/employee"

type AuthProfile = {
    role: string
    permissions: any
    companyOwnerId: string
    name?: string
} | null

type AuthContextType = {
    user: User | null
    session: Session | null
    currentEmployee: Employee | null
    profile: AuthProfile
    isLoading: boolean
    signOut: () => Promise<{ error: any }>
    refreshEmployee: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getBrowserSessionId() {
    const key = 'flowy_admin_session_id';
    let id = sessionStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); }
    return id;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    // Keep the server render and the browser's first render identical. Browser caches
    // are restored in the effect below, after React has completed hydration.
    const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
    const [profile, setProfile] = useState<AuthProfile>(null)
    const [isLoading, setIsLoading] = useState(true);

    const refreshProfile = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    const prof = {
                        role: data.user.role,
                        permissions: data.user.permissions || {},
                        companyOwnerId: data.user.companyOwnerId,
                        name: data.user.name
                    };
                    setProfile(prof);
                    setCurrentEmployee(data.employee || null);
                    try {
                        localStorage.setItem('flowy_auth_profile', JSON.stringify(prof));
                        if (data.employee) {
                            localStorage.setItem('flowy_auth_employee', JSON.stringify(data.employee));
                        } else {
                            localStorage.removeItem('flowy_auth_employee');
                        }
                    } catch { }
                } else {
                    setProfile(null);
                    setCurrentEmployee(null);
                    try {
                        localStorage.removeItem('flowy_auth_profile');
                        localStorage.removeItem('flowy_auth_employee');
                    } catch { }
                }
            } else {
                setProfile(null);
                setCurrentEmployee(null);
            }
        } catch (e) {
            console.error("[AuthContext] Failed to fetch profile:", e);
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

        try {
            const cachedProfile = localStorage.getItem('flowy_auth_profile');
            const cachedEmployee = localStorage.getItem('flowy_auth_employee');
            if (cachedProfile) setProfile(JSON.parse(cachedProfile));
            if (cachedEmployee) setCurrentEmployee(JSON.parse(cachedEmployee));
        } catch { }

        const initAuth = async () => {
            // 1. Cookie-backed session check, including PIN employees.
            await refreshProfile();

            // 2. Supabase Session Check
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted && session) {
                    setSession(session);
                    setUser(session.user ?? null);
                    try {
                        await fetch('/api/auth/sync-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ access_token: session.access_token, session_id: getBrowserSessionId() })
                        });
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

            // The initial session is handled by initAuth above. Ignoring Supabase's
            // matching INITIAL_SESSION event prevents two parallel sync requests.
            if (event === 'INITIAL_SESSION') return;

            if (event === 'SIGNED_OUT') {
                document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                try {
                    localStorage.removeItem('flowy_auth_profile');
                    localStorage.removeItem('flowy_auth_employee');
                    localStorage.removeItem('flowy_startup_cache');
                } catch { }
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
                        body: JSON.stringify({ access_token: session.access_token, session_id: getBrowserSessionId() })
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

        // Throttled focus listener (max once per minute)
        let lastFocusTime = 0;
        const handleFocus = () => {
            const now = Date.now();
            if (now - lastFocusTime > 60000) {
                lastFocusTime = now;
                refreshEmployee();
            }
        };

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
        try { sessionStorage.removeItem('flowy_admin_session_id'); } catch { }
        const res = await supabase.auth.signOut();
        window.location.href = '/login';
        return res;
    }

    return (
        <AuthContext.Provider value={{
            user,
            session,
            currentEmployee,
            profile,
            isLoading,
            signOut,
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

