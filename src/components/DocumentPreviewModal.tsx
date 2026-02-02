import React from 'react';
import { X, Download, Printer, FileText, Image as ImageIcon } from 'lucide-react';
import { EmployeeDocument } from '@/types/employee';
import { cn } from '@/lib/utils';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: EmployeeDocument | null;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ isOpen, onClose, document: doc }) => {
    if (!isOpen || !doc) return null;

    const isPDF = doc.type === 'application/pdf';
    const isImage = doc.type.startsWith('image/');

    const handleDownload = () => {
        if (!doc.content) return;
        const link = window.document.createElement('a');
        link.href = doc.content;
        link.download = doc.name;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
    };

    const handlePrint = () => {
        if (!doc.content) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        if (isPDF) {
            printWindow.document.write(`
                <html>
                    <body style="margin:0;">
                        <embed src="${doc.content}" type="application/pdf" width="100%" height="100%">
                    </body>
                </html>
            `);
        } else if (isImage) {
            printWindow.document.write(`
                <html>
                    <body style="margin:0; display:flex; align-items:center; justify-content:center;">
                        <img src="${doc.content}" style="max-width:100%; max-height:100%;">
                    </body>
                    <script>
                        window.onload = () => { window.print(); window.close(); };
                    </script>
                </html>
            `);
        }
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center",
                            doc.category === 'system' ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                        )}>
                            {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{doc.name}</h3>
                            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">{doc.fileSize} • {doc.type}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="h-10 px-4 rounded-xl bg-slate-50 text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-slate-100 transition-all"
                        >
                            <Printer className="h-4 w-4" /> Drucken
                        </button>
                        <button
                            onClick={handleDownload}
                            className="h-10 px-4 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm flex items-center gap-2 hover:bg-indigo-100 transition-all"
                        >
                            <Download className="h-4 w-4" /> Download
                        </button>
                        <div className="w-px h-6 bg-slate-100 mx-2" />
                        <button
                            onClick={onClose}
                            className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-50 p-8 overflow-auto flex items-center justify-center">
                    {!doc.content ? (
                        <div className="text-center space-y-4 max-w-sm">
                            <div className="h-20 w-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-4">
                                <X className="h-10 w-10" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900">Keine Vorschau verfügbar</h4>
                            <p className="text-slate-500 font-medium">Der Inhalt dieses Dokuments konnte nicht geladen werden.</p>
                        </div>
                    ) : isPDF ? (
                        <iframe
                            src={doc.content}
                            className="w-full h-full border-0 rounded-xl bg-white shadow-sm"
                            title={doc.name}
                        />
                    ) : isImage ? (
                        <img
                            src={doc.content}
                            alt={doc.name}
                            className="max-h-full max-w-full rounded-xl shadow-lg"
                        />
                    ) : (
                        <div className="text-center space-y-4 max-w-sm">
                            <div className="h-20 w-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-500 mx-auto mb-4">
                                <FileText className="h-10 w-10" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900">Download erforderlich</h4>
                            <p className="text-slate-500 font-medium">Für diesen Dateityp ({doc.type}) ist keine direkte Vorschau möglich.</p>
                            <button
                                onClick={handleDownload}
                                className="bg-primary-gradient text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all"
                            >
                                Jetzt Herunterladen
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
