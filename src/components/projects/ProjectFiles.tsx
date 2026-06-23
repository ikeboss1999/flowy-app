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
import { DocumentPreviewModal } from "../DocumentPreviewModal";

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

export function ProjectFiles({ projectId, title = "Projekt-Dateien" }: ProjectFilesProps) {
    const { files, isLoading: isLoadingFiles, uploadFile, deleteFile, getSignedUrl, updateFile, mutate: mutateFiles } = useProjectFiles(projectId);
    const { folders, isLoading: isLoadingFolders, addFolder, renameFolder, deleteFolder, mutate: mutateFolders } = useProjectFolders(projectId);

    const [selectedFolder, setSelectedFolder] = useState<FileFolder | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Modal / Dialog States
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renamingFolderOldPath, setRenamingFolderOldPath] = useState<string | null>(null);
    const [renamingFolderNewName, setRenamingFolderNewName] = useState('');
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
    const [previewDoc, setPreviewDoc] = useState<any | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync helper
    const triggerMutate = async () => {
        await Promise.all([mutateFiles(), mutateFolders()]);
    };

    // Combine folders from DB + files (to handle legacy folders or folder-less files)
    const allFolders = useMemo(() => {
        const fromFiles = Array.from(new Set(files.map(f => f.folder)));
        const fromDB = folders.map(f => f.name);
        const combined = Array.from(new Set([...fromDB, ...fromFiles])).sort();
        return combined;
    }, [files, folders]);

    // Compute visible folders/subfolders based on current path
    const visibleFolders = useMemo(() => {
        const set = new Set<string>();
        if (!selectedFolder) {
            allFolders.forEach(f => {
                const parts = f.split('/');
                if (parts[0]) set.add(parts[0]);
            });
        } else {
            const prefix = selectedFolder + '/';
            allFolders.forEach(f => {
                if (f.startsWith(prefix)) {
                    const suffix = f.slice(prefix.length);
                    const nextPart = suffix.split('/')[0];
                    if (nextPart) {
                        set.add(selectedFolder + '/' + nextPart);
                    }
                }
            });
        }
        return Array.from(set).sort();
    }, [allFolders, selectedFolder]);

    // Breadcrumbs path
    const breadcrumbs = useMemo(() => {
        if (!selectedFolder) return [];
        const parts = selectedFolder.split('/');
        return parts.map((part, index) => {
            const path = parts.slice(0, index + 1).join('/');
            return { name: part, path };
        });
    }, [selectedFolder]);

    // Helper to count files in a folder and its subfolders
    const getFolderFilesCount = useCallback((folderPath: string) => {
        return files.filter(f => f.folder === folderPath || f.folder?.startsWith(folderPath + '/')).length;
    }, [files]);

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
        const trimmed = newFolderName.trim();
        if (!trimmed) return;
        const newFolderFullPath = selectedFolder ? `${selectedFolder}/${trimmed}` : trimmed;
        
        if (allFolders.includes(newFolderFullPath)) {
            setUploadError('Ordner existiert bereits.');
            return;
        }
        try {
            await addFolder(newFolderFullPath);
            setNewFolderName('');
            setIsCreateFolderModalOpen(false);
            await triggerMutate();
        } catch (e) {
            setUploadError('Ordner konnte nicht in der Datenbank erstellt werden.');
        }
    };

    const submitRenameFolder = async () => {
        if (!renamingFolderOldPath || !renamingFolderNewName.trim()) return;
        const trimmedNewName = renamingFolderNewName.trim();
        
        const parts = renamingFolderOldPath.split('/');
        parts[parts.length - 1] = trimmedNewName;
        const newFullPath = parts.join('/');
        
        if (newFullPath === renamingFolderOldPath) {
            setRenamingFolderOldPath(null);
            return;
        }
        
        try {
            // 1. Rename main folder record in DB
            const folderRecord = folders.find(f => f.name === renamingFolderOldPath);
            if (folderRecord) {
                await renameFolder(folderRecord.id, newFullPath);
            } else {
                await addFolder(newFullPath);
            }
            
            // 2. Rename subfolder records in DB
            const prefix = renamingFolderOldPath + '/';
            const subfoldersToUpdate = folders.filter(f => f.name.startsWith(prefix));
            for (const sub of subfoldersToUpdate) {
                const updatedSubName = newFullPath + '/' + sub.name.slice(prefix.length);
                await renameFolder(sub.id, updatedSubName);
            }
            
            // 3. Rename files' folder attributes in DB/storage
            const filesToUpdate = files.filter(f => f.folder === renamingFolderOldPath || f.folder?.startsWith(prefix));
            await Promise.all(filesToUpdate.map(f => {
                let updatedFolder = newFullPath;
                if (f.folder.startsWith(prefix)) {
                    updatedFolder = newFullPath + '/' + f.folder.slice(prefix.length);
                }
                return updateFile(f.id, { folder: updatedFolder });
            }));
            
            // 4. Update local selected folder state if it matches the renamed one
            if (selectedFolder === renamingFolderOldPath) {
                setSelectedFolder(newFullPath);
            } else if (selectedFolder?.startsWith(prefix)) {
                setSelectedFolder(newFullPath + '/' + selectedFolder.slice(prefix.length));
            }
            
            setRenamingFolderOldPath(null);
            await triggerMutate();
        } catch (e) {
            setUploadError('Fehler beim Umbenennen des Ordners.');
        }
    };

    const handleDeleteFolderUI = (folderName: string) => {
        const prefix = folderName + '/';
        const affectedFiles = files.filter(f => f.folder === folderName || f.folder?.startsWith(prefix));
        
        const msg = affectedFiles.length > 0 
            ? `Ordner "${folderName.split('/').pop()}" und alle darin enthaltenen Unterordner und ${affectedFiles.length} Dateien wirklich löschen?`
            : `Leeren Ordner "${folderName.split('/').pop()}" wirklich löschen?`;
            
        setConfirmDialog({
            isOpen: true,
            title: 'Ordner löschen',
            message: msg,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                try {
                    // 1. Delete subfolder records in DB
                    const subfolderRecords = folders.filter(f => f.name.startsWith(prefix));
                    for (const sub of subfolderRecords) {
                        await deleteFolder(sub.id);
                    }
                    
                    // 2. Delete main folder record in DB
                    const folderRecord = folders.find(f => f.name === folderName);
                    if (folderRecord) await deleteFolder(folderRecord.id);
                    
                    // 3. Delete files
                    await Promise.all(affectedFiles.map(f => deleteFile(f.id)));
                    
                    // 4. Adjust selected folder state if we deleted it or its parent
                    if (selectedFolder === folderName || selectedFolder?.startsWith(prefix)) {
                        setSelectedFolder(null);
                    }
                    await triggerMutate();
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
            await triggerMutate();
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

    const handlePreviewFile = async (file: ProjectFile) => {
        try {
            const url = signedUrls[file.id] || await getSignedUrl(file.storagePath);
            setPreviewDoc({
                id: file.id,
                name: file.name,
                type: file.mimeType || "application/octet-stream",
                uploadDate: file.createdAt,
                fileSize: formatBytes(file.size),
                content: url
            });
            setIsPreviewOpen(true);
        } catch (e) {
            console.error("Vorschau konnte nicht geladen werden:", e);
        }
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
        await triggerMutate();
    }, [selectedFolder, uploadFile]);

    const handleRenameFile = async (fileId: string) => {
        if (!newFileName.trim()) {
            setRenamingFileId(null);
            return;
        }
        try {
            await updateFile(fileId, { name: newFileName.trim() });
            setRenamingFileId(null);
            await triggerMutate();
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
                    await triggerMutate();
                } finally {
                    setDeletingId(null);
                }
            }
        });
    };

    const renderFolderTable = (folderList: string[]) => {
        return (
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-wider font-outfit">
                                <th className="py-4 px-6">Name</th>
                                <th className="py-4 px-6 hidden sm:table-cell">Dateien</th>
                                <th className="py-4 px-6 text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {folderList.map(folderName => {
                                const displayName = folderName.split('/').pop() || folderName;
                                const count = getFolderFilesCount(folderName);
                                return (
                                    <tr key={folderName} className="group hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    onClick={() => setSelectedFolder(folderName)}
                                                    className="h-10 w-10 rounded-xl bg-indigo-50/50 flex items-center justify-center text-indigo-500 hover:bg-indigo-55 transition-colors cursor-pointer shrink-0"
                                                >
                                                    <FolderOpen className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p 
                                                        onClick={() => setSelectedFolder(folderName)}
                                                        className="text-sm font-bold text-slate-700 truncate cursor-pointer hover:text-indigo-650 transition-colors font-outfit"
                                                        title={displayName}
                                                    >
                                                        {displayName}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm font-medium text-slate-400 hidden sm:table-cell font-outfit">
                                            {count === 0 ? 'Keine Dateien' : `${count} Datei${count !== 1 ? 'en' : ''}`}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setRenamingFolderOldPath(folderName); setRenamingFolderNewName(displayName); }} title="Umbenennen" className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition-colors">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDeleteFolderUI(folderName)} title="Löschen" className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-xl border border-slate-100 transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
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
                    <h3 className="font-black text-slate-900 flex items-center gap-2 font-outfit text-lg">
                        <FolderOpen className="h-5 w-5 text-indigo-500" />
                        {title}
                    </h3>
                    <button
                        onClick={() => setIsCreateFolderModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                    >
                        <Plus className="h-4 w-4" /> Neuer Ordner
                    </button>
                </div>

                {visibleFolders.length === 0 ? (
                    <div className="p-16 text-center bg-slate-50/50 rounded-[32px] border border-slate-100/85 max-w-md mx-auto mt-8 flex flex-col items-center gap-4">
                        <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                            <FolderOpen className="h-8 w-8" />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 text-base font-outfit">Keine Ordner</h4>
                            <p className="text-slate-400 font-medium text-xs mt-1 font-outfit leading-relaxed">Erstellen Sie Ihren ersten Ordner, um Dokumente zu organisieren.</p>
                        </div>
                        <button
                            onClick={() => setIsCreateFolderModalOpen(true)}
                            className="mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center gap-2 font-outfit"
                        >
                            <Plus className="h-4 w-4" /> Ordner erstellen
                        </button>
                    </div>
                ) : (
                    renderFolderTable(visibleFolders)
                )}

                {isCreateFolderModalOpen && (
                    <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl">
                            <h3 className="text-xl font-black text-slate-900 mb-2 font-outfit">Neuer Ordner</h3>
                            <input type="text" autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-4 font-outfit" placeholder="Name..." />
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setIsCreateFolderModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors font-outfit">Abbrechen</button>
                                <button onClick={handleCreateFolder} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors font-outfit">Erstellen</button>
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
        <div 
            className="space-y-5"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) await handleFiles(e.dataTransfer.files); }}
        >
            <div className="flex items-center gap-4 flex-wrap border-b border-slate-50 pb-4">
                <div className="flex items-center gap-2 flex-wrap font-outfit text-sm">
                    <button onClick={() => setSelectedFolder(null)} className="text-slate-400 hover:text-indigo-600 font-bold transition-colors">
                        Alle Ordner
                    </button>
                    {breadcrumbs.map((bc, index) => (
                        <React.Fragment key={bc.path}>
                            <span className="text-slate-300">/</span>
                            {index === breadcrumbs.length - 1 ? (
                                <span className="font-bold text-slate-700">{bc.name}</span>
                            ) : (
                                <button onClick={() => setSelectedFolder(bc.path)} className="text-slate-400 hover:text-indigo-600 font-bold transition-colors">
                                    {bc.name}
                                </button>
                            )}
                        </React.Fragment>
                    ))}
                </div>
                
                <div className="ml-auto flex items-center gap-2">
                    <button 
                        onClick={() => setIsCreateFolderModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm font-outfit"
                    >
                        <Plus className="h-3.5 w-3.5" /> Neuer Unterordner
                    </button>
                    <button 
                        onClick={() => {
                            const name = selectedFolder.split('/').pop() || selectedFolder;
                            setRenamingFolderOldPath(selectedFolder);
                            setRenamingFolderNewName(name);
                        }} 
                        className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-indigo-650 hover:border-indigo-150 rounded-xl shadow-sm transition-all"
                        title="Ordner umbenennen"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => handleDeleteFolderUI(selectedFolder)} 
                        className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-150 rounded-xl shadow-sm transition-all"
                        title="Ordner löschen"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 disabled:opacity-60 font-outfit">
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Datei hochladen
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept={ACCEPT_ALL} onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
                </div>
            </div>

            {uploadError && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 text-sm text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="flex-1 whitespace-pre-line font-medium font-outfit">{uploadError}</span>
                    <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
                </div>
            )}

            {visibleFolders.length === 0 && folderFiles.length === 0 ? (
                <div className="p-16 text-center bg-slate-50/50 rounded-[32px] border border-slate-100/80 max-w-md mx-auto mt-8 flex flex-col items-center gap-4">
                    <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                        <FolderOpen className="h-8 w-8" />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 text-base font-outfit">Dieser Ordner ist leer</h4>
                        <p className="text-slate-400 font-medium text-xs mt-1 leading-relaxed font-outfit">Ziehen Sie Dateien hierher, um sie hochzuladen, oder erstellen Sie einen Unterordner.</p>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={() => setIsCreateFolderModalOpen(true)}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm font-outfit"
                        >
                            Unterordner erstellen
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 font-outfit"
                        >
                            Datei hochladen
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {visibleFolders.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Ordner</h4>
                            {renderFolderTable(visibleFolders)}
                        </div>
                    )}

                    {folderFiles.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Dateien</h4>
                            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-wider font-outfit">
                                                <th className="py-4 px-6">Name</th>
                                                <th className="py-4 px-6 hidden sm:table-cell">Größe</th>
                                                <th className="py-4 px-6 hidden md:table-cell">Erstellt am</th>
                                                <th className="py-4 px-6 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {folderFiles.map(file => {
                                                const isImage = file.mimeType?.startsWith('image/');
                                                const IconComp = getFileIcon(file.mimeType);
                                                const isDeleting = deletingId === file.id;
                                                
                                                return (
                                                    <tr 
                                                        key={file.id} 
                                                        onClick={() => handlePreviewFile(file)}
                                                        className={cn(
                                                            "group hover:bg-slate-50/50 hover:border-indigo-150 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group/doc", 
                                                            isDeleting && "opacity-40"
                                                        )}
                                                    >
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors shrink-0">
                                                                    {isImage && signedUrls[file.id] ? (
                                                                        <img src={signedUrls[file.id]} alt={file.name} className="h-full w-full object-cover rounded-xl" />
                                                                    ) : (
                                                                        <IconComp className="h-5 w-5" />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    {renamingFileId === file.id ? (
                                                                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                                            <input
                                                                                autoFocus
                                                                                type="text"
                                                                                value={newFileName}
                                                                                onChange={e => setNewFileName(e.target.value)}
                                                                                onKeyDown={e => e.key === 'Enter' && handleRenameFile(file.id)}
                                                                                className="w-full text-sm font-bold text-slate-700 bg-white border border-indigo-200 rounded-xl px-3 py-1 outline-none focus:ring-2 focus:ring-indigo-500/20 font-outfit"
                                                                            />
                                                                            <button onClick={() => handleRenameFile(file.id)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"><Check className="h-4 w-4" /></button>
                                                                            <button onClick={() => setRenamingFileId(null)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors"><X className="h-4 w-4" /></button>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm font-bold text-slate-750 truncate hover:text-indigo-600 transition-colors font-outfit">
                                                                            {file.name}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 text-sm font-medium text-slate-500 hidden sm:table-cell font-outfit">
                                                            {formatBytes(file.size)}
                                                        </td>
                                                        <td className="py-4 px-6 text-sm font-medium text-slate-400 hidden md:table-cell font-outfit">
                                                            {new Date(file.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={(e) => { e.stopPropagation(); setMovingFile(file); }} title="Verschieben" className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition-colors">
                                                                    <ArrowRightLeft className="h-4 w-4" />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); resolveAndOpen(file); }} title="Download" className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition-colors">
                                                                    <Download className="h-4 w-4" />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); setRenamingFileId(file.id); setNewFileName(file.name); }} title="Umbenennen" className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition-colors">
                                                                    <Edit2 className="h-4 w-4" />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(file); }} title="Löschen" className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-xl border border-slate-100 transition-colors">
                                                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isDragging && (
                <div className="fixed inset-0 z-[250] bg-indigo-950/20 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-none">
                    <div className="bg-white p-8 rounded-[32px] shadow-2xl flex flex-col items-center gap-4 text-center max-w-sm border border-slate-100/50 animate-in zoom-in-95 duration-200">
                        <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 animate-bounce">
                            <Upload className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 font-outfit">Dateien hochladen</h3>
                            <p className="text-slate-500 font-medium text-sm mt-1 font-outfit leading-relaxed">Lassen Sie die Dateien einfach hier los, um sie in diesen Ordner hochzuladen.</p>
                        </div>
                    </div>
                </div>
            )}

            {isCreateFolderModalOpen && (
                <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-black text-slate-900 mb-2 font-outfit">Neuer Unterordner</h3>
                        <input type="text" autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-4 font-outfit" placeholder="Name..." />
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setIsCreateFolderModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors font-outfit">Abbrechen</button>
                            <button onClick={handleCreateFolder} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors font-outfit font-outfit">Erstellen</button>
                        </div>
                    </div>
                </div>
            )}

            {renamingFolderOldPath && (
                <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-black text-slate-900 mb-2 font-outfit">Ordner umbenennen</h3>
                        <input type="text" autoFocus value={renamingFolderNewName} onChange={(e) => setRenamingFolderNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitRenameFolder()} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-4 font-outfit" placeholder="Neuer Name..." />
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setRenamingFolderOldPath(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors font-outfit">Abbrechen</button>
                            <button onClick={submitRenameFolder} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors font-outfit font-outfit font-bold">Speichern</button>
                        </div>
                    </div>
                </div>
            )}

            {movingFile && (
                <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-black text-slate-900 mb-2 font-outfit">Verschieben</h3>
                        <div className="space-y-2 mt-4 max-h-60 overflow-y-auto font-outfit">
                            {allFolders.filter(f => f !== movingFile.folder).map(f => (
                                <button key={f} onClick={() => handleMoveFile(movingFile, f)} className="w-full text-left px-4 py-3 hover:bg-indigo-50 rounded-xl font-bold text-slate-700 border border-slate-100 flex items-center gap-3">
                                    <FolderOpen className="h-4 w-4 text-indigo-500" /> {f}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setMovingFile(null)} className="w-full mt-6 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 font-outfit">Abbrechen</button>
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

            <DocumentPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                document={previewDoc}
            />
        </div>
    );
}
