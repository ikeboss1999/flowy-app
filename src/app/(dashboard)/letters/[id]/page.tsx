"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useLetters } from "@/hooks/useLetters";
import { LetterEditor } from "@/components/LetterEditor";
import { Loader2 } from "lucide-react";

export default function EditLetterPage() {
    const params = useParams();
    const id = params.id as string;
    const { letters, isLoading } = useLetters();

    const letter = React.useMemo(() => {
        if (!letters || !id) return null;
        return letters.find(l => l.id === id);
    }, [letters, id]);

    if (isLoading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-medium">Brief wird geladen...</p>
            </div>
        );
    }

    if (!letter) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-2 text-slate-500">
                <h2 className="text-xl font-bold">Brief nicht gefunden</h2>
                <p className="text-sm">Der gesuchte Brief existiert nicht oder Sie haben keinen Zugriff.</p>
            </div>
        );
    }

    return <LetterEditor initialLetter={letter} />;
}
