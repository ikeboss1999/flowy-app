"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    FolderOpen,
    Upload,
    Trash2,
    Download,
    ArrowLeft,
    FileText,
    Image as ImageIcon,
    File,
    Loader2,
    X,
    AlertCircle,
    Plus,
    Edit2,
    ArrowRightLeft,
    Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { useProjectFolders } from "@/hooks/useProjectFolders";
import { ProjectFile, FileFolder } from "@/types/project_file";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const ACCEPT_ALL = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,image/jpeg,image/png,image/gif,image/webp';

function formatBytes(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType?: string): React.ElementType {
    if (!mimeType) return FileText;
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType === 'application/pdf') return FileText;
    return File;
}

interface ProjectFilesProps {
    projectId: string;
    title?: string;
}

export function ProjectFiles({ projectId, title }: ProjectFilesProps) {
    const { files, isLoading: isLoadingFiles, uploadFile, deleteFile, getSignedUrl, updateFile } = useProjectFiles(projectId);
    const { folders, isLoading: isLoadingFolders, addFolder, renameFolder, deleteFolder } = useProjectFolders(projectId);

    const [selectedFolder, setSelectedFolder] = useState<FileFolder | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Modal States
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
    const [newFileName, setNewFileName] = useState('');
    const [movingFile, setMovingFile] = useState<ProjectFile | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    // Signed URL cache
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Combine folders from DB + files (to handle legacy folders or folder-less files)
    const allFolders = useMemo(() => {
        const fromFiles = Array.from(new Set(files.map(f => f.folder)));
        const fromDB = folders.map(f => f.name);
        const combined = Array.from(new Set([...fromDB, ...fromFiles])).sort();
        if (combined.length === 0 && !isLoadingFiles && !isLoadingFolders) return ['Allgemein'];
        return combined;
    }, [files, folders, isLoadingFiles, isLoadingFolders]);

    // Load signed URLs for images
    useEffect(() => {
        if (!selectedFolder) return;
        const folderFiles = files.filter(f => f.folder === selectedFolder && f.mimeType?.startsWith('image/'));
        folderFiles.forEach(async (file) => {
            if (signedUrls[file.id]) return;
            try {
                const url = await getSignedUrl(file.storagePath);
                setSignedUrls(prev => ({ ...prev, [file.id]: url }));
            } catch { }
        });
    }, [selectedFolder, files, getSignedUrl, signedUrls]);

    // ─── Actions ─────────────────────────────────────────────────────────────
    
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        if (allFolders.includes(newFolderName.trim())) {
            setUploadError('Ordner existiert bereits.');
            return;
        }
        try {
            await addFolder(newFolderName.trim());
            setNewFolderName('');
            setIsCreateFolderModalOpen(false);
        } catch (e) {
            setUploadError('Ordner konnte nicht in der Datenbank erstellt werden.');
        }
    };

    const handleRenameFolderUI = async (oldName: string) => {
        const newName = prompt('Neuer Name für den Ordner:', oldName);
        if (!newName || newName.trim() === oldName) return;

        try {
            const folderRecord = folders.find(f => f.name === oldName);
            if (folderRecord) {
                await renameFolder(folderRecord.id, newName.trim());
            } else {
                // If it's a legacy folder (only exists in files), create it first then it works? 
                // Better: Just update all files manually for legacy
                const folderFiles = files.filter(f => f.folder === oldName);
                await Promise.all(folderFiles.map(f => updateFile(f.id, { folder: newName.trim() })));
            }
            if (selectedFolder === oldName) setSelectedFolder(newName.trim());
        } catch (e) {
            setUploadError('Fehler beim Umbenennen des Ordners.');
        }
    };

    const handleDeleteFolderUI = (folderName: string) => {
        const folderFiles = files.filter(f => f.folder === folderName);
        const msg = folderFiles.length > 0 
            ? `Ordner "${folderName}" und alle ${folderFiles.length} Dateien darin wirklich löschen?`
            : `Leeren Ordner "${folderName}" wirklich löschen?`;
            
        setConfirmDialog({
            isOpen: true,
            title: 'Ordner löschen',
            message: msg,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                try {
                    // Delete folder record if it exists
                    const folderRecord = folders.find(f => f.name === folderName);
                    if (folderRecord) await deleteFolder(folderRecord.id);
                    
                    // Delete all files in that folder
                    await Promise.all(folderFiles.map(f => deleteFile(f.id)));
                    
                    if (selectedFolder === folderName) setSelectedFolder(null);
                } catch (e) {
                    setUploadError('Fehler beim Löschen des Ordners.');
                }
            }
        });
    };

    const handleMoveFile = async (file: ProjectFile, targetFolder: string) => {
        try {
            await updateFile(file.id, { folder: targetFolder });
            setMovingFile(null);
        } catch (e) {
            setUploadError('Datei konnte nicht verschoben werden.');
        }
    };

    const resolveAndOpen = async (file: ProjectFile) => {
        const newWindow = window.open('about:blank', '_blank');
        if (newWindow) {
            newWindow.document.write('<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#64748b;"><div>Lade Dokument...</div></body></html>');
        }
        try {
            let url = signedUrls[file.id] || await getSignedUrl(file.storagePath);
            if (newWindow) newWindow.location.href = url;
            else window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e) {
            if (newWindow) newWindow.close();
        }
    };

    const openLightbox = async (file: ProjectFile) => {
        let url = signedUrls[file.id] || await getSignedUrl(file.storagePath);
        setLightboxUrl(url);
    };

    const handleFiles = useCallback(async (fileList: FileList) => {
        if (!selectedFolder) return;
        setUploadError(null);
        setUploading(true);
        for (const file of Array.from(fileList)) {
            try {
                await uploadFile(file, selectedFolder);
            } catch (e: any) {
                setUploadError(prev => (prev ? prev + '\n' : '') + `${file.name}: Fehler`);
            }
        }
        setUploading(false);
    }, [selectedFolder, uploadFile]);

    const handleRenameFile = async (fileId: string) => {
        if (!newFileName.trim()) {
            setRenamingFileId(null);
            return;
        }
        try {
            await updateFile(fileId, { name: newFileName.trim() });
            setRenamingFileId(null);
        } catch (e) {
            setUploadError('Fehler beim Umbenennen der Datei.');
        }
    };

    const handleDelete = (file: ProjectFile) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Datei löschen',
            message: `"${file.name}" wirklich löschen?`,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                setDeletingId(file.id);
                try {
                    await deleteFile(file.id);
                } finally {
                    setDeletingId(null);
                }
            }
        });
    };

    // ─── Render ──────────────────────────────────────────────────────────────

    if (isLoadingFiles || isLoadingFolders) {
        return (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-medium">Dateien werden geladen...</p>
            </div>
        );
    }

    if (!selectedFolder) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-slate-900 flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-indigo-500" />
                        {title || "Projekt-Ordner"}
                    </h3>
                    <button
                        onClick={() => setIsCreateFolderModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Plus className="h-4 w-4" /> Neuer Ordner
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {allFolders.map(folderName => {
                        const count = files.filter(f => f.folder === folderName).length;
                        return (
                            <div key={folderName} className="group relative">
                                <button
                                    onClick={() => setSelectedFolder(folderName)}
                                    className="w-full bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 flex flex-col items-center gap-3 transition-all hover:scale-[1.02] hover:shadow-md active:scale-95 text-center"
                                >
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                        <FolderOpen className="h-6 w-6 text-indigo-500" />
                                    </div>
                                    <div className="text-center w-full px-2">
                                        <p className="font-bold text-slate-700 text-sm truncate">{folderName}</p>
                                        <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                            {count === 0 ? 'Keine Dateien' : `${count} Datei${count !== 1 ? 'en' : ''}`}
                                        </p>
                                    </div>
                                </button>
                                
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleRenameFolderUI(folderName); }} className="p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm">
                                        <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFolderUI(folderName); }} className="p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-rose-500 shadow-sm">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isCreateFolderModalOpen && (
                    <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl">
                            <h3 className="text-xl font-black text-slate-900 mb-2">Neuer Ordner</h3>
                            <input type="text" autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-4" placeholder="Name..." />
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setIsCreateFolderModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Abbrechen</button>
                                <button onClick={handleCreateFolder} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Erstellen</button>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmDialog 
                    isOpen={confirmDialog.isOpen}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmLabel="Löschen"
                    cancelLabel="Abbrechen"
                    variant="danger"
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                />
            </div>
        );
    }

    const folderFiles = files.filter(f => f.folder === selectedFolder);

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <button onClick={() => setSelectedFolder(null)} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Alle Ordner
                </button>
                <span className="text-slate-300">/</span>
                <span className="font-bold text-slate-700">{selectedFolder}</span>
                <div className="ml-auto flex gap-2">
                    <button onClick={() => handleRenameFolderUI(selectedFolder)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 disabled:opacity-60">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept={ACCEPT_ALL} onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
                </div>
            </div>

            {uploadError && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 text-sm text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="flex-1 whitespace-pre-line font-medium">{uploadError}</span>
                    <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
                </div>
            )}

            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={async (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) await handleFiles(e.dataTransfer.files); }}
                className={cn("border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer hover:bg-slate-50/50", isDragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200")}
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-sm text-slate-400">Dateien hier ablegen oder klicken</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {folderFiles.map(file => {
                    const isImage = file.mimeType?.startsWith('image/');
                    const IconComp = getFileIcon(file.mimeType);
                    const isDeleting = deletingId === file.id;

                    return (
                        <div key={file.id} className={cn("group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md", isDeleting && "opacity-40")}>
                            <div className="h-28 flex items-center justify-center bg-slate-50 cursor-pointer relative" onClick={() => isImage ? openLightbox(file) : resolveAndOpen(file)}>
                                {isImage && signedUrls[file.id] ? <img src={signedUrls[file.id]} alt={file.name} className="w-full h-full object-cover" /> : <IconComp className="h-10 w-10 text-slate-300" />}
                            </div>
                            <div className="p-3">
                                {renamingFileId === file.id ? (
                                    <div className="flex items-center gap-1 mb-1">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newFileName}
                                            onChange={e => setNewFileName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleRenameFile(file.id)}
                                            className="w-full text-xs font-bold text-slate-700 bg-white border border-indigo-200 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <button onClick={() => handleRenameFile(file.id)} className="p-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"><Check className="h-3 w-3" /></button>
                                        <button onClick={() => setRenamingFileId(null)} className="p-1 bg-slate-50 text-slate-400 rounded hover:bg-slate-100 transition-colors"><X className="h-3 w-3" /></button>
                                    </div>
                                ) : (
                                    <p className="text-xs font-bold text-slate-700 truncate mb-1 cursor-text" title={file.name} onDoubleClick={() => { setRenamingFileId(file.id); setNewFileName(file.name); }}>{file.name}</p>
                                )}
                                <div className="flex gap-1">
                                    <button onClick={() => setMovingFile(file)} className="flex-1 p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 rounded-lg border border-slate-100 transition-colors"><ArrowRightLeft className="h-3 w-3 mx-auto" /></button>
                                    <button onClick={() => resolveAndOpen(file)} className="flex-1 p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 rounded-lg border border-slate-100 transition-colors"><Download className="h-3 w-3 mx-auto" /></button>
                                    <button onClick={() => { setRenamingFileId(file.id); setNewFileName(file.name); }} className="flex-1 p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 rounded-lg border border-slate-100 transition-colors"><Edit2 className="h-3 w-3 mx-auto" /></button>
                                    <button onClick={() => handleDelete(file)} className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-300 rounded-lg border border-slate-100 transition-colors">{isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {movingFile && (
                <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-black text-slate-900 mb-2">Verschieben</h3>
                        <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
                            {allFolders.filter(f => f !== movingFile.folder).map(f => (
                                <button key={f} onClick={() => handleMoveFile(movingFile, f)} className="w-full text-left px-4 py-3 hover:bg-indigo-50 rounded-xl font-bold text-slate-700 border border-slate-100 flex items-center gap-3">
                                    <FolderOpen className="h-4 w-4 text-indigo-500" /> {f}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setMovingFile(null)} className="w-full mt-6 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Abbrechen</button>
                    </div>
                </div>
            )}

            {lightboxUrl && <div className="fixed inset-0 z-[400] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}><img src={lightboxUrl} alt="Vorschau" className="max-w-full max-h-full rounded-lg object-contain" /></div>}

            <ConfirmDialog 
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel="Löschen"
                cancelLabel="Abbrechen"
                variant="danger"
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
