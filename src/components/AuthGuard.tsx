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
            <div className="flex h-screen w-full items-center justify-center bg-[#05050A]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Authentifizierung...</p>
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
