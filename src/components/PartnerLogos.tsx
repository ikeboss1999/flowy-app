"use client";

import { useEffect, useState } from "react";

interface Partner {
    id: string;
    name: string;
    logo_content: string;
}

export function PartnerLogos() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const res = await fetch('/api/partners');
                const data = await res.json();

                if (res.ok) {
                    console.log("PartnerLogos fetched:", data);
                    setPartners(data);
                } else {
                    console.error("PartnerLogos fetch failed", data);
                    setErrorMsg(`Fehler: ${data.error || res.statusText}`);
                }
            } catch (error: any) {
                console.error("Error loading partners:", error);
                setErrorMsg(`Netzwerkfehler: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPartners();
    }, []);

    if (isLoading) return <div className="text-center text-white/50 py-4">Lade Partner...</div>;

    if (errorMsg) {
        return <div className="text-center text-rose-400 py-4 border border-dashed border-rose-500/30 rounded-xl bg-rose-500/10 mb-8">{errorMsg}</div>;
    }

    // Debugging: Show message if no partners
    if (partners.length === 0) {
        return <div className="text-center text-white/50 py-4 border border-dashed border-white/20 rounded-xl mb-8">Keine Partner gefunden (Liste leer)</div>;
    }

    return (
        <div className="w-full mt-16 text-center animate-in fade-in duration-700">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">
                Unsere Partner
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 bg-white/50 backdrop-blur-sm rounded-3xl p-8 border border-white/40 shadow-sm">
                {partners.map((partner) => (
                    <div key={partner.id} className="group relative w-32 h-16 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-500 hover:scale-110 opacity-60 hover:opacity-100">
                        <img
                            src={partner.logo_content}
                            alt={partner.name}
                            className="max-w-full max-h-full object-contain"
                        />
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            {partner.name}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
