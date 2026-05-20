"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Calculator,
  ArrowLeft,
  Book,
  Loader2,
  AlignLeft,
  GripVertical,
  Bookmark,
} from "lucide-react";
import { useNotification } from "@/context/NotificationContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { cn } from "@/lib/utils";
import { Offer, OfferItem, OfferStatus } from "@/types/offer";
import { useCustomers } from "@/hooks/useCustomers";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useOffers } from "@/hooks/useOffers";
import { useOfferSettings } from "@/hooks/useOfferSettings";
import { useServices } from "@/hooks/useServices";
import { useProjects } from "@/hooks/useProjects";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/DatePicker";
import { CustomerModal } from "@/components/CustomerModal";
import { Customer } from "@/types/customer";
import { CustomerSearchSelect } from "@/components/CustomerSearchSelect";
import { ServiceSelectionModal } from "@/components/ServiceSelectionModal";
import { ServiceModal } from "@/components/ServiceModal";
import { Service } from "@/types/service";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";

interface OfferFormProps {
  initialData?: Partial<Offer>;
}

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50")}
    >
      {children}
    </div>
  );
}

function DragHandle({ id }: { id: string }) {
  const { listeners, attributes } = useSortable({ id });
  return (
    <div
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing p-2 text-slate-300 hover:text-indigo-500 transition-colors"
    >
      <GripVertical className="h-5 w-5" />
    </div>
  );
}

