"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { isWeb } from "@/lib/is-web"

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/welcome"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, currentEmployee, isLoading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [forceShow, setForceShow] = useState(false)
    const [isRedirecting, setIsRedirecting] = useState(false)

    // Failsafe timer: If Auth takes > 1.5s, force show content to avoid permanent white screen
    useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => setForceShow(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [isLoading])

    // Routing Logic using Effects (Safe for Rendering)
    useEffect(() => {
        // Wait until loading is done OR failsafe triggers
        if (isLoading && !forceShow) return

        const isPublic = PUBLIC_ROUTES.includes(pathname)
        const isMobileRoute = pathname.startsWith('/mobile')

        const handleRouting = async () => {
            if (isPublic) {
                if (user) {
                    // Logged in user (admin) on a public page -> Redirect to app
                    setIsRedirecting(true)
                    router.push("/")
                } else if (currentEmployee) {
                    // Logged in employee on a public page -> Redirect to mobile app
                    setIsRedirecting(true)
                    router.push("/mobile/dashboard")
                } else {
                    setIsRedirecting(false)
                }
            } else {
                // Protected routes
                if (!user && !currentEmployee) {
                    // Not logged in at all -> Welcome/Login
                    setIsRedirecting(true)

                    // ZOMBIE COOKIE KILLER: Ensure server session is dead before redirecting to login
                    try {
                        await fetch('/api/auth/logout', { method: 'POST' });
                    } catch (e) { console.error("Auto-logout failed", e); }

                    if (isWeb && pathname === "/") {
                        router.push("/welcome")
                    } else {
                        router.push("/login")
                    }
                } else if (isMobileRoute && !currentEmployee && user) {
                    // Admin trying to access mobile route - ALLOW
                    setIsRedirecting(false)
                } else if (!isMobileRoute && !user && currentEmployee) {
                    // Employee trying to access admin route - REDIRECT TO MOBILE
                    setIsRedirecting(true)
                    router.push("/mobile/dashboard")
                } else {
                    // Valid state
                    setIsRedirecting(false)
                }
            }
        };

        handleRouting();

    }, [user, currentEmployee, isLoading, forceShow, pathname, router])

    // Render Logic helper
    const showLoader = (isLoading || isRedirecting) && !forceShow;

    // Blocking Render State: Only show loader blocking if:
    // 1. In production (prevents dev frustration)
    // 2. We are still loading or redirecting
    if (process.env.NODE_ENV === 'production' && showLoader) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020205] overflow-hidden">
                {/* Modern Background Accents */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative flex flex-col items-center gap-10 p-12 animate-in fade-in zoom-in-95 duration-1000">
                    <div className="relative">
                        <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-xl" />
                        <div className="relative h-20 w-20 bg-white/[0.02] backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/5">
                            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                        </div>
                    </div>
                    <div className="text-center space-y-3">
                        <p className="text-[10px] font-black tracking-[0.4em] text-indigo-400 uppercase">Authentifizierung</p>
                        <h4 className="text-white/40 font-medium">Ihre Sitzung wird vorbereitet...</h4>
                    </div>

                    {/* Branding footer */}
                    <div className="absolute bottom-[-100px] flex items-center gap-3 opacity-20">
                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-white" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">FlowY Security Engine</span>
                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-white" />
                    </div>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
