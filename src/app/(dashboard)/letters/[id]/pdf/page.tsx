"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useLetters } from "@/hooks/useLetters";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { LetterReactPDF } from "@/components/LetterReactPDF";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    { ssr: false }
);

export default function LetterPDFPage() {
    const params = useParams();
    const id = params.id as string;
    const { letters, isLoading: isLoadingLetters } = useLetters();
    const { data: companySettings, isLoading: isLoadingSettings } = useCompanySettings();

    const letter = React.useMemo(() => {
        if (!letters || !id) return null;
        return letters.find(l => l.id === id);
    }, [letters, id]);

    if (isLoadingLetters || isLoadingSettings) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-medium">PDF wird generiert...</p>
            </div>
        );
    }

    if (!letter || !companySettings) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center gap-2 text-slate-500 bg-slate-50">
                <h2 className="text-xl font-bold">Brief oder Einstellungen nicht gefunden</h2>
                <p className="text-sm">Bitte überprüfen Sie, ob alle Daten korrekt erfasst wurden.</p>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-slate-800">
            <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
                <LetterReactPDF letter={letter} companySettings={companySettings} />
            </PDFViewer>
        </div>
    );
}
