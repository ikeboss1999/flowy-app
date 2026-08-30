"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/welcome"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, currentEmployee, isLoading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [isRedirecting, setIsRedirecting] = useState(false)

    // Routing Logic using Effects (Safe for Rendering)
    useEffect(() => {
        if (isLoading) return

        const handleRouting = async () => {
            const isPublic = PUBLIC_ROUTES.includes(pathname)
            const hasUser = !!user || !!currentEmployee

            if (isPublic) {
                if (hasUser) {
                    // Loop guard: if we've bounced back to a public page
                    // more than 3 times, sync-session is broken — stop looping.
                    const attempts = parseInt(sessionStorage.getItem('__auth_attempts') || '0')
                    if (attempts >= 3) {
                        sessionStorage.removeItem('__auth_attempts')
                        setIsRedirecting(false)
                        return
                    }
                    sessionStorage.setItem('__auth_attempts', String(attempts + 1))
                    setIsRedirecting(true)
                    window.location.href = "/api/auth/start"
                } else {
                    setIsRedirecting(false)
                }
            } else {
                // Protected routes: clear loop counter on successful entry
                sessionStorage.removeItem('__auth_attempts')

                if (!hasUser) {
                    setIsRedirecting(true)

                    try {
                        await fetch('/api/auth/logout', { method: 'POST' });
                    } catch { }

                    if (pathname === "/" || pathname === "/welcome") {
                        router.push("/welcome")
                    } else {
                        router.push("/login")
                    }
                } else {
                    setIsRedirecting(false)
                }
            }
        };

        handleRouting();
    }, [user, currentEmployee, isLoading, pathname, router]);

    // Render Logic helper
    const showLoader = isLoading || isRedirecting;

    if (showLoader) {
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
