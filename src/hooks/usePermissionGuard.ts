"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Redirects employees to "/" if they lack the required permission.
 * - Pass a permission key (e.g. "offers_read") for standard checks
 * - Pass an array to allow access if ANY of the permissions is granted
 * - Pass null to block employees completely (e.g. /settings, /credentials)
 * - Admins and developers always pass through
 */
export function usePermissionGuard(permission: string | string[] | null) {
    const { profile, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;
        if (!profile) return; // PIN employee or still loading — middleware handles basic auth
        if (profile.role === "developer" || profile.role === "admin") return;

        if (profile.role === "employee") {
            let hasAccess = false;

            if (permission === null) {
                hasAccess = false;
            } else if (Array.isArray(permission)) {
                hasAccess = permission.some((p) => !!profile.permissions?.[p]);
            } else {
                hasAccess = !!profile.permissions?.[permission];
            }

            if (!hasAccess) {
                router.replace("/");
            }
        }
    }, [profile, isLoading, permission, router]);
}
