"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export function OnboardingCheck() {
    const router = useRouter();
    const pathname = usePathname();
    const { data, isLoading } = useCompanySettings();

    useEffect(() => {
        if (isLoading) return;

        // Skip check if we are already on onboarding or settings page
        // Settings page allowed so user can fix it if they navigate there manually
        if (pathname === "/onboarding" || pathname === "/settings" || pathname === "/verify") return;

        // Check if critical data is missing (e.g., Company Name)
        // Adjust condition based on what constitutes "Empty"
        const isCompanyEmpty = !data.companyName || data.companyName.trim() === "";

        if (isCompanyEmpty) {
            router.replace("/onboarding");
        }
    }, [data, isLoading, pathname, router]);

    return null;
}
