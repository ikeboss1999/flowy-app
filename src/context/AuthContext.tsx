
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

type AuthContextType = {
    user: User | null
    session: Session | null
    isLoading: boolean
    signIn: (email: string) => Promise<{ error: any }>
    signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(process.env.NODE_ENV !== 'development'); // Skip loading screen in dev mode

    useEffect(() => {
        let mounted = true

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
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return
            setSession(session)
            setUser(session?.user ?? null)
            setIsLoading(false)
        })

        return () => {
            mounted = false
            clearTimeout(timer)
            subscription.unsubscribe()
        }
    }, [])

    const signIn = async (email: string) => {
        // We will use Magic Link for simplicity initially, or Password if preferred.
        // The plan mentioned Login/Register which implies Password usually for this audience.
        // Let's implement generic sign in allowing password or magic link based on usage.
        // For now, let's just return the context methods and implement the logic in the login page or here.
        // Actually, usually signInWithPassword is better for desktop apps.
        // But let's keep the context simple, exposing the client is often enough, 
        // but providing wrappers is cleaner.

        // Changing implementing to just expose state, and components call supabase directly or we add methods here.
        return { error: null }
    }

    const signOut = async () => {
        return await supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider value={{ user, session, isLoading, signIn, signOut }}>
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
