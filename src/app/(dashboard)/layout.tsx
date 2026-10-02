"use client";

import React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import { ReloadButton } from "@/components/ReloadButton";
import { GlobalTodoWidget } from "@/components/GlobalTodoWidget";
import { DashboardPrefetch } from "@/components/DashboardPrefetch";
import { useDevice } from "@/hooks/useDevice";
import { useStartup } from "@/hooks/useStartup";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { cn } from "@/lib/utils";
import { preloadImage } from "@/lib/startup-preload";
import { AdminSessionHeartbeat } from "@/components/AdminSessionHeartbeat";
import { TrialNotice } from "@/components/TrialNotice";
import { useAuth } from "@/context/AuthContext";
import { NavigationProgress } from "@/components/NavigationProgress";

const Sidebar = dynamic(
    () => import("@/components/Sidebar").then((mod) => mod.Sidebar),
    { ssr: false }
);

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { isDrawerLayout } = useDevice();
    const pathname = usePathname();
    const { profile, user, isLoading: isAuthLoading } = useAuth();
    const { data: companySettings, isLoading: isCompanySettingsLoading, error: companySettingsError } = useCompanySettings();
    const { isLoading: isAccountSettingsLoading } = useAccountSettings();
    const { data: startup, isReady: isStartupReady } = useStartup();
    const [isLogoReady, setIsLogoReady] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        setIsLogoReady(!startup.company.logo);

        preloadImage(startup.company.logo).then(() => {
            if (!cancelled) setIsLogoReady(true);
        });

        return () => {
            cancelled = true;
        };
    }, [startup.company.logo]);

    React.useEffect(() => {
        if (!isAuthLoading && profile?.role === "developer" && !pathname.startsWith("/admin")) {
            window.location.replace("/admin");
        }
    }, [isAuthLoading, pathname, profile?.role]);

    const isDeveloperRedirect = !isAuthLoading && profile?.role === "developer" && !pathname.startsWith("/admin");
    const isOnboardingRoute = pathname === "/onboarding";
    const userPossiblyNeedsOnboarding = !!user && user.user_metadata?.onboarding_completed !== true;
    const needsOnboarding = !isOnboardingRoute && userPossiblyNeedsOnboarding && !isAuthLoading && !isCompanySettingsLoading && !companySettingsError && !companySettings.companyName.trim();
    React.useEffect(() => {
        if (needsOnboarding) window.location.replace("/onboarding");
    }, [needsOnboarding]);

    // Do not render the dashboard greeting with the "Benutzer" fallback
    // while the configured account name is still being fetched.
    const isHomeLoading = pathname === "/" && (!isStartupReady || !isLogoReady || isAccountSettingsLoading);
    const isWaitingForOnboardingCheck = userPossiblyNeedsOnboarding && isCompanySettingsLoading;

    if (isAuthLoading || isHomeLoading || isDeveloperRedirect || isWaitingForOnboardingCheck || needsOnboarding) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#020205]">
                <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
                <div className="relative flex flex-col items-center gap-8 p-10 animate-in fade-in zoom-in-95 duration-700">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-300">Startseite</p>
                        <p className="mt-3 text-sm font-semibold text-white/45">Arbeitsbereich wird vorbereitet...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 overflow-x-hidden">
            <OnboardingCheck />
            <NavigationProgress />
            <Sidebar />
            <ReloadButton />
            <GlobalTodoWidget />
            <DashboardPrefetch />
            <AdminSessionHeartbeat />
            <main className={cn(
                "flex-1 min-h-screen text-lg transition-all duration-300",
                isDrawerLayout ? "ml-0 pt-20" : "ml-[var(--flowy-sidebar-offset,5.5rem)] [.sidebar-collapsed_&]:ml-0"
            )}>
                <TrialNotice />
                {children}
            </main>
        </div>
    );
}
