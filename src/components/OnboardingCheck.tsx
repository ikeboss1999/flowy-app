"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/context/AuthContext";

export function OnboardingCheck() {
    const router = useRouter();
    const pathname = usePathname();
    const { data, isLoading: settingsLoading, error: settingsError } = useCompanySettings();
    const { user, isLoading: authLoading } = useAuth(); // Also fix prop name here if not already done? OnboardingCheck used `loading: authLoading`, wait.

    useEffect(() => {
        if (settingsLoading || authLoading) return;

        // Skip check for auth and onboarding pages
        const isExemptRoute = pathname === "/onboarding" ||
            pathname === "/verify" ||
            pathname.startsWith('/login') ||
            pathname.startsWith('/register') ||
            pathname.startsWith('/forgot-password') ||
            pathname.startsWith('/reset-password');

        if (isExemptRoute) return;

        // CRITICAL: If Database is down, DO NOT redirect.
        if (settingsError) {
            console.error("OnboardingCheck: Database Error detected, halting redirection.", settingsError);
            return;
        }

        if (!user) {
            console.log("OnboardingCheck: No user found, redirecting to login...");
            router.replace("/login");
            return;
        }

        // CLOUD CHECK: If Supabase metadata says onboarded, do NOT redirect to onboarding
        // even if local settings are empty (likely new install/device).
        const isCloudOnboarded = user.user_metadata?.onboarding_completed === true;

        // Skip check for settings page as well
        if (pathname === "/settings") return;

        // Check if critical local data is missing (e.g., Company Name)
        const isLocalCompanyEmpty = !data.companyName || data.companyName.trim() === "";

        if (isLocalCompanyEmpty && !isCloudOnboarded) {
            console.log("OnboardingCheck: Redirecting to onboarding. Reason: Local & Cloud data empty.");
            router.replace("/onboarding");
        } else if (isLocalCompanyEmpty && isCloudOnboarded) {
            // Local is empty but cloud says OK -> Wait for AutoRestore to do its job
            console.log("OnboardingCheck: Local data empty but Cloud says onboarded. Waiting for Sync/Restore.");
        }
    }, [data, settingsLoading, authLoading, user, pathname, router]);

    return null;
}
