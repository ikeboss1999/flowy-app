"use client";
import React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";

export default function EditSubcontractorDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter(); const { id } = use(params);
    React.useEffect(() => { router.replace(`/subcontractor-descriptions/new?descriptionId=${encodeURIComponent(id)}`); }, [id, router]);
    return <div className="dashboard-page text-slate-400">Lade Entwurf...</div>;
}