export function OfferForm({ initialData }: OfferFormProps) {
  const router = useRouter();
  const {
    customers,
    isLoading: isCustomersLoading,
    addCustomer,
  } = useCustomers();
  const { data: companySettings, isLoading: isCompanyLoading } =
    useCompanySettings();
  const { data: invoiceSettings } = useInvoiceSettings();
  const {
    data: offerSettings,
    updateData: updateOfferSettings,
    isLoading: isOfferSettingsLoading,
  } = useOfferSettings();
  const {
    addOffer,
    updateOffer,
    offers,
    isLoading: isOffersLoading,
  } = useOffers();
  const { services, addService } = useServices();
  const { projects, isLoading: isProjectsLoading } = useProjects();

  // Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [activeServiceItemId, setActiveServiceItemId] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPresetIds, setSavedPresetIds] = useState<string[]>([]);
  const { showToast } = useNotification();

  const isLoading =
    isCustomersLoading ||
    isCompanyLoading ||
    isOfferSettingsLoading ||
    isOffersLoading ||
    isProjectsLoading;

  // Form State
  const [offerNumber, setOfferNumber] = useState(
    initialData?.offerNumber || "",
  );
  const [subjectExtra, setSubjectExtra] = useState(
    initialData?.subjectExtra || "",
  );
  const [constructionProject, setConstructionProject] = useState(
    initialData?.constructionProject || "",
  );
  const [issueDate, setIssueDate] = useState(
    initialData?.issueDate || new Date().toISOString().split("T")[0],
  );
  const [validUntil, setValidUntil] = useState(initialData?.validUntil || "");
  const [customerId, setCustomerId] = useState(initialData?.customerId || "");
  const [projectId, setProjectId] = useState(initialData?.projectId || "");
  const [processor, setProcessor] = useState(initialData?.processor || "");
  const [introText, setIntroText] = useState(initialData?.introText || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [items, setItems] = useState<OfferItem[]>(
    initialData?.items || [
      {
        id: "1",
        itemType: "standard",
        title: "",
        description: "",
        quantity: 1,
        unit: "Stk",
        pricePerUnit: 0,
        totalPrice: 0,
      },
    ],
  );

  // Load defaults from settings (only for new offers)
  useEffect(() => {
    if (initialData || settingsLoaded || isOfferSettingsLoading) return;
    setSettingsLoaded(true);
    const year = new Date().getFullYear();
    const next = String(offerSettings.nextOfferNumber).padStart(2, "0");
    setOfferNumber(`${year}/A-${next}`);
    setIntroText(offerSettings.defaultIntroText);
  }, [isOfferSettingsLoading, offerSettings, initialData, settingsLoaded]);

  // Set default processor from company settings
  useEffect(() => {
    if (!initialData && !isCompanyLoading && companySettings) {
      setProcessor((prev) => {
        if (prev) return prev;
        return `${companySettings.ceoFirstName} ${companySettings.ceoLastName}`.trim();
      });
    }
  }, [isCompanyLoading, companySettings, initialData]);

  // Calculations
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.totalPrice, 0),
    [items],
  );

  const isReverseCharge = useMemo(() => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.type === "business" && !!customer?.reverseChargeEnabled;
  }, [customerId, customers]);

  const getSalutation = () => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return "Sehr geehrte Damen und Herren,";
    if (customer.type === "business") return "Sehr geehrte Damen und Herren,";
    const lastName = customer.name?.split(" ").pop() || "";
    if (customer.salutation === "Frau") return `Sehr geehrte Frau ${lastName},`;
    if (customer.salutation === "Herr")
      return `Sehr geehrter Herr ${lastName},`;
    return "Sehr geehrte Damen und Herren,";
  };

  const taxAmount = useMemo(() => {
    if (isReverseCharge) return 0;
    const rate = invoiceSettings?.defaultTaxRate || 20;
    return Number((subtotal * (rate / 100)).toFixed(2));
  }, [subtotal, invoiceSettings, isReverseCharge]);

  const totalAmount = useMemo(
    () => Number((subtotal + taxAmount).toFixed(2)),
    [subtotal, taxAmount],
  );

  // Item handlers
  const calculateItemTotal = (qty: number, price: number) =>
    Number((qty * price).toFixed(2));

  const newStandardItem = (): OfferItem => ({
    id: Math.random().toString(36).substring(2, 11),
    itemType: "standard",
    title: "",
    description: "",
    quantity: 1,
    unit: "Stk",
    pricePerUnit: 0,
    totalPrice: 0,
  });

  const newTitleItem = (): OfferItem => ({
    id: Math.random().toString(36).substring(2, 11),
    itemType: "title",
    title: "",
    description: "",
    quantity: 0,
    unit: "Stk",
    pricePerUnit: 0,
    totalPrice: 0,
  });

  const newDetailedItem = (): OfferItem => ({
    id: Math.random().toString(36).substring(2, 11),
    itemType: "detailed",
    title: "",
    description: "",
    quantity: 1,
    unit: "Stk",
    pricePerUnit: 0,
    totalPrice: 0,
  });

  const addStandardItem = () =>
    setItems((prev) => [...prev, newStandardItem()]);
  const addTitleItem = () => setItems((prev) => [...prev, newTitleItem()]);
  const addDetailedItem = () =>
    setItems((prev) => [...prev, newDetailedItem()]);

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== id));
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const updateItem = (id: string, field: keyof OfferItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "pricePerUnit") {
          updated.totalPrice = calculateItemTotal(
            field === "quantity" ? Number(value) : item.quantity,
            field === "pricePerUnit" ? Number(value) : item.pricePerUnit,
          );
        }
        return updated;
      }),
    );
  };

  const batchUpdateItem = (id: string, updates: Partial<OfferItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if ("quantity" in updates || "pricePerUnit" in updates) {
          updated.totalPrice = calculateItemTotal(
            updated.quantity,
            updated.pricePerUnit,
          );
        }
        return updated;
      }),
    );
  };

  const handleSave = async (status: OfferStatus) => {
    setError(null);

    if (!customerId) {
      setError("Bitte wählen Sie einen Kunden aus.");
      return;
    }
    if (subtotal <= 0) {
      setError(
        "Das Angebot muss mindestens eine Position mit einem Betrag größer als 0€ enthalten.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const customer = customers.find((c) => c.id === customerId);
      const offerData: Offer = {
        id: initialData?.id || Math.random().toString(36).substring(2, 11),
        offerNumber,
        subjectExtra,
        constructionProject,
        issueDate,
        validUntil: validUntil || undefined,
        customerId,
        customerName: customer?.name || "Unbekannter Kunde",
        processor,
        introText: introText || undefined,
        items,
        subtotal,
        taxRate: isReverseCharge ? 0 : invoiceSettings?.defaultTaxRate || 20,
        taxAmount,
        totalAmount,
        isReverseCharge,
        status,
        projectId: projectId || undefined,
        notes: notes || undefined,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pdfUrl: initialData?.pdfUrl,
      };

      if (initialData?.id) {
        await updateOffer(initialData.id, offerData);
      } else {
        await addOffer(offerData);
        // Increment next offer number in settings
        await updateOfferSettings({
          nextOfferNumber: offerSettings.nextOfferNumber + 1,
        });
      }

      router.push("/offers");
    } catch (e) {
      console.error("Failed to save offer", e);
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNewCustomer = (newCustomer: Customer) => {
    addCustomer(newCustomer);
    setCustomerId(newCustomer.id);
    setIsCustomerModalOpen(false);
  };

  const handleServiceSelect = (service: Service) => {
    if (activeServiceItemId) {
      const item = items.find((i) => i.id === activeServiceItemId);
      const isPosition = service.category === "Position";

      batchUpdateItem(activeServiceItemId, {
        ...(isPosition
          ? {
              title: service.title,
              description: service.description || "",
              itemType: service.itemType || "standard",
            }
          : item?.itemType === "standard"
            ? { description: service.title }
            : { title: service.title }),
        pricePerUnit: service.price,
        unit: service.unit as any,
      });
      setActiveServiceItemId(null);
    }
  };

  const inputClasses =
    "w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium";
  const labelClasses = "block text-sm font-bold text-slate-700 mb-2 ml-1";
  const sectionTitleClasses =
    "text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3";

  const handleSaveAsPreset = (item: OfferItem) => {
    if (!item.title && !item.description) {
      showToast("Bitte Titel oder Beschreibung eingeben.", "error");
      return;
    }
    
    addService({
      id: Math.random().toString(36).substr(2, 9),
      userId: "", // Will be set by hook
      title: item.title || item.description,
      description: item.title ? item.description : "",
      unit: item.unit as any,
      price: item.pricePerUnit,
      category: 'Position',
      itemType: item.itemType === 'detailed' ? 'detailed' : 'standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    showToast("Position als Vorlage gespeichert!", "success");
    
    setSavedPresetIds(prev => [...prev, item.id]);
    setTimeout(() => {
      setSavedPresetIds(prev => prev.filter(id => id !== item.id));
    }, 2000);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
        <div className="text-slate-500 font-bold text-xl">Laden...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">
          <ArrowLeft
            className="h-4 w-4 cursor-pointer hover:text-indigo-600 transition-colors"
            onClick={() => router.back()}
          />
          Angebotserstellung
        </div>
        <h1 className="text-3xl xl:text-5xl font-black text-slate-900 tracking-tight font-outfit">
          {initialData?.id ? "Angebot bearbeiten" : "Neues Angebot"}
        </h1>
        <p className="text-slate-500 font-medium">
          Erstellen Sie ein neues Angebot für Ihre Kunden
        </p>
      </div>

      <div className="glass-card p-6 xl:p-12 space-y-8 xl:space-y-12">
        {/* ── Section 1: Kopfdaten ── */}
        <div className="space-y-6 xl:space-y-8">
          <h2 className={sectionTitleClasses}>
            <div className="h-8 xl:h-10 w-8 xl:w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
              <Calculator className="h-4 xl:h-5 w-4 xl:w-5 text-indigo-600" />
            </div>
            Angebotsdaten
          </h2>

          <div className="grid grid-cols-2 gap-6 xl:gap-8">
            <div>
              <label className={labelClasses}>Angebotsnummer</label>
              <input
                type="text"
                value={offerNumber}
                onChange={(e) => setOfferNumber(e.target.value)}
                className={inputClasses}
                placeholder="z.B. 2026/A-01"
              />
            </div>
            <div>
              <label className={labelClasses}>Zusatz zum Betreff</label>
              <input
                type="text"
                value={subjectExtra}
                onChange={(e) => setSubjectExtra(e.target.value)}
                className={inputClasses}
                placeholder="z.B. Sanierungsarbeiten Dach"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 xl:gap-8">
            <div>
              <label className={labelClasses}>Projekt (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setProjectId(pid);
                  const proj = projects.find((p) => p.id === pid);
                  if (proj) {
                    setCustomerId(proj.customerId);
                    const addressParts = [
                      proj.address?.street,
                      proj.address?.city,
                    ]
                      .filter(Boolean)
                      .join(", ");
                    setConstructionProject(
                      addressParts
                        ? `${proj.name} - ${addressParts}`
                        : proj.name,
                    );
                  }
                }}
                className={cn(
                  inputClasses,
                  "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.25rem_center] bg-no-repeat",
                )}
              >
                <option value="">Kein Projekt ausgewählt</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Bauvorhaben</label>
              <input
                type="text"
                value={constructionProject}
                onChange={(e) => setConstructionProject(e.target.value)}
                className={inputClasses}
                placeholder="Projektname / Ort"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 xl:gap-8">
            <div>
              <label className={labelClasses}>Angebotsdatum</label>
              <DatePicker
                value={issueDate}
                onChange={setIssueDate}
                placeholder="Datum wählen"
              />
            </div>
            <div>
              <label className={labelClasses}>Gültig bis</label>
              <DatePicker
                value={validUntil}
                onChange={setValidUntil}
                placeholder="Ablaufdatum wählen"
              />
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* ── Section 2: Kundendaten ── */}
        <div className="space-y-8">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">
            Kundendaten
          </h3>
          <div className="space-y-4">
            <label className={labelClasses}>
              Kunde auswählen <span className="text-rose-500">*</span>
            </label>
            <CustomerSearchSelect
              customers={customers}
              selectedId={customerId}
              onSelect={setCustomerId}
              onAddNew={() => setIsCustomerModalOpen(true)}
            />
          </div>
          <div>
            <label className={labelClasses}>Bearbeiter</label>
            <input
              type="text"
              value={processor}
              onChange={(e) => setProcessor(e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* ── Section 3: Einleitungstext ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                <AlignLeft className="h-4 w-4 text-indigo-600" />
              </div>
              Einleitungstext
            </h3>
            <button
              type="button"
              onClick={() => setIntroText(offerSettings.defaultIntroText)}
              className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Standard-Text wiederherstellen
            </button>
          </div>
          <p className="text-xs text-slate-400 font-medium ml-1">
            Dieser Text erscheint im PDF zwischen dem Kopfblock und den
            Angebotspositionen.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            {customerId ? (
              <div className="text-sm font-medium text-slate-900 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm inline-block">
                {getSalutation()}
              </div>
            ) : (
              <div className="text-sm font-medium text-slate-400 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm inline-block italic">
                Anrede wird nach Kundenauswahl automatisch generiert...
              </div>
            )}
            <textarea
              rows={5}
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              className={cn(inputClasses, "resize-y")}
              placeholder="vielen Dank für Ihre Anfrage..."
            />
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* ── Section 4: Positionen ── */}
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Angebotspositionen
            </h3>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                type="button"
                onClick={addTitleItem}
                className="px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm transition-all flex items-center gap-1.5"
              >
                <AlignLeft className="h-3.5 w-3.5" /> Titel
              </button>
              <div className="w-px h-4 bg-slate-200" />
              <button
                type="button"
                onClick={addStandardItem}
                className="px-3 py-2 rounded-lg text-xs font-bold text-indigo-600 hover:bg-white hover:shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Position
              </button>
              <div className="w-px h-4 bg-slate-200" />
              <button
                type="button"
                onClick={addDetailedItem}
                className="px-3 py-2 rounded-lg text-xs font-bold text-indigo-600 hover:bg-white hover:shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Detail-Pos.
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {(() => {
                  let posCounter = 0;
                  return items.map((item, idx) => {
                    const type =
                      item.itemType ??
                      ((item as any).isTitleOnly ? "title" : "standard");
                    if (type !== "title") posCounter++;
                    const pos = posCounter;
                    return (
                      <SortableItem key={item.id} id={item.id}>
                        <div
                          className={cn(
                            "rounded-2xl border transition-colors bg-white",
                            type === "title"
                              ? "bg-slate-50 border-slate-200"
                              : "border-slate-100 hover:border-slate-200",
                          )}
                        >
                          <div className="flex items-start gap-3 p-3">
                            <div className="flex items-center self-stretch mr-1">
                              <DragHandle id={item.id} />
                            </div>
                            <span className="mt-3.5 w-6 text-center text-xs font-black text-slate-400 shrink-0">
                              {type === "title" ? "—" : pos}
                            </span>
                            <div className="flex-1 min-w-0">
                              {type === "title" && (
                                <input
                                  type="text"
                                  value={item.title || ""}
                                  onChange={(e) =>
                                    updateItem(item.id, "title", e.target.value)
                                  }
                                  className={cn(
                                    inputClasses,
                                    "py-3 px-4 border-slate-100 font-bold bg-slate-100/60 text-slate-800",
                                  )}
                                  placeholder="Überschrift / Kapitel"
                                />
                              )}
                              {type === "standard" && (
                                <div className="flex items-start gap-2">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) =>
                                      updateItem(
                                        item.id,
                                        "description",
                                        e.target.value,
                                      )
                                    }
                                    className={cn(
                                      inputClasses,
                                      "py-3 px-4 border-slate-100",
                                    )}
                                    placeholder="Positionsbeschreibung"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveServiceItemId(item.id)
                                    }
                                    className="mt-0.5 h-11 w-11 shrink-0 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-100"
                                    title="Aus Vorlage wählen"
                                  >
                                    <Book className="h-5 w-5" />
                                  </button>
                                </div>
                              )}
                              {type === "detailed" && (
                                <>
                                  <input
                                    type="text"
                                    value={item.title || ""}
                                    onChange={(e) =>
                                      updateItem(
                                        item.id,
                                        "title",
                                        e.target.value,
                                      )
                                    }
                                    className={cn(
                                      inputClasses,
                                      "py-3 px-4 border-slate-100 font-bold",
                                    )}
                                    placeholder="Titel der Position"
                                  />
                                  <div className="flex items-start gap-2 mt-2">
                                    <textarea
                                      rows={2}
                                      value={item.description}
                                      onChange={(e) =>
                                        updateItem(
                                          item.id,
                                          "description",
                                          e.target.value,
                                        )
                                      }
                                      className={cn(
                                        inputClasses,
                                        "py-2.5 px-4 border-slate-100 text-sm resize-none flex-1",
                                      )}
                                      placeholder="Detaillierte Beschreibung (optional)"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveServiceItemId(item.id)
                                      }
                                      className="mt-0.5 h-11 w-11 shrink-0 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-100"
                                      title="Aus Vorlage wählen"
                                    >
                                      <Book className="h-5 w-5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveAsPreset(item)}
                                      className={cn(
                                        "mt-0.5 h-11 w-11 shrink-0 flex items-center justify-center rounded-xl transition-all border",
                                        savedPresetIds.includes(item.id)
                                          ? "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20"
                                          : "bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border-slate-100"
                                      )}
                                      title="Als Vorlage speichern"
                                    >
                                      {savedPresetIds.includes(item.id) ? <CheckCircle2 className="h-5 w-5 animate-in zoom-in" /> : <Bookmark className="h-5 w-5" />}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              className="h-9 w-9 mt-1 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-0 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {type !== "title" && (
                            <div className="flex items-center gap-3 px-3 pb-3 pl-14">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className={cn(
                                  inputClasses,
                                  "py-2.5 px-4 border-slate-100 text-center no-spinner w-24 shrink-0",
                                )}
                                placeholder="Menge"
                              />
                              <select
                                value={item.unit}
                                onChange={(e) =>
                                  updateItem(item.id, "unit", e.target.value)
                                }
                                className={cn(
                                  inputClasses,
                                  "py-2.5 px-4 border-slate-100 w-40 shrink-0",
                                )}
                              >
                                <option value="PA">PA (Pauschal)</option>
                                <option value="h">h (Stunden)</option>
                                <option value="Stk">Stk (Stück)</option>
                                <option value="m">m (Meter)</option>
                                <option value="m²">m² (Quadratmeter)</option>
                                <option value="m³">m³ (Kubikmeter)</option>
                                <option value="kg">kg (Kilogramm)</option>
                                <option value="Tag">Tag (Tage)</option>
                              </select>
                              <input
                                type="number"
                                value={item.pricePerUnit}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "pricePerUnit",
                                    e.target.value,
                                  )
                                }
                                className={cn(
                                  inputClasses,
                                  "py-2.5 px-4 border-slate-100 text-right no-spinner flex-1",
                                )}
                                placeholder="Einzelpreis"
                              />
                              <div className="text-right font-black text-slate-900 whitespace-nowrap w-36 shrink-0">
                                €{" "}
                                {item.totalPrice.toLocaleString("de-DE", {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </SortableItem>
                    );
                  });
                })()}
              </SortableContext>
            </DndContext>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-4">
            <div className="w-auto min-w-[24rem] bg-indigo-50/50 rounded-[2rem] p-8 space-y-4 border border-indigo-100/50">
              <div className="flex justify-between items-center text-slate-600 font-bold gap-8">
                <span>Zwischensumme:</span>
                <span className="whitespace-nowrap">
                  €{" "}
                  {subtotal.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-bold gap-8">
                <span>
                  {isReverseCharge
                    ? "0% USt.:"
                    : `Steuer (${invoiceSettings?.defaultTaxRate || 20}%):`}
                </span>
                <span className="whitespace-nowrap">
                  €{" "}
                  {taxAmount.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="pt-4 border-t border-indigo-200/50 flex justify-between items-center gap-8">
                <span className="text-2xl font-black text-slate-900 whitespace-nowrap">
                  Angebotssumme:
                </span>
                <span className="text-3xl font-black text-indigo-600 whitespace-nowrap">
                  €{" "}
                  {totalAmount.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* ── Section 5: Notizen ── */}
        <div>
          <label className={labelClasses}>Notizen (intern)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={cn(inputClasses, "resize-none")}
            placeholder="Interne Notizen zum Angebot..."
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-10 flex flex-col items-end gap-6">
          {error && (
            <div className="w-full xl:w-auto bg-rose-50 border border-rose-100 text-rose-600 px-6 py-4 rounded-2xl font-bold flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="h-5 w-5 rotate-180" />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-6 w-full xl:w-auto">
            <button
              onClick={() => handleSave("draft")}
              disabled={isSaving}
              className="px-10 py-5 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-50 transition-all shadow-xl shadow-slate-200/10 active:scale-95 disabled:opacity-50"
            >
              Als Entwurf speichern
            </button>
            <button
              onClick={() => handleSave("sent")}
              disabled={isSaving}
              className="px-10 py-5 bg-primary-gradient text-white rounded-2xl font-black text-lg flex items-center gap-3 shadow-xl shadow-indigo-500/25 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" /> Speichern...
                </>
              ) : (
                <>
                  <Save className="h-6 w-6" /> Finalisieren & Speichern
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveNewCustomer}
        existingCustomers={customers}
      />

      <ServiceSelectionModal
        isOpen={activeServiceItemId !== null}
        onClose={() => setActiveServiceItemId(null)}
        onSelect={handleServiceSelect}
        services={services}
        onCreateNew={() => setIsServiceModalOpen(true)}
      />

      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onSave={(newService) => {
          addService(newService);
          handleServiceSelect(newService);
          setIsServiceModalOpen(false);
        }}
      />
    </div>
  );
}
