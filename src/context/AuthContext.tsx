"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { Employee } from "@/types/employee"

type AuthContextType = {
    user: User | null
    session: Session | null
    currentEmployee: Employee | null
    isLoading: boolean
    signIn: (email: string) => Promise<{ error: any }>
    signOut: () => Promise<{ error: any }>
    loginAsEmployee: (staffId: string, pin: string) => Promise<{ success: boolean, error?: string }>
    logoutEmployee: () => void
    refreshEmployee: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
    const [isLoading, setIsLoading] = useState(true);

    const refreshEmployee = async () => {
        const savedEmployee = localStorage.getItem('flowy_employee_session');
        if (!savedEmployee) return;

        try {
            const employeeData = JSON.parse(savedEmployee);
            if (!employeeData.appAccess?.staffId || !employeeData.appAccess?.accessPIN) return;

            const response = await fetch('/api/auth/employee-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffId: employeeData.appAccess.staffId,
                    pin: employeeData.appAccess.accessPIN
                })
            });

            const data = await response.json();
            if (data.success && data.employee) {
                // IMPORTANT: Preserving PIN because API hides it for security
                const updatedEmployee = {
                    ...data.employee,
                    appAccess: {
                        ...data.employee.appAccess,
                        accessPIN: employeeData.appAccess.accessPIN
                    }
                };
                setCurrentEmployee(updatedEmployee);
                localStorage.setItem('flowy_employee_session', JSON.stringify(updatedEmployee));
            }
        } catch (e) {
            console.error("Auto-refresh failed", e);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            // 1. Employee Session Check
            const savedEmployee = localStorage.getItem('flowy_employee_session');
            if (savedEmployee) {
                try {
                    const employeeData = JSON.parse(savedEmployee);
                    setCurrentEmployee(employeeData); // Optimistic update

                    // Attempt to restore cookie session
                    if (employeeData.appAccess?.staffId && employeeData.appAccess?.accessPIN) {
                        try {
                            await refreshEmployee();
                        } catch (e) {
                            console.error("Session restore failed", e);
                            // Optional: Could logout here if strict, but maybe offline? 
                            // For now let's keep optimistic state, middleware will handle rejection if online.
                            // BUT: If middleware rejects, we loop.
                            // So we MUST clear if refresh fails and we are ONLINE?
                            // Let's rely on refreshEmployee's internal error handling?
                            // modify refreshEmployee to return success/fail?
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse employee session", e);
                    localStorage.removeItem('flowy_employee_session');
                }
            }

            // 2. Supabase Session Check
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted && session) {
                    // Set user immediately — session_token from login is already in
                    // the cookie jar. The sync-session call here just refreshes it;
                    // if it fails the existing 24h cookie still authenticates API calls.
                    setSession(session);
                    setUser(session.user ?? null);
                    // Fire-and-forget cookie refresh (don't block on it)
                    fetch('/api/auth/sync-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ access_token: session.access_token })
                    }).catch(e => console.warn('[Auth] Background session refresh failed:', e));
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
                        localStorage.removeItem('flowy_employee_session');
                        setCurrentEmployee(null);
                        setSession(session);
                        setUser(session.user ?? null);
                    }
                } catch (e) {
                    console.error('[Auth] Session sync failed', e);
                }
            }
        });

        // Global focus listener for auto-refresh
        const handleFocus = () => {
            if (localStorage.getItem('flowy_employee_session')) {
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
            if (localStorage.getItem('flowy_employee_session')) {
                console.log('[AuthContext] Running periodic background refresh...');
                refreshEmployee();
            }
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
        localStorage.removeItem('flowy_employee_session');
        document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        setCurrentEmployee(null);
        setUser(null);
        setSession(null);
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

                setCurrentEmployee(data.employee);
                localStorage.setItem('flowy_employee_session', JSON.stringify(data.employee));
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
            localStorage.removeItem('flowy_employee_session');
            document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            setCurrentEmployee(null);
            setUser(null);
            setSession(null);
            await supabase.auth.signOut();
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            currentEmployee,
            isLoading,
            signIn,
            signOut,
            loginAsEmployee,
            logoutEmployee,
            refreshEmployee
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
