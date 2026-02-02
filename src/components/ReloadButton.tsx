"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReloadButton() {
    const handleReload = () => {
        window.location.reload();
    };

    return (
        <button
            onClick={handleReload}
            className={cn(
                "fixed top-8 right-8 z-[100]",
                "flex items-center justify-center w-12 h-12",
                "bg-white/10 backdrop-blur-xl border border-white/20 rounded-full",
                "text-slate-600 hover:text-indigo-600",
                "shadow-lg shadow-black/5 hover:shadow-indigo-500/20",
                "transition-all duration-300 hover:scale-110 active:scale-90 group"
            )}
            title="Seite aktualisieren"
        >
            <RefreshCw className="h-5 w-5 transition-transform duration-500 group-hover:rotate-180" />
        </button>
    );
}
