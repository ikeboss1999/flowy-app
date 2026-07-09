"use client";

import React from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LockedPdfPreviewProps {
    isStored: boolean;
    pdfUrlEndpoint?: string;
    title: string;
    fallback: React.ReactNode;
    className?: string;
    iframeClassName?: string;
}

export function LockedPdfPreview({
    isStored,
    pdfUrlEndpoint,
    title,
    fallback,
    className,
    iframeClassName,
}: LockedPdfPreviewProps) {
    const [signedPdfUrl, setSignedPdfUrl] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [reloadKey, setReloadKey] = React.useState(0);

    React.useEffect(() => {
        setSignedPdfUrl(null);
        setError(null);

        if (!isStored || !pdfUrlEndpoint) {
            return;
        }

        let cancelled = false;

        fetch(pdfUrlEndpoint)
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(await response.text());
                }

                return response.json();
            })
            .then((data) => {
                if (!cancelled) {
                    setSignedPdfUrl(data.url as string);
                }
            })
            .catch((fetchError) => {
                console.error("[LockedPdfPreview]", fetchError);
                if (!cancelled) {
                    setError("Die gespeicherte PDF konnte nicht geladen werden.");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isStored, pdfUrlEndpoint, reloadKey]);

    if (!isStored) {
        return <>{fallback}</>;
    }

    if (signedPdfUrl) {
        return (
            <iframe
                src={signedPdfUrl}
                title={title}
                className={cn("w-full h-full border-none bg-white", iframeClassName)}
            />
        );
    }

    return (
        <div className={cn("flex h-full w-full items-center justify-center bg-white", className)}>
            <div className="flex flex-col items-center gap-3 text-center text-slate-500">
                {error ? (
                    <>
                        <AlertTriangle className="h-8 w-8 text-rose-500" />
                        <span className="text-sm font-bold text-rose-500">{error}</span>
                        <button
                            type="button"
                            onClick={() => setReloadKey((current) => current + 1)}
                            className="mt-1 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Erneut laden
                        </button>
                    </>
                ) : (
                    <>
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                        <span className="text-sm font-bold">PDF wird geladen ...</span>
                    </>
                )}
            </div>
        </div>
    );
}
