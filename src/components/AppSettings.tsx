"use client";

import { useState, useEffect } from "react";
import { Sparkles, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GitHubRelease {
    id: number;
    tag_name: string;
    name: string;
    created_at: string;
    body: string;
    html_url: string;
}

export function AppSettings() {
    const [releases, setReleases] = useState<GitHubRelease[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchReleases = async () => {
            try {
                const res = await fetch("https://api.github.com/repos/ikeboss1999/flowy-app/releases");
                if (!res.ok) throw new Error("Netzwerkfehler");
                const data = await res.json();
                // Filter drafts and sort by date descending just in case
                const published = data.filter((r: any) => !r.draft).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setReleases(published);
            } catch (err) {
                console.error("Failed to fetch releases", err);
                setError("Die Neuigkeiten konnten nicht geladen werden.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchReleases();
    }, []);

    const parseMarkdown = (text: string) => {
        if (!text) return null;
        
        return text.split('\n').map((line, i) => {
            if (line.startsWith('# ')) return <h3 key={i} className="text-xl font-black text-slate-800 mt-6 mb-3">{line.replace('# ', '')}</h3>;
            if (line.startsWith('## ')) return <h4 key={i} className="text-lg font-bold text-slate-800 mt-5 mb-2">{line.replace('## ', '')}</h4>;
            if (line.startsWith('### ')) return <h5 key={i} className="text-base font-bold text-slate-700 mt-4 mb-2">{line.replace('### ', '')}</h5>;
            
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                let content = line.trim().substring(2);
                content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                content = content.replace(/`(.*?)`/g, '<code class="bg-slate-100 text-pink-600 px-1 py-0.5 rounded text-sm">$1</code>');
                return (
                    <li key={i} className="ml-5 list-disc text-slate-600 mb-1.5 marker:text-indigo-400">
                        <span dangerouslySetInnerHTML={{ __html: content }} />
                    </li>
                );
            }
            
            if (line.trim() === '') return <div key={i} className="h-2" />;
            
            let content = line;
            content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            content = content.replace(/`(.*?)`/g, '<code class="bg-slate-100 text-pink-600 px-1 py-0.5 rounded text-sm">$1</code>');
            return <p key={i} className="text-slate-600 leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: content }} />;
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Sparkles className="h-32 w-32 text-indigo-900" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Neuigkeiten & Updates</h2>
                        <p className="text-slate-500 font-medium max-w-lg">
                            Hier sehen Sie immer aktuell, welche neuen Funktionen und Verbesserungen in der letzten FlowY Version hinzugefügt wurden.
                        </p>
                    </div>

                    <div className="border-t border-slate-100 pt-8">
                        {isLoading && (
                            <div className="flex flex-col items-center justify-center py-12 text-indigo-400 animate-pulse">
                                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                <p className="font-bold">Lade Changelog...</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-6 bg-red-50 text-red-600 rounded-2xl font-medium border border-red-100 text-center">
                                {error}
                            </div>
                        )}

                        {!isLoading && !error && releases.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <p>Noch keine Updates vorhanden.</p>
                            </div>
                        )}

                        {!isLoading && !error && releases.length > 0 && (
                            <div className="space-y-12">
                                {releases.map((release, index) => (
                                    <div 
                                        key={release.id} 
                                        className={cn(
                                            "relative",
                                            index !== releases.length - 1 && "pb-12 border-b border-slate-100"
                                        )}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="px-3 py-1.5 bg-indigo-50 text-indigo-600 font-black tracking-widest text-sm rounded-lg border border-indigo-100 shadow-sm">
                                                    {release.tag_name}
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-800">{release.name || release.tag_name}</h3>
                                            </div>
                                            
                                            <div className="flex items-center gap-4 text-slate-400 text-sm font-medium">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(release.created_at).toLocaleDateString('de-DE', {
                                                        day: '2-digit',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                                            {parseMarkdown(release.body)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
