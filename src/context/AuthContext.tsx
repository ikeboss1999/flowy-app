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
            if (!employeeData.employeeNumber || !employeeData.appAccess?.accessPIN) return;

            const response = await fetch('/api/auth/employee-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffId: employeeData.employeeNumber,
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
        let mounted = true

        // Load employee session from localStorage
        const savedEmployee = localStorage.getItem('flowy_employee_session');
        if (savedEmployee) {
            try {
                setCurrentEmployee(JSON.parse(savedEmployee));
            } catch (e) {
                console.error("Failed to parse employee session", e);
            }
        }

        // Global focus listener for auto-refresh
        const handleFocus = () => {
            if (localStorage.getItem('flowy_employee_session')) {
                refreshEmployee();
            }
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') handleFocus();
        });

        // Safety timeout: If Supabase takes too long (e.g. wrong key), stop loading
        const timer = setTimeout(() => {
            if (mounted) {
                console.warn("Supabase auth check timed out - forcing loading completion")
                setIsLoading(false)
            }
        }, 1500)

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return
            setSession(session)
            setUser(session?.user ?? null)
        }).catch(err => {
            console.error("Supabase session error:", err)
        }).finally(() => {
            if (mounted) setIsLoading(false)
            clearTimeout(timer)
        })

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return
            setSession(session)
            setUser(session?.user ?? null)
            setIsLoading(false)

            // Sync session to cookie for server-side access
            if (session?.access_token) {
                document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
            } else if (event === 'SIGNED_OUT') {
                document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            }
        })

        return () => {
            mounted = false
            clearTimeout(timer)
            subscription.unsubscribe()
        }
    }, [])

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

    const logoutEmployee = () => {
        setCurrentEmployee(null);
        localStorage.removeItem('flowy_employee_session');
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
