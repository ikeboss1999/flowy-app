"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [forceShow, setForceShow] = useState(false)

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

        if (isPublic) {
            // On public route (e.g. Login):
            // If user IS logged in, redirect to Dashboard
            if (user) {
                router.push("/")
            }
        } else {
            // On protected route (e.g. Dashboard):
            // If user is NOT logged in, redirect to Login
            if (!user) {
                router.push("/login")
            }
        }
    }, [user, isLoading, forceShow, pathname, router])

    // Blocking Render State: Only show loader blocking if:
    // 1. We are still loading
    // 2. AND failsafe hasn't triggered yet
    if (isLoading && !forceShow) {
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

    // Unblocking Render:
    // If we reach here, we either:
    // - Finished loading
    // - OR timed out (failsafe)
    // - OR are redirecting (useEffect above handling it)
    // In all cases, render children so we never get a "white screen".
    return <>{children}</>
}
