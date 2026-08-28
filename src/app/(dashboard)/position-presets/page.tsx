"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ChevronRight,
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

type FolderTreeNode = {
    folder: ServiceFolder;
    path: string;
    label: string;
    children: FolderTreeNode[];
};

const FOLDER_ORDER_STORAGE_KEY = "flowy_position_folder_order";
const FOLDER_DRAG_PREFIX = "folder:";

function formatCurrency(value?: number) {
    return (value || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function normalizeFolderPath(value?: string | null) {
    return String(value || "")
        .split("/")
        .map(part => part.trim())
        .filter(Boolean)
        .join("/");
}

function getFolderLabel(path: string) {
    const parts = normalizeFolderPath(path).split("/").filter(Boolean);
    return parts[parts.length - 1] || path;
}

function getParentPath(path: string) {
    const parts = normalizeFolderPath(path).split("/").filter(Boolean);
    return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
}

function isSameOrChildPath(path: string, parentPath: string) {
    const normalizedPath = normalizeFolderPath(path);
    const normalizedParent = normalizeFolderPath(parentPath);
    return normalizedPath === normalizedParent || normalizedPath.startsWith(`${normalizedParent}/`);
}

function getFolderDragId(path: string) {
    return `${FOLDER_DRAG_PREFIX}${normalizeFolderPath(path)}`;
}

function sortFolderPaths(paths: string[], folderOrder: string[]) {
    const orderMap = new Map(folderOrder.map((path, index) => [path, index]));
    return [...paths].sort((a, b) => {
        const aIndex = orderMap.has(a) ? orderMap.get(a)! : Number.MAX_SAFE_INTEGER;
        const bIndex = orderMap.has(b) ? orderMap.get(b)! : Number.MAX_SAFE_INTEGER;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return getFolderLabel(a).localeCompare(getFolderLabel(b), "de", { sensitivity: "base", numeric: true });
    });
}

function buildFolderTree(folders: ServiceFolder[], folderOrder: string[]) {
    const nodeMap = new Map<string, FolderTreeNode>();
    const roots: FolderTreeNode[] = [];
    const sortedPaths = sortFolderPaths(
        folders.map(folder => normalizeFolderPath(folder.name)).filter(Boolean),
        folderOrder
    );

    folders.forEach(folder => {
        const path = normalizeFolderPath(folder.name);
        if (!path) return;
        nodeMap.set(path, {
            folder: { ...folder, name: path },
            path,
            label: getFolderLabel(path),
            children: [],
        });
    });

    sortedPaths.forEach(path => {
        const node = nodeMap.get(path);
        if (!node) return;

        const parentPath = getParentPath(path);
        const parent = parentPath ? nodeMap.get(parentPath) : null;
        if (parent) {
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

function FolderItem({
    node,
    depth,
    directCount,
    totalCount,
    isSelected,
    isExpanded,
    isEditMode,
    canMoveIntoSelected,
    onClick,
    onToggle,
    onMoveIntoSelected,
    onRename,
    onDelete,
}: {
    node: FolderTreeNode;
    depth: number;
    directCount: number;
    totalCount: number;
    isSelected: boolean;
    isExpanded: boolean;
    isEditMode: boolean;
    canMoveIntoSelected: boolean;
    onClick: () => void;
    onToggle: () => void;
    onMoveIntoSelected: () => void;
    onRename: () => void;
    onDelete: () => void;
}) {
    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
        id: node.path,
        data: { type: "folder", folderName: node.path },
    });
    const {
        attributes,
        listeners,
        setNodeRef: setDraggableNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: getFolderDragId(node.path),
        disabled: !isEditMode,
        data: { type: "folder-order", folderPath: node.path },
    });
    const hasChildren = node.children.length > 0;
    const dragStyle = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined;

    return (
        <div
            ref={(element) => {
                setDroppableNodeRef(element);
                setDraggableNodeRef(element);
            }}
            {...(isEditMode ? listeners : {})}
            {...(isEditMode ? attributes : {})}
            onClick={onClick}
            style={{
                marginLeft: depth ? `${Math.min(depth * 18, 72)}px` : undefined,
                ...dragStyle,
            }}
            className={cn(
                "group rounded-xl border px-3 py-3 transition-all",
                isEditMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                isDragging && "relative z-20 opacity-60 ring-2 ring-indigo-300",
                isSelected
                    ? "border-white/20 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white shadow-lg shadow-indigo-950/15"
                    : isOver
                        ? "border-dashed border-indigo-400 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/10"
                        : "border-slate-200 bg-white/90 text-slate-700 hover:border-indigo-200 hover:bg-white hover:shadow-sm"
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    {isEditMode && (
                        <div
                            onClick={(event) => event.stopPropagation()}
                            className={cn(
                                "hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex",
                                isSelected ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-400"
                            )}
                            title="Ordner ziehen"
                        >
                            <GripVertical className="h-4 w-4" />
                        </div>
                    )}
                    <button
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => { event.stopPropagation(); onToggle(); }}
                        className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                            hasChildren ? (isSelected ? "text-white/70 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700") : "pointer-events-none opacity-0"
                        )}
                        title={isExpanded ? "Ordner einklappen" : "Ordner aufklappen"}
                    >
                        <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                    </button>
                    <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isSelected ? "bg-white/12 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                        {isSelected || isOver || isExpanded ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black">{node.label}</p>
                        <p className={cn("text-xs font-semibold", isSelected ? "text-white/60" : "text-slate-400")}>
                            {directCount} direkt{node.children.length > 0 ? ` · ${node.children.length} Unterordner` : ""}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <span className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-black",
                        isSelected ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-500"
                    )}>
                        {totalCount}
                    </span>
                </div>
            </div>

            {isEditMode && (
                <div
                    className={cn(
                        "mt-3 flex flex-wrap items-center justify-end gap-2 border-t pt-3 text-xs font-black",
                        isSelected ? "border-white/10" : "border-slate-100"
                    )}
                >
                <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); onMoveIntoSelected(); }}
                    onPointerDown={(event) => event.stopPropagation()}
                    disabled={!canMoveIntoSelected}
                    className={cn(
                        "rounded-lg px-3 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-35",
                        isSelected ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                    )}
                >
                    Verschieben
                </button>
                <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); onRename(); }}
                    onPointerDown={(event) => event.stopPropagation()}
                    className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                        isSelected ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                    )}
                    title="Umbenennen"
                >
                    <Edit2 className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); onDelete(); }}
                    onPointerDown={(event) => event.stopPropagation()}
                    className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                        isSelected ? "bg-white/10 text-white hover:bg-white/15" : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    )}
                    title="Loeschen"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
                </div>
            )}
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
            onDoubleClick={onEdit}
            className={cn(
                "group grid cursor-grab gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md active:cursor-grabbing lg:grid-cols-[28px_minmax(0,1fr)_132px_120px_96px]",
                isDragging && "opacity-30 ring-2 ring-indigo-300"
            )}
            title="Doppelklick zum Bearbeiten, ziehen zum Verschieben"
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
                <h3 className="line-clamp-2 text-base font-black leading-snug text-slate-950">{preset.title}</h3>
                {preset.nickname && (
                    <p className="mt-1 inline-flex rounded-md bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
                        {preset.nickname}
                    </p>
                )}
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-500">
                    {preset.description || "Keine Beschreibung hinterlegt."}
                </p>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 lg:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preis</p>
                <p className="mt-0.5 font-mono text-base font-black text-slate-900">{formatCurrency(preset.price)}</p>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 lg:block">
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
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [isFolderEditMode, setIsFolderEditMode] = useState(false);
    const [folderOrder, setFolderOrder] = useState<string[]>([]);
    const [folderOrderLoaded, setFolderOrderLoaded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const folderPaths = useMemo(() => folders.map(folder => normalizeFolderPath(folder.name)).filter(Boolean), [folders]);
    const folderNames = useMemo(() => new Set(folderPaths), [folderPaths]);
    const folderOptions = useMemo(() => sortFolderPaths(folderPaths, folderOrder), [folderPaths, folderOrder]);
    const folderTree = useMemo(() => buildFolderTree(folders, folderOrder), [folders, folderOrder]);
    const sortedFolders = useMemo(
        () => [...folders].sort((a, b) => normalizeFolderPath(a.name).localeCompare(normalizeFolderPath(b.name), "de", { sensitivity: "base", numeric: true })),
        [folders]
    );
    const allPositionPresets = useMemo(() => services.filter(service => service.category === "Position"), [services]);
    const assignedPresets = useMemo(
        () => allPositionPresets.filter(preset => Boolean(preset.folder) && folderNames.has(normalizeFolderPath(preset.folder))),
        [allPositionPresets, folderNames]
    );
    const orphanPresets = useMemo(
        () => allPositionPresets.filter(preset => !preset.folder || !folderNames.has(normalizeFolderPath(preset.folder))),
        [allPositionPresets, folderNames]
    );

    useEffect(() => {
        if (folders.length === 0) {
            setSelectedFolder(null);
            return;
        }
        if (!selectedFolder || !folders.some(folder => normalizeFolderPath(folder.name) === selectedFolder)) {
            setSelectedFolder(normalizeFolderPath(sortedFolders[0]?.name || folders[0].name));
        }
    }, [folders, selectedFolder, sortedFolders]);

    useEffect(() => {
        try {
            const storedOrder = window.localStorage.getItem(FOLDER_ORDER_STORAGE_KEY);
            if (storedOrder) {
                const parsed = JSON.parse(storedOrder);
                if (Array.isArray(parsed)) {
                    setFolderOrder(parsed.map(path => normalizeFolderPath(path)).filter(Boolean));
                }
            }
        } catch { }
        setFolderOrderLoaded(true);
    }, []);

    useEffect(() => {
        if (!folderOrderLoaded) return;
        setFolderOrder(prev => {
            const existing = prev.filter(path => folderPaths.includes(path));
            const missing = folderPaths.filter(path => !existing.includes(path));
            const next = [...existing, ...missing];
            return next.length === prev.length && next.every((path, index) => path === prev[index]) ? prev : next;
        });
    }, [folderPaths, folderOrderLoaded]);

    useEffect(() => {
        if (!folderOrderLoaded) return;
        try {
            window.localStorage.setItem(FOLDER_ORDER_STORAGE_KEY, JSON.stringify(folderOrder));
        } catch { }
    }, [folderOrder, folderOrderLoaded]);

    const folderCounts = useMemo(() => {
        const counts = new Map<string, number>();
        assignedPresets.forEach(preset => {
            const folderPath = normalizeFolderPath(preset.folder);
            if (folderPath) counts.set(folderPath, (counts.get(folderPath) || 0) + 1);
        });
        return counts;
    }, [assignedPresets]);

    const subtreeFolderCounts = useMemo(() => {
        const counts = new Map<string, number>();
        folders.forEach(folder => {
            const folderPath = normalizeFolderPath(folder.name);
            const count = assignedPresets.filter(preset => isSameOrChildPath(preset.folder || "", folderPath)).length;
            counts.set(folderPath, count);
        });
        return counts;
    }, [assignedPresets, folders]);

    const visiblePresets = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!selectedFolder) return [];

        return assignedPresets
            .filter(preset => {
                const matchesFolder = normalizeFolderPath(preset.folder) === selectedFolder;
                const matchesType = typeFilter === "all" || (preset.itemType || "standard") === typeFilter;
                const matchesSearch =
                    !query ||
                    preset.title.toLowerCase().includes(query) ||
                    (preset.nickname || "").toLowerCase().includes(query) ||
                    (preset.description || "").toLowerCase().includes(query) ||
                    (preset.folder || "").toLowerCase().includes(query) ||
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

    const handleCreateFolder = (parentName?: string | null) => {
        const parentPath = normalizeFolderPath(parentName);
        showPrompt({
            title: parentPath ? "Neuer Unterordner" : "Neuer Ordner",
            message: parentPath ? `Unterordner in "${getFolderLabel(parentPath)}" erstellen:` : "Wie soll der Ordner heissen?",
            placeholder: parentPath ? "z.B. EG, OG, Keller..." : "z.B. Erdarbeiten, Rohbau, Sanierung...",
            confirmLabel: "Ordner erstellen",
            onConfirm: (name) => {
                const trimmedName = name?.trim();
                if (!trimmedName) return;
                addFolder(trimmedName, parentPath || null)
                    .then((folder) => {
                        const nextPath = normalizeFolderPath(folder.name);
                        if (parentPath) {
                            setExpandedFolders(prev => ({ ...prev, [parentPath]: true }));
                        }
                        setFolderOrder(prev => prev.includes(nextPath) ? prev : [...prev, nextPath]);
                        setSelectedFolder(nextPath);
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
            initialValue: getFolderLabel(folder.name),
            confirmLabel: "Speichern",
            onConfirm: (name) => {
                const trimmedName = name?.trim();
                const currentPath = normalizeFolderPath(folder.name);
                const currentLabel = getFolderLabel(currentPath);
                if (!trimmedName || trimmedName === currentLabel) return;
                renameFolder(folder.id, trimmedName)
                    .then(() => {
                        const parentPath = currentPath.includes("/") ? currentPath.split("/").slice(0, -1).join("/") : "";
                        const nextPath = normalizeFolderPath(parentPath ? `${parentPath}/${trimmedName}` : trimmedName);
                        if (selectedFolder && isSameOrChildPath(selectedFolder, currentPath)) {
                            setSelectedFolder(normalizeFolderPath(`${nextPath}${selectedFolder.slice(currentPath.length)}`));
                        }
                        setExpandedFolders(prev => {
                            const next = { ...prev };
                            Object.entries(prev).forEach(([path, expanded]) => {
                                if (isSameOrChildPath(path, currentPath)) {
                                    delete next[path];
                                    next[normalizeFolderPath(`${nextPath}${path.slice(currentPath.length)}`)] = expanded;
                                }
                            });
                            return next;
                        });
                        setFolderOrder(prev => prev.map(path =>
                            isSameOrChildPath(path, currentPath)
                                ? normalizeFolderPath(`${nextPath}${path.slice(currentPath.length)}`)
                                : path
                        ));
                        showToast("Ordner umbenannt.", "success");
                    })
                    .catch(() => showToast("Fehler beim Umbenennen.", "error"));
            },
        });
    };

    const handleDeleteFolder = (folder: ServiceFolder) => {
        const count = folderCounts.get(normalizeFolderPath(folder.name)) || 0;
        const totalCount = subtreeFolderCounts.get(normalizeFolderPath(folder.name)) || count;
        showConfirm({
            title: "Ordner und Positionen loeschen?",
            message: `Im Ordner "${folder.name}" befinden sich inklusive Unterordner ${totalCount} Position${totalCount === 1 ? "" : "en"}. Wenn Sie den Ordner loeschen, werden Unterordner und Positionen ebenfalls dauerhaft geloescht.`,
            variant: "danger",
            confirmLabel: "Alles loeschen",
            onConfirm: async () => {
                try {
                    await deleteFolder(folder.id);
                    await refreshServices();
                    if (selectedFolder && isSameOrChildPath(selectedFolder, normalizeFolderPath(folder.name))) {
                        setSelectedFolder(null);
                    }
                    setFolderOrder(prev => prev.filter(path => !isSameOrChildPath(path, normalizeFolderPath(folder.name))));
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

    const handleMoveFolderIntoSelected = (folder: ServiceFolder) => {
        if (!selectedFolder) return;
        const currentPath = normalizeFolderPath(folder.name);
        if (!currentPath || currentPath === selectedFolder || isSameOrChildPath(selectedFolder, currentPath)) {
            showToast("Dieser Ordner kann nicht in sich selbst verschoben werden.", "error");
            return;
        }

        const nextPath = normalizeFolderPath(`${selectedFolder}/${getFolderLabel(currentPath)}`);
        renameFolder(folder.id, nextPath)
            .then(() => {
                setExpandedFolders(prev => ({ ...prev, [selectedFolder]: true }));
                setFolderOrder(prev => prev.map(path =>
                    isSameOrChildPath(path, currentPath)
                        ? normalizeFolderPath(`${nextPath}${path.slice(currentPath.length)}`)
                        : path
                ));
                setSelectedFolder(nextPath);
                showToast("Ordner verschoben.", "success");
            })
            .catch(() => showToast("Ordner konnte nicht verschoben werden.", "error"));
    };

    const handleMoveFolderInOrder = (path: string, targetPath: string, placement: "before" | "after") => {
        const parentPath = getParentPath(targetPath);
        const siblingPaths = sortFolderPaths(
            folderPaths.filter(folderPath => getParentPath(folderPath) === parentPath),
            folderOrder
        );
        if (path === targetPath || getParentPath(path) !== parentPath) return;

        const nextSiblingPaths = siblingPaths.filter(folderPath => folderPath !== path);
        const targetIndex = nextSiblingPaths.indexOf(targetPath);
        if (targetIndex < 0) return;
        const insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
        nextSiblingPaths.splice(Math.min(insertIndex, nextSiblingPaths.length), 0, path);
        const siblingSet = new Set(nextSiblingPaths);

        setFolderOrder(prev => {
            const currentOrder = [
                ...prev.filter(existingPath => folderPaths.includes(existingPath)),
                ...folderPaths.filter(folderPath => !prev.includes(folderPath)),
            ];
            const nextOrder: string[] = [];
            let inserted = false;

            currentOrder.forEach(folderPath => {
                if (siblingSet.has(folderPath)) {
                    if (!inserted) {
                        nextOrder.push(...nextSiblingPaths);
                        inserted = true;
                    }
                    return;
                }
                nextOrder.push(folderPath);
            });

            return inserted ? nextOrder : [...nextOrder, ...nextSiblingPaths];
        });
    };

    const toggleFolder = (folderPath: string) => {
        setExpandedFolders(prev => ({ ...prev, [folderPath]: prev[folderPath] === false ? true : false }));
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (!over) return;

        if (active.data.current?.type === "folder-order") {
            const draggedPath = normalizeFolderPath(active.data.current.folderPath as string);
            const targetPath = normalizeFolderPath(over.data.current?.folderName as string | undefined);
            if (!draggedPath || !targetPath || draggedPath === targetPath) return;
            if (isSameOrChildPath(targetPath, draggedPath)) {
                showToast("Dieser Ordner kann nicht in sich selbst verschoben werden.", "error");
                return;
            }

            const draggedFolder = folders.find(folder => normalizeFolderPath(folder.name) === draggedPath);
            if (!draggedFolder) return;

            if (getParentPath(draggedPath) === getParentPath(targetPath)) {
                const activeRect = active.rect.current.translated || active.rect.current.initial;
                const overRect = over.rect;
                const activeCenter = activeRect ? activeRect.top + activeRect.height / 2 : 0;
                const overCenter = overRect ? overRect.top + overRect.height / 2 : 0;
                handleMoveFolderInOrder(draggedPath, targetPath, activeCenter > overCenter ? "after" : "before");
                showToast("Ordner neu sortiert.", "success");
                return;
            }

            const nextPath = normalizeFolderPath(`${targetPath}/${getFolderLabel(draggedPath)}`);
            try {
                await renameFolder(draggedFolder.id, nextPath);
                setExpandedFolders(prev => ({ ...prev, [targetPath]: true }));
                setFolderOrder(prev => prev.map(path =>
                    isSameOrChildPath(path, draggedPath)
                        ? normalizeFolderPath(`${nextPath}${path.slice(draggedPath.length)}`)
                        : path
                ));
                setSelectedFolder(nextPath);
                showToast("Ordner verschoben.", "success");
            } catch {
                showToast("Ordner konnte nicht verschoben werden.", "error");
            }
            return;
        }

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

    const renderFolderNodes = (nodes: FolderTreeNode[], depth = 0): React.ReactNode[] => {
        return nodes.flatMap(node => {
            const directCount = folderCounts.get(node.path) || 0;
            const totalCount = subtreeFolderCounts.get(node.path) || directCount;
            const isExpanded = expandedFolders[node.path] !== false;
            const canMoveIntoSelected = !!selectedFolder && selectedFolder !== node.path && !isSameOrChildPath(selectedFolder, node.path);
            return [
                <FolderItem
                    key={node.path}
                    node={node}
                    depth={depth}
                    directCount={directCount}
                    totalCount={totalCount}
                    isSelected={selectedFolder === node.path}
                    isExpanded={isExpanded}
                    isEditMode={isFolderEditMode}
                    canMoveIntoSelected={canMoveIntoSelected}
                    onClick={() => {
                        setSelectedFolder(node.path);
                        if (node.children.length > 0) {
                            setExpandedFolders(prev => ({ ...prev, [node.path]: prev[node.path] === false ? true : prev[node.path] ?? true }));
                        }
                    }}
                    onToggle={() => toggleFolder(node.path)}
                    onMoveIntoSelected={() => handleMoveFolderIntoSelected(node.folder)}
                    onRename={() => handleRenameFolder(node.folder)}
                    onDelete={() => handleDeleteFolder(node.folder)}
                />,
                ...(isExpanded ? renderFolderNodes(node.children, depth + 1) : []),
            ];
        });
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
                                    onClick={() => handleCreateFolder()}
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

                <div className="grid gap-5 xl:grid-cols-[500px_1fr]">
                    <aside className="space-y-4">
                        <section className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ordner</p>
                                    <h2 className="mt-1 text-lg font-black text-slate-950">{folders.length} Bereiche</h2>
                                </div>
                                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">
                                    {assignedPresets.length} Positionen
                                </span>
                            </div>

                            <label className="mb-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <div>
                                    <p className="text-sm font-black text-slate-800">Ordner bearbeiten</p>
                                    <p className="text-xs font-semibold text-slate-400">Anordnen, verschieben, umbenennen und löschen.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isFolderEditMode}
                                    onChange={(event) => setIsFolderEditMode(event.target.checked)}
                                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </label>

                            {folders.length > 0 ? (
                                <div className="space-y-2">
                                    {renderFolderNodes(folderTree)}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                                    <FolderPlus className="mx-auto h-8 w-8 text-slate-400" />
                                    <p className="mt-3 font-black text-slate-900">Erst Ordner anlegen</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">
                                        Jede Vorlage braucht einen eigenen Ordner, damit der Katalog sauber bleibt.
                                    </p>
                                    <button
                                        onClick={() => handleCreateFolder()}
                                        className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                                    >
                                        Ordner erstellen
                                    </button>
                                </div>
                            )}
                        </section>

                        {orphanPresets.length > 0 && folders.length > 0 && (
                            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                                    <div>
                                        <p className="font-black text-amber-950">{orphanPresets.length} Positionen ohne Ordner</p>
                                        <p className="mt-1 text-sm font-semibold text-amber-800">
                                            Alte Eintraege koennen in den aktuell markierten Ordner verschoben werden.
                                        </p>
                                        <button
                                            onClick={handleMoveOrphansToSelectedFolder}
                                            className="mt-3 rounded-xl bg-amber-600 px-3 py-2 text-sm font-black text-white"
                                        >
                                            In diesen Ordner verschieben
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}
                    </aside>

                    <main className="space-y-4">
                        <section className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur">
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

                            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                                <button
                                    onClick={() => selectedFolder && handleCreateFolder(selectedFolder)}
                                    disabled={!selectedFolder}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:translate-y-0"
                                >
                                    <FolderPlus className="h-4 w-4" />
                                    Unterordner anlegen
                                </button>
                                <button
                                    onClick={openCreateModal}
                                    disabled={!selectedFolder}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:translate-y-0"
                                >
                                    <Plus className="h-4 w-4" />
                                    Vorlage im Ordner anlegen
                                </button>
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
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/85 px-6 py-16 text-center shadow-sm backdrop-blur">
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
                                    onClick={selectedFolder ? openCreateModal : () => handleCreateFolder()}
                                    className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
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
                    if (activeDragId.startsWith(FOLDER_DRAG_PREFIX)) {
                        const folderPath = activeDragId.slice(FOLDER_DRAG_PREFIX.length);
                        return (
                            <div className="w-80 rounded-xl border border-indigo-300 bg-white p-4 shadow-2xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Ordner verschieben</p>
                                <div className="mt-2 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                        <FolderOpen className="h-5 w-5" />
                                    </div>
                                    <h3 className="truncate text-lg font-black text-slate-950">{getFolderLabel(folderPath)}</h3>
                                </div>
                            </div>
                        );
                    }
                    const preset = services.find(service => service.id === activeDragId);
                    if (!preset) return null;
                    return (
                        <div className="w-96 rounded-xl border border-indigo-300 bg-white p-4 shadow-2xl">
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
