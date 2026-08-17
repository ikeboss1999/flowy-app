"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Edit2,
    FileText,
    Folder,
    FolderOpen,
    FolderPlus,
    GripVertical,
    Layout,
    Layers,
    Plus,
    Search,
    Trash2,
} from "lucide-react";
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
import { Service } from "@/types/service";
import { ServiceModal } from "@/components/ServiceModal";
import { useServices } from "@/hooks/useServices";
import { ServiceFolder, useServiceFolders } from "@/hooks/useServiceFolders";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

type TypeFilter = "all" | "standard" | "detailed";

function formatCurrency(value?: number) {
    return (value || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function FolderItem({
    folder,
    count,
    isSelected,
    onClick,
    onRename,
    onDelete,
}: {
    folder: ServiceFolder;
    count: number;
    isSelected: boolean;
    onClick: () => void;
    onRename: () => void;
    onDelete: () => void;
}) {
    const { isOver, setNodeRef } = useDroppable({
        id: folder.name,
        data: { type: "folder", folderName: folder.name },
    });

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={cn(
                "group flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-3 transition-all",
                isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : isOver
                        ? "border-dashed border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-white/12 text-white" : "bg-slate-100 text-slate-500"
                )}>
                    {isSelected || isOver ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-black">{folder.name}</p>
                    <p className={cn("text-xs font-semibold", isSelected ? "text-white/60" : "text-slate-400")}>
                        {count} Position{count === 1 ? "" : "en"}
                    </p>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <button
                    onClick={(event) => { event.stopPropagation(); onRename(); }}
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                        isSelected ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-white hover:text-indigo-600"
                    )}
                    title="Ordner umbenennen"
                >
                    <Edit2 className="h-4 w-4" />
                </button>
                <button
                    onClick={(event) => { event.stopPropagation(); onDelete(); }}
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                        isSelected ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-white hover:text-rose-600"
                    )}
                    title="Ordner loeschen"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function PresetRow({
    preset,
    onEdit,
    onDelete,
}: {
    preset: Service;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: preset.id,
        data: { type: "preset", preset },
    });
    const isDetailed = (preset.itemType || "standard") === "detailed";

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "group grid cursor-grab gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md active:cursor-grabbing lg:grid-cols-[28px_1fr_120px_130px_92px]",
                isDragging && "opacity-30 ring-2 ring-indigo-300"
            )}
        >
            <div className="hidden items-center justify-center text-slate-300 lg:flex">
                <GripVertical className="h-5 w-5" />
            </div>

            <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider",
                        isDetailed ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
                    )}>
                        {isDetailed ? <Layout className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
                        {isDetailed ? "Detailliert" : "Standard"}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {preset.unit}
                    </span>
                </div>
                <h3 className="truncate text-base font-black text-slate-950">{preset.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-500">
                    {preset.description || "Keine Beschreibung hinterlegt."}
                </p>
            </div>

            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 lg:block lg:bg-transparent lg:px-0 lg:py-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preis</p>
                <p className="mt-0.5 font-mono text-base font-black text-slate-900">{formatCurrency(preset.price)}</p>
            </div>

            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 lg:block lg:bg-transparent lg:px-0 lg:py-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Einheit</p>
                <p className="mt-0.5 text-sm font-black uppercase text-slate-700">pro {preset.unit}</p>
            </div>

            <div className="flex items-center justify-end gap-2">
                <button
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => { event.stopPropagation(); onEdit(); }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    title="Bearbeiten"
                >
                    <Edit2 className="h-4 w-4" />
                </button>
                <button
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => { event.stopPropagation(); onDelete(); }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    title="Loeschen"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

export default function PositionPresetsPage() {
    const { services, addService, updateService, deleteService, refreshServices, isLoading: isServicesLoading } = useServices();
    const { folders, addFolder, renameFolder, deleteFolder, isLoading: isFoldersLoading } = useServiceFolders();
    const { showToast, showConfirm, showPrompt } = useNotification();

    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const folderNames = useMemo(() => new Set(folders.map(folder => folder.name)), [folders]);
    const folderOptions = useMemo(() => folders.map(folder => folder.name), [folders]);
    const allPositionPresets = useMemo(() => services.filter(service => service.category === "Position"), [services]);
    const assignedPresets = useMemo(
        () => allPositionPresets.filter(preset => Boolean(preset.folder) && folderNames.has(preset.folder as string)),
        [allPositionPresets, folderNames]
    );
    const orphanPresets = useMemo(
        () => allPositionPresets.filter(preset => !preset.folder || !folderNames.has(preset.folder)),
        [allPositionPresets, folderNames]
    );

    useEffect(() => {
        if (folders.length === 0) {
            setSelectedFolder(null);
            return;
        }
        if (!selectedFolder || !folders.some(folder => folder.name === selectedFolder)) {
            setSelectedFolder(folders[0].name);
        }
    }, [folders, selectedFolder]);

    const folderCounts = useMemo(() => {
        const counts = new Map<string, number>();
        assignedPresets.forEach(preset => {
            if (preset.folder) counts.set(preset.folder, (counts.get(preset.folder) || 0) + 1);
        });
        return counts;
    }, [assignedPresets]);

    const visiblePresets = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!selectedFolder) return [];

        return assignedPresets
            .filter(preset => {
                const matchesFolder = preset.folder === selectedFolder;
                const matchesType = typeFilter === "all" || (preset.itemType || "standard") === typeFilter;
                const matchesSearch =
                    !query ||
                    preset.title.toLowerCase().includes(query) ||
                    (preset.description || "").toLowerCase().includes(query) ||
                    (preset.unit || "").toLowerCase().includes(query);
                return matchesFolder && matchesType && matchesSearch;
            })
            .sort((a, b) => a.title.localeCompare(b.title, "de", { sensitivity: "base" }));
    }, [assignedPresets, searchQuery, selectedFolder, typeFilter]);

    const selectedFolderCount = selectedFolder ? folderCounts.get(selectedFolder) || 0 : 0;
    const stats = useMemo(() => ({
        total: assignedPresets.length,
        standard: assignedPresets.filter(preset => (preset.itemType || "standard") === "standard").length,
        detailed: assignedPresets.filter(preset => preset.itemType === "detailed").length,
        folders: folders.length,
    }), [assignedPresets, folders]);

    const handleSavePreset = (service: Service) => {
        const targetFolder = service.folder || selectedFolder;
        if (!targetFolder) {
            showToast("Bitte zuerst einen Ordner erstellen.", "error");
            return;
        }

        const preset = { ...service, category: "Position" as const, folder: targetFolder };
        if (editingService) {
            updateService(preset.id, preset);
            showToast("Vorlage aktualisiert.", "success");
        } else {
            addService(preset);
            showToast("Vorlage erstellt.", "success");
        }
    };

    const handleDeletePreset = (id: string) => {
        showConfirm({
            title: "Vorlage loeschen?",
            message: "Diese Positions-Vorlage wird dauerhaft aus dem Katalog entfernt.",
            variant: "danger",
            confirmLabel: "Vorlage loeschen",
            onConfirm: () => {
                deleteService(id);
                showToast("Vorlage entfernt.", "success");
            },
        });
    };

    const handleCreateFolder = () => {
        showPrompt({
            title: "Neuer Ordner",
            message: "Wie soll der Ordner heissen?",
            placeholder: "z.B. Erdarbeiten, Rohbau, Sanierung...",
            confirmLabel: "Ordner erstellen",
            onConfirm: (name) => {
                const trimmedName = name?.trim();
                if (!trimmedName) return;
                addFolder(trimmedName)
                    .then((folder) => {
                        setSelectedFolder(folder.name);
                        showToast("Ordner erstellt.", "success");
                    })
                    .catch(() => showToast("Fehler beim Erstellen.", "error"));
            },
        });
    };

    const handleRenameFolder = (folder: ServiceFolder) => {
        showPrompt({
            title: "Ordner umbenennen",
            message: "Geben Sie einen neuen Ordnernamen ein:",
            initialValue: folder.name,
            confirmLabel: "Speichern",
            onConfirm: (name) => {
                const trimmedName = name?.trim();
                if (!trimmedName || trimmedName === folder.name) return;
                renameFolder(folder.id, trimmedName)
                    .then(() => {
                        if (selectedFolder === folder.name) setSelectedFolder(trimmedName);
                        showToast("Ordner umbenannt.", "success");
                    })
                    .catch(() => showToast("Fehler beim Umbenennen.", "error"));
            },
        });
    };

    const handleDeleteFolder = (folder: ServiceFolder) => {
        const count = folderCounts.get(folder.name) || 0;
        showConfirm({
            title: "Ordner und Positionen loeschen?",
            message: `Im Ordner "${folder.name}" befinden sich ${count} Position${count === 1 ? "" : "en"}. Wenn Sie den Ordner loeschen, werden diese Positionen ebenfalls dauerhaft geloescht.`,
            variant: "danger",
            confirmLabel: "Alles loeschen",
            onConfirm: async () => {
                try {
                    await deleteFolder(folder.id);
                    await refreshServices();
                    showToast("Ordner und enthaltene Positionen geloescht.", "success");
                } catch {
                    showToast("Fehler beim Loeschen.", "error");
                }
            },
        });
    };

    const handleMoveOrphansToSelectedFolder = () => {
        if (!selectedFolder) return;
        orphanPresets.forEach(preset => updateService(preset.id, { ...preset, folder: selectedFolder }));
        showToast(`${orphanPresets.length} Position${orphanPresets.length === 1 ? "" : "en"} zugeordnet.`, "success");
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (!over) return;

        const preset = services.find(service => service.id === active.id);
        const targetFolderName = over.data.current?.folderName as string | undefined;
        if (!preset || !targetFolderName || preset.folder === targetFolderName) return;

        updateService(preset.id, { ...preset, folder: targetFolderName });
        showToast(`Nach ${targetFolderName} verschoben.`, "success");
    };

    const openCreateModal = () => {
        if (!selectedFolder) {
            showToast("Bitte zuerst einen Ordner erstellen.", "error");
            return;
        }
        setEditingService(undefined);
        setIsModalOpen(true);
    };

    if (isServicesLoading || isFoldersLoading) {
        return (
            <div className="dashboard-page flex items-center justify-center">
                <div className="rounded-lg border border-slate-200 bg-white px-6 py-4 font-black text-slate-500 shadow-sm">
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
                                    Wiederverwendbare Positionen organisieren, verschieben und direkt in Dokumente uebernehmen.
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
                                    disabled={!selectedFolder}
                                    className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/60 disabled:hover:translate-y-0"
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

                <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
                    <aside className="space-y-4">
                        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ordner</p>
                                    <h2 className="mt-1 text-lg font-black text-slate-950">{folders.length} Bereiche</h2>
                                </div>
                                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">
                                    {assignedPresets.length} Positionen
                                </span>
                            </div>

                            {folders.length > 0 ? (
                                <div className="space-y-2">
                                    {folders.map(folder => (
                                        <FolderItem
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
                            ) : (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                                    <FolderPlus className="mx-auto h-8 w-8 text-slate-400" />
                                    <p className="mt-3 font-black text-slate-900">Erst Ordner anlegen</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">
                                        Jede Vorlage braucht einen eigenen Ordner, damit der Katalog sauber bleibt.
                                    </p>
                                    <button
                                        onClick={handleCreateFolder}
                                        className="mt-4 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                                    >
                                        Ordner erstellen
                                    </button>
                                </div>
                            )}
                        </section>

                        {orphanPresets.length > 0 && folders.length > 0 && (
                            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                                    <div>
                                        <p className="font-black text-amber-950">{orphanPresets.length} Positionen ohne Ordner</p>
                                        <p className="mt-1 text-sm font-semibold text-amber-800">
                                            Alte Eintraege koennen in den aktuell markierten Ordner verschoben werden.
                                        </p>
                                        <button
                                            onClick={handleMoveOrphansToSelectedFolder}
                                            className="mt-3 rounded-lg bg-amber-600 px-3 py-2 text-sm font-black text-white"
                                        >
                                            In diesen Ordner verschieben
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}
                    </aside>

                    <main className="space-y-4">
                        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                        {selectedFolder || "Kein Ordner ausgewaehlt"}
                                    </p>
                                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                                        {selectedFolder ? `${selectedFolderCount} Position${selectedFolderCount === 1 ? "" : "en"}` : "Ordner erstellen"}
                                    </h2>
                                </div>

                                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                                    <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                                        {[
                                            { id: "all", label: "Alle" },
                                            { id: "standard", label: "Standard" },
                                            { id: "detailed", label: "Detail" },
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => setTypeFilter(item.id as TypeFilter)}
                                                className={cn(
                                                    "rounded-md px-3 py-2 text-xs font-black transition-colors",
                                                    typeFilter === item.id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
                                                )}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {visiblePresets.length > 0 ? (
                            <div className="space-y-2">
                                {visiblePresets.map(preset => (
                                    <PresetRow
                                        key={preset.id}
                                        preset={preset}
                                        onEdit={() => {
                                            setEditingService(preset);
                                            setIsModalOpen(true);
                                        }}
                                        onDelete={() => handleDeletePreset(preset.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                                <h3 className="mt-4 text-xl font-black text-slate-950">
                                    {selectedFolder ? "Noch keine Position in diesem Ordner" : "Noch kein Ordner vorhanden"}
                                </h3>
                                <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
                                    {selectedFolder
                                        ? "Legen Sie hier die Positionen ab, die Sie beim Schreiben eines Angebots schnell wiederverwenden wollen."
                                        : "Erstellen Sie zuerst einen Ordner, danach koennen Sie Positions-Vorlagen anlegen."}
                                </p>
                                <button
                                    onClick={selectedFolder ? openCreateModal : handleCreateFolder}
                                    className="mt-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white"
                                >
                                    {selectedFolder ? "Erste Vorlage erstellen" : "Ordner erstellen"}
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
                    folders={folderOptions}
                    defaultFolder={selectedFolder}
                    mode="position"
                />
            </div>

            <DragOverlay dropAnimation={null}>
                {activeDragId && (() => {
                    const preset = services.find(service => service.id === activeDragId);
                    if (!preset) return null;
                    return (
                        <div className="w-96 rounded-lg border border-indigo-300 bg-white p-4 shadow-2xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Verschieben</p>
                            <h3 className="mt-1 truncate text-lg font-black text-slate-950">{preset.title}</h3>
                            <p className="mt-1 text-sm font-semibold text-slate-500">{formatCurrency(preset.price)} pro {preset.unit}</p>
                        </div>
                    );
                })()}
            </DragOverlay>
        </DndContext>
    );
}
