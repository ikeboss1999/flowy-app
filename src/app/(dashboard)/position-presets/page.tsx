"use client";

import React, { useState, useMemo } from "react";
import {
    Search,
    Plus,
    FileText,
    Filter,
    Edit2,
    Trash2,
    Layers,
    Layout,
    Folder,
    FolderOpen,
    FolderMinus,
    MoreVertical
} from "lucide-react";
import { Service } from "@/types/service";
import { ServiceModal } from "@/components/ServiceModal";
import { useServices } from "@/hooks/useServices";
import { useServiceFolders, ServiceFolder } from "@/hooks/useServiceFolders";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";
import { DndContext, DragEndEvent, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';

// --- Helper Components for Drag & Drop ---

function DroppableFolder({ folder, isSelected, onClick, onRename, onDelete }: { folder: ServiceFolder | null, isSelected: boolean, onClick: () => void, onRename: () => void, onDelete: () => void }) {
    const folderId = folder ? folder.name : 'root';
    const { isOver, setNodeRef } = useDroppable({
        id: folderId,
        data: { type: 'folder', folderName: folder ? folder.name : null }
    });

    const isRoot = !folder;

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={cn(
                "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                isSelected
                    ? "bg-indigo-50 border-indigo-100 text-indigo-700 font-bold shadow-sm"
                    : isOver
                        ? "bg-indigo-50 border-dashed border-indigo-300 text-indigo-600"
                        : "bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-100"
            )}
        >
            <div className="flex items-center gap-3">
                {isRoot ? <Layers className="h-5 w-5" /> : (isSelected || isOver ? <FolderOpen className={cn("h-5 w-5", isSelected ? "text-indigo-500" : "text-slate-400")} /> : <Folder className="h-5 w-5 text-slate-400" />)}
                <span className="truncate">{isRoot ? 'Alle Vorlagen' : folder.name}</span>
            </div>

            {!isRoot && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onRename(); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                        title="Umbenennen"
                    >
                        <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                        title="Löschen"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

function DraggablePresetCard({ preset, onEdit, onDelete, onRemoveFromFolder }: { preset: Service, onEdit: () => void, onDelete: () => void, onRemoveFromFolder?: () => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: preset.id,
        data: { type: 'preset', preset }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "glass-card p-6 flex flex-col group hover:border-indigo-500/30 transition-all duration-300 cursor-grab active:cursor-grabbing",
                isDragging && "opacity-50 shadow-2xl scale-105 border-indigo-500"
            )}
        >
            <div className="flex justify-between items-start mb-6">
                <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                    (preset.itemType || 'standard') === 'standard' ? "bg-indigo-50 text-indigo-500 shadow-indigo-500/10" : "bg-emerald-50 text-emerald-500 shadow-emerald-500/10"
                )}>
                    {(preset.itemType || 'standard') === 'standard' ? <Layers className="h-6 w-6" /> : <Layout className="h-6 w-6" />}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {preset.folder && onRemoveFromFolder && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onRemoveFromFolder(); }}
                            className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors"
                            title="Aus Ordner entfernen"
                        >
                            <FolderMinus className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 space-y-2 mb-6">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {preset.title}
                    </h3>
                    <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        (preset.itemType || 'standard') === 'standard' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                        {(preset.itemType || 'standard') === 'standard' ? 'S' : 'D'}
                    </span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">
                    {preset.description || "Keine Beschreibung"}
                </p>
            </div>

            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    pro {preset.unit === 'pauschal' ? 'PA' : preset.unit}
                </span>
                <span className="text-2xl font-black text-slate-900">
                    € {preset.price.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );
}

// --- Main Page Component ---

