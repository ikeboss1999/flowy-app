"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/context/AuthContext";

export function OnboardingCheck() {
    const router = useRouter();
    const pathname = usePathname();
    const { data, isLoading: settingsLoading } = useCompanySettings();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (settingsLoading || authLoading) return;

        if (!user) {
            if (pathname === "/onboarding" || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password') || pathname === "/verify") return;
            console.log("OnboardingCheck: No user found, redirecting to login...");
            router.replace("/login");
            return;
        }

        // Skip check for auth and onboarding pages
        if (pathname === "/onboarding" || pathname === "/settings" || pathname === "/verify" || pathname.startsWith('/login')) return;

        // Check if critical data is missing (e.g., Company Name)
        const isCompanyEmpty = !data.companyName || data.companyName.trim() === "";

        if (isCompanyEmpty) {
            console.log("OnboardingCheck: Redirecting to onboarding. Reason: Company Data Empty. Data:", data);
            router.replace("/onboarding");
        }
    }, [data, settingsLoading, authLoading, user, pathname, router]);

    return null;
}
