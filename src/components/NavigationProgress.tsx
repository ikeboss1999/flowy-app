"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = useState(false);
    const startTimer = useRef<number | null>(null);
    const safetyTimer = useRef<number | null>(null);

    const clearTimers = () => {
        if (startTimer.current !== null) window.clearTimeout(startTimer.current);
        if (safetyTimer.current !== null) window.clearTimeout(safetyTimer.current);
        startTimer.current = null;
        safetyTimer.current = null;
    };

    useEffect(() => {
        clearTimers();
        setIsNavigating(false);
    }, [pathname]);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
            if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

            const target = new URL(anchor.href, window.location.href);
            if (target.origin !== window.location.origin || !target.pathname.startsWith("/")) return;
            if (target.pathname === window.location.pathname && target.search === window.location.search) return;

            // Run after the click handler. Next.js itself calls
            // preventDefault() for client-side navigation, so that flag must
            // not be used to decide whether navigation is happening.
            window.setTimeout(() => {
                clearTimers();
                startTimer.current = window.setTimeout(() => setIsNavigating(true), 120);
                safetyTimer.current = window.setTimeout(() => setIsNavigating(false), 15000);
            }, 0);
        };

        document.addEventListener("click", handleDocumentClick, true);
        return () => {
            document.removeEventListener("click", handleDocumentClick, true);
            clearTimers();
        };
    }, []);

    if (!isNavigating) return null;

    return (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[500]">
            <div className="h-1 w-full overflow-hidden bg-indigo-100/70">
                <div className="h-full w-2/3 animate-pulse rounded-r-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
            </div>
            <div className="absolute right-5 top-5 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white/95 px-4 py-3 text-sm font-black text-slate-700 shadow-xl shadow-indigo-950/10 backdrop-blur">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                Seite wird geladen …
            </div>
        </div>
    );
}
