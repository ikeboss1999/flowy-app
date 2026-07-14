"use client";

import React, { useMemo, useState } from "react";
import {
    Edit2,
    FileText,
    Folder,
    FolderMinus,
    FolderOpen,
    FolderPlus,
    Layout,
    Layers,
    Plus,
    Search,
    Trash2,
} from "lucide-react";
import { Service } from "@/types/service";
import { ServiceModal } from "@/components/ServiceModal";
import { useServices } from "@/hooks/useServices";
import { ServiceFolder, useServiceFolders } from "@/hooks/useServiceFolders";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    PointerSensor,
    pointerWithin,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";

function DroppableFolder({
    folder,
    count,
    isSelected,
    onClick,
    onRename,
    onDelete,
}: {
    folder: ServiceFolder | null;
    count: number;
    isSelected: boolean;
    onClick: () => void;
    onRename: () => void;
    onDelete: () => void;
}) {
    const folderId = folder ? folder.name : "root";
    const { isOver, setNodeRef } = useDroppable({
        id: folderId,
        data: { type: "folder", folderName: folder ? folder.name : null }
    });

    const isRoot = !folder;

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={cn(
                "group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 transition-all",
                isSelected
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm"
                    : isOver
                        ? "border-dashed border-indigo-300 bg-indigo-50/80 text-indigo-700"
                        : "border-transparent bg-white text-slate-600 hover:border-slate-100 hover:bg-slate-50"
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    isSelected || isOver ? "bg-white text-indigo-600" : "bg-slate-50 text-slate-400"
                )}>
                    {isRoot ? <Layers className="h-5 w-5" /> : isSelected || isOver ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-black">{isRoot ? "Alle Vorlagen" : folder.name}</p>
                    <p className="text-xs font-semibold opacity-60">{count} Einträge</p>
                </div>
            </div>

            {!isRoot && (
                <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                        onClick={(event) => { event.stopPropagation(); onRename(); }}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-indigo-600"
                        title="Umbenennen"
                    >
                        <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={(event) => { event.stopPropagation(); onDelete(); }}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-rose-600"
                        title="Löschen"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

function PresetCard({
    preset,
    onEdit,
    onDelete,
    onRemoveFromFolder,
}: {
    preset: Service;
    onEdit: () => void;
    onDelete: () => void;
    onRemoveFromFolder?: () => void;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: preset.id,
        data: { type: "preset", preset }
    });

    const isDetailed = (preset.itemType || "standard") === "detailed";

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "group cursor-grab overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg active:cursor-grabbing 2xl:rounded-[32px]",
                isDragging && "opacity-30 ring-2 ring-indigo-300"
            )}
        >
            <div className="flex h-full flex-col p-4 2xl:p-6">
                <div className="mb-4 flex items-start justify-between gap-3 2xl:mb-5 2xl:gap-4">
                    <div className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl 2xl:h-14 2xl:w-14",
                        isDetailed ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                    )}>
                        {isDetailed ? <Layout className="h-5 w-5 2xl:h-7 2xl:w-7" /> : <Layers className="h-5 w-5 2xl:h-7 2xl:w-7" />}
                    </div>

                    <div className="flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        {preset.folder && onRemoveFromFolder && (
                            <button
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => { event.stopPropagation(); onRemoveFromFolder(); }}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100"
                                title="Aus Ordner entfernen"
                            >
                                <FolderMinus className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => { event.stopPropagation(); onEdit(); }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            title="Bearbeiten"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => { event.stopPropagation(); onDelete(); }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="Löschen"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="min-h-[90px] flex-1 2xl:min-h-[128px]">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1",
                            isDetailed ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-indigo-50 text-indigo-700 ring-indigo-100"
                        )}>
                            {isDetailed ? "Detailliert" : "Standard"}
                        </span>
                        {preset.folder && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                {preset.folder}
                            </span>
                        )}
                    </div>
                    <h3 className="line-clamp-2 text-xl font-black leading-tight text-slate-900 transition-colors group-hover:text-indigo-600 2xl:text-2xl">
                        {preset.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-slate-500 2xl:mt-3 2xl:line-clamp-3">
                        {preset.description || "Keine Beschreibung hinterlegt."}
                    </p>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 2xl:mt-6 2xl:rounded-3xl 2xl:p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vorlagenpreis</p>
                    <div className="mt-1 flex items-end justify-between gap-3">
                        <span className="text-2xl font-black text-slate-900 2xl:text-3xl">
                            € {(preset.price || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="pb-1 text-xs font-black uppercase tracking-widest text-slate-400">
                            pro {preset.unit}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PositionPresetsPage() {
    const { services, addService, updateService, deleteService, isLoading: isServicesLoading } = useServices();
    const { folders, addFolder, renameFolder, deleteFolder, isLoading: isFoldersLoading } = useServiceFolders();
    const { showToast, showConfirm, showPrompt } = useNotification();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const allPositionPresets = useMemo(
        () => services.filter(service => service.category === "Position"),
        [services]
    );

    const positionPresets = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return allPositionPresets
            .filter(service => {
                const matchesSearch =
                    !query ||
                    service.title.toLowerCase().includes(query) ||
                    (service.description || "").toLowerCase().includes(query) ||
                    (service.folder || "").toLowerCase().includes(query);

                const matchesFolder = selectedFolder === null || service.folder === selectedFolder;
                return matchesSearch && matchesFolder;
            })
            .sort((a, b) => a.title.localeCompare(b.title, "de", { sensitivity: "base" }));
    }, [allPositionPresets, searchQuery, selectedFolder]);

    const folderCounts = useMemo(() => {
        const counts = new Map<string, number>();
        allPositionPresets.forEach(preset => {
            if (preset.folder) counts.set(preset.folder, (counts.get(preset.folder) || 0) + 1);
        });
        return counts;
    }, [allPositionPresets]);

    const stats = useMemo(() => ({
        total: allPositionPresets.length,
        standard: allPositionPresets.filter(preset => (preset.itemType || "standard") === "standard").length,
        detailed: allPositionPresets.filter(preset => preset.itemType === "detailed").length,
        folders: folders.length,
    }), [allPositionPresets, folders]);

    const handleSavePreset = (service: Service) => {
        const preset = { ...service, category: "Position" as const, folder: service.folder || selectedFolder || undefined };
        if (editingService) {
            updateService(preset.id, preset);
            showToast("Vorlage erfolgreich aktualisiert.", "success");
        } else {
            addService(preset);
            showToast("Vorlage erfolgreich erstellt.", "success");
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
                if (name?.trim()) {
                    addFolder(name.trim())
                        .then(() => showToast("Ordner erstellt.", "success"))
                        .catch(() => showToast("Fehler beim Erstellen.", "error"));
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
                if (name?.trim() && name.trim() !== folder.name) {
                    renameFolder(folder.id, name.trim())
                        .then(() => {
                            showToast("Ordner umbenannt.", "success");
                            if (selectedFolder === folder.name) setSelectedFolder(name.trim());
                        })
                        .catch(() => showToast("Fehler beim Umbenennen.", "error"));
                }
            }
        });
    };

    const handleDeleteFolder = (folder: ServiceFolder) => {
        showConfirm({
            title: "Ordner löschen?",
            message: `Möchten Sie den Ordner "${folder.name}" wirklich löschen? Enthaltene Vorlagen werden in das Hauptverzeichnis verschoben.`,
            variant: "danger",
            confirmLabel: "Ordner löschen",
            onConfirm: () => {
                deleteFolder(folder.id)
                    .then(() => {
                        showToast("Ordner gelöscht.", "success");
                        if (selectedFolder === folder.name) setSelectedFolder(null);
                    })
                    .catch(() => showToast("Fehler beim Löschen.", "error"));
            }
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (!over) return;

        const preset = services.find(service => service.id === active.id);
        const targetFolderName = over.data.current?.folderName as string | null;
        if (!preset) return;
        if (preset.folder === targetFolderName || (!preset.folder && targetFolderName === null)) return;

        updateService(preset.id, { ...preset, folder: targetFolderName || undefined });
        showToast(targetFolderName ? `In ${targetFolderName} verschoben.` : "Aus Ordner entfernt.", "success");
    };

    const openCreateModal = () => {
        setEditingService(undefined);
        setIsModalOpen(true);
    };

    if (isServicesLoading || isFoldersLoading) {
        return (
            <div className="dashboard-page flex items-center justify-center">
                <div className="rounded-3xl border border-slate-100 bg-white px-6 py-4 font-black text-slate-400 shadow-sm">
                    Vorlagen werden geladen...
                </div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={(event) => setActiveDragId(event.active.id as string)}
            onDragEnd={handleDragEnd}
            collisionDetection={pointerWithin}
        >
            <div className="dashboard-page">
                <div className="overflow-hidden rounded-[36px] border border-indigo-100/70 bg-white shadow-sm">
                    <div className="relative bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white sm:p-8">
                        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                        <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
                        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                            <div>
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                                        <FileText className="h-6 w-6 text-cyan-200" />
                                    </div>
                                    <span className="text-sm font-black uppercase tracking-[0.35em] text-cyan-100">Katalog</span>
                                </div>
                                <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Positions-Vorlagen</h1>
                                <p className="mt-3 max-w-2xl text-base font-medium text-white/65">
                                    Wiederverwendbare Positionen organisieren, verschieben und direkt in Dokumente übernehmen.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleCreateFolder}
                                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition-all hover:bg-white/15"
                                >
                                    <FolderPlus className="h-5 w-5" /> Neuer Ordner
                                </button>
                                <button
                                    onClick={openCreateModal}
                                    className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5"
                                >
                                    <Plus className="h-5 w-5" /> Neue Vorlage
                                </button>
                            </div>
                        </div>

                        <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                { label: "Vorlagen", value: stats.total, icon: Layers, className: "border-white/10 bg-white/10 text-white" },
                                { label: "Standard", value: stats.standard, icon: Layers, className: "border-indigo-300/20 bg-indigo-400/10 text-indigo-100" },
                                { label: "Detailliert", value: stats.detailed, icon: Layout, className: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" },
                                { label: "Ordner", value: stats.folders, icon: FolderOpen, className: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100" },
                            ].map(({ label, value, icon: Icon, className }) => (
                                <div key={label} className={cn("rounded-3xl border p-4 backdrop-blur", className)}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
                                            <p className="mt-2 text-3xl font-black">{value}</p>
                                        </div>
                                        <Icon className="h-6 w-6 opacity-70" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/80 p-4">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Vorlage, Beschreibung oder Ordner suchen..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
                    <aside className="space-y-4">
                        <div className="rounded-[32px] border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="mb-3 px-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verzeichnis</p>
                                <p className="mt-1 text-sm font-semibold text-slate-500">Drag & Drop in einen Ordner.</p>
                            </div>
                            <div className="space-y-2">
                                <DroppableFolder
                                    folder={null}
                                    count={allPositionPresets.length}
                                    isSelected={selectedFolder === null}
                                    onClick={() => setSelectedFolder(null)}
                                    onRename={() => {}}
                                    onDelete={() => {}}
                                />
                                {folders.map(folder => (
                                    <DroppableFolder
                                        key={folder.id}
                                        folder={folder}
                                        count={folderCounts.get(folder.name) || 0}
                                        isSelected={selectedFolder === folder.name}
                                        onClick={() => setSelectedFolder(folder.name)}
                                        onRename={() => handleRenameFolder(folder)}
                                        onDelete={() => handleDeleteFolder(folder)}
                                    />
                                ))}
                            </div>
                        </div>
                    </aside>

                    <main className="space-y-5">
                        <div className="flex flex-col gap-3 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                    {selectedFolder || "Alle Vorlagen"}
                                </p>
                                <h2 className="mt-1 text-2xl font-black text-slate-900">{positionPresets.length} Einträge</h2>
                            </div>
                            {selectedFolder && (
                                <button
                                    onClick={() => setSelectedFolder(null)}
                                    className="w-fit rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600"
                                >
                                    Alle anzeigen
                                </button>
                            )}
                        </div>

                        {positionPresets.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2 2xl:gap-5">
                                {positionPresets.map(preset => (
                                    <PresetCard
                                        key={preset.id}
                                        preset={preset}
                                        onEdit={() => {
                                            setEditingService(preset);
                                            setIsModalOpen(true);
                                        }}
                                        onDelete={() => handleDeletePreset(preset.id)}
                                        onRemoveFromFolder={() => {
                                            updateService(preset.id, { ...preset, folder: undefined });
                                            showToast("Aus Ordner entfernt.", "success");
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-[36px] border border-dashed border-indigo-200 bg-indigo-50/40 px-6 py-24 text-center">
                                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-indigo-500 shadow-sm">
                                    <FileText className="h-10 w-10" />
                                </div>
                                <h4 className="text-xl font-black text-slate-900">Keine Vorlagen gefunden</h4>
                                <p className="mt-2 max-w-md font-medium text-slate-500">
                                    Erstellen Sie eine Vorlage oder wählen Sie einen anderen Ordner.
                                </p>
                                <button
                                    onClick={openCreateModal}
                                    className="mt-5 rounded-2xl bg-white px-5 py-3 font-black text-indigo-600 shadow-sm ring-1 ring-indigo-100"
                                >
                                    Vorlage erstellen
                                </button>
                            </div>
                        )}
                    </main>
                </div>

                <ServiceModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSavePreset}
                    initialService={editingService}
                    folders={folders.map(folder => folder.name)}
                    mode="position"
                />
            </div>

            <DragOverlay dropAnimation={null}>
                {activeDragId && (() => {
                    const preset = services.find(service => service.id === activeDragId);
                    if (!preset) return null;
                    return (
                        <div className="w-80 rotate-1 rounded-[32px] border-2 border-indigo-300 bg-white p-6 shadow-2xl">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                {(preset.itemType || "standard") === "detailed" ? <Layout className="h-7 w-7" /> : <Layers className="h-7 w-7" />}
                            </div>
                            <h3 className="line-clamp-1 text-xl font-black text-slate-900">{preset.title}</h3>
                            <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-500">{preset.description || "Keine Beschreibung"}</p>
                        </div>
                    );
                })()}
            </DragOverlay>
        </DndContext>
    );
}
