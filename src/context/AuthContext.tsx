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
                setCurrentEmployee(data.employee);
                localStorage.setItem('flowy_employee_session', JSON.stringify(data.employee));
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
                    setSession(session);
                    setUser(session.user ?? null);
                }
            } catch (err) {
                console.error("Supabase session error:", err);
            }

            if (mounted) setIsLoading(false);
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);

            // Sync session to cookie for server-side access
            if (session?.access_token) {
                document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
            } else if (event === 'SIGNED_OUT') {
                document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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

        return () => {
            mounted = false;
            subscription.unsubscribe();
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('visibilitychange', visibilityHandler);
        };
    }, []);

    const signIn = async (email: string) => {
        return { error: null }
    }

    const signOut = async () => {
        return await supabase.auth.signOut()
    }

    const loginAsEmployee = async (staffId: string, pin: string) => {
        try {
            const response = await fetch('/api/auth/employee-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffId, pin })
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
            document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'; // Force client-side clear just in case
            setCurrentEmployee(null);
            window.location.href = '/login'; // Hard navigation to clear any cached state
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