export default function PositionPresetsPage() {
    const { services, addService, updateService, deleteService, isLoading: isServicesLoading } = useServices();
    const { folders, addFolder, renameFolder, deleteFolder, isLoading: isFoldersLoading } = useServiceFolders();
    const { showToast, showConfirm, showPrompt } = useNotification();
    
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);

    const positionPresets = useMemo(() => {
        return services.filter(service => {
            const isPosition = service.category === 'Position';
            const matchesSearch =
                service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesFolder = selectedFolder === null || service.folder === selectedFolder;

            return isPosition && matchesSearch && matchesFolder;
        });
    }, [services, searchQuery, selectedFolder]);

    const handleSavePreset = (service: Service) => {
        if (editingService) {
            // Save modified service, including any folder edits made inside the modal
            updateService(service.id, service);
        } else {
            // Add to currently selected folder when creating a new one
            addService({ ...service, category: 'Position', folder: selectedFolder });
        }
    };

    const handleDeletePreset = (id: string) => {
        showConfirm({
            title: "Vorlage löschen?",
            message: "Möchten Sie diese Positions-Vorlage wirklich entfernen?",
            variant: "danger",
            confirmLabel: "Jetzt löschen",
            onConfirm: () => {
                deleteService(id);
                showToast("Vorlage erfolgreich entfernt.", "success");
            }
        });
    };

    const handleCreateFolder = () => {
        showPrompt({
            title: "Neuer Ordner",
            message: "Geben Sie einen Namen für den neuen Ordner ein:",
            placeholder: "Ordnername...",
            confirmLabel: "Erstellen",
            onConfirm: (name) => {
                if (name && name.trim()) {
                    addFolder(name.trim()).then(() => showToast("Ordner erstellt", "success")).catch(() => showToast("Fehler beim Erstellen", "error"));
                }
            }
        });
    };

    const handleRenameFolder = (folder: ServiceFolder) => {
        showPrompt({
            title: "Ordner umbenennen",
            message: "Geben Sie einen neuen Namen für den Ordner ein:",
            initialValue: folder.name,
            confirmLabel: "Speichern",
            onConfirm: (name) => {
                if (name && name.trim() && name !== folder.name) {
                    renameFolder(folder.id, name.trim()).then(() => {
                        showToast("Ordner umbenannt", "success");
                        if (selectedFolder === folder.name) setSelectedFolder(name.trim());
                    }).catch(() => showToast("Fehler beim Umbenennen", "error"));
                }
            }
        });
    };

    const handleDeleteFolder = (folder: ServiceFolder) => {
        showConfirm({
            title: "Ordner löschen?",
            message: `Möchten Sie den Ordner "${folder.name}" wirklich löschen? Die enthaltenen Vorlagen werden in 'Alle Vorlagen' verschoben.`,
            variant: "danger",
            confirmLabel: "Ordner löschen",
            onConfirm: () => {
                deleteFolder(folder.id).then(() => {
                    showToast("Ordner gelöscht", "success");
                    if (selectedFolder === folder.name) setSelectedFolder(null);
                }).catch(() => showToast("Fehler beim Löschen", "error"));
            }
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const presetId = active.id as string;
        const targetFolderName = over.data.current?.folderName as string | null;
        
        const preset = services.find(s => s.id === presetId);
        if (!preset) return;

        // Don't update if it's already in that folder
        if (preset.folder === targetFolderName || (!preset.folder && targetFolderName === null)) {
            return;
        }

        updateService(preset.id, { ...preset, folder: targetFolderName });
        showToast(targetFolderName ? `In ${targetFolderName} verschoben` : `Aus Ordner entfernt`, "success");
    };

    if (isServicesLoading || isFoldersLoading) {
        return <div className="p-10 text-slate-400 font-bold">Laden...</div>;
    }

    return (
        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <div className="flex-1 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Area */}
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-indigo-600 mb-2">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <FileText className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-[0.2em]">Katalog</span>
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                            Positions <span className="text-slate-300 font-light">Vorlagen</span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium">Definieren Sie komplexe Positionen und organisieren Sie diese in Ordnern.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCreateFolder}
                            className="bg-white border border-slate-200 text-slate-700 px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-sm hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
                        >
                            <FolderPlusIcon className="h-5 w-5" /> Neuer Ordner
                        </button>
                        <button
                            onClick={() => {
                                setEditingService(undefined);
                                setIsModalOpen(true);
                            }}
                            className="bg-primary-gradient text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Plus className="h-5 w-5" /> Neue Vorlage
                        </button>
                    </div>
                </div>

                <div className="flex gap-8">
                    {/* Sidebar Folders */}
                    <div className="w-72 shrink-0 space-y-6">
                        <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100 space-y-1">
                            <h3 className="px-3 pb-2 text-xs font-black uppercase tracking-widest text-slate-400">Verzeichnis</h3>
                            
                            <DroppableFolder 
                                folder={null} 
                                isSelected={selectedFolder === null} 
                                onClick={() => setSelectedFolder(null)} 
                                onRename={() => {}}
                                onDelete={() => {}}
                            />
                            
                            {folders.map(folder => (
                                <DroppableFolder 
                                    key={folder.id}
                                    folder={folder} 
                                    isSelected={selectedFolder === folder.name} 
                                    onClick={() => setSelectedFolder(folder.name)} 
                                    onRename={() => handleRenameFolder(folder)}
                                    onDelete={() => handleDeleteFolder(folder)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 space-y-6">
                        {/* Search */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Vorlagen suchen..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                            />
                        </div>

                        {/* Presets Grid */}
                        {positionPresets.length > 0 ? (
                            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                                 {positionPresets.map((preset) => (
                                    <DraggablePresetCard 
                                        key={preset.id} 
                                        preset={preset} 
                                        onEdit={() => {
                                            setEditingService(preset);
                                            setIsModalOpen(true);
                                        }}
                                        onDelete={() => handleDeletePreset(preset.id)}
                                        onRemoveFromFolder={() => {
                                            updateService(preset.id, { ...preset, folder: null });
                                            showToast("Aus Ordner entfernt", "success");
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="glass-card py-24 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-2">
                                    <FileText className="h-10 w-10 text-slate-200" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xl font-bold text-slate-900">Keine Vorlagen hier</h4>
                                    <p className="text-slate-500 font-medium">Erstellen Sie eine neue Vorlage oder ziehen Sie eine hierher.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <ServiceModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSavePreset}
                    initialService={editingService}
                    folders={folders.map(f => f.name)}
                />
            </div>
        </DndContext>
    );
}

function FolderPlusIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 10v6" />
            <path d="M9 13h6" />
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
    )
}
