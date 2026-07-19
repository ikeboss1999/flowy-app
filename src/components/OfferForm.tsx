"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Copy,
  Search,
  ChevronUp,
  ChevronDown,
  Info,
  Percent,
  FileCheck2,
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
  useDraggable,
  useDroppable,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { cn } from "@/lib/utils";
import { Offer, OfferItem, OfferStatus } from "@/types/offer";
import { useCustomers } from "@/hooks/useCustomers";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useOffers } from "@/hooks/useOffers";
import { useOfferSettings } from "@/hooks/useOfferSettings";
import { useServices } from "@/hooks/useServices";
import { useServiceFolders } from "@/hooks/useServiceFolders";
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
import { pdf } from "@react-pdf/renderer";
import { OfferReactPDF } from "@/components/OfferReactPDF";

interface OfferFormProps {
  initialData?: Partial<Offer>;
}

function DraggablePresetItem({
  service,
  onAdd,
}: {
  service: Service;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: `preset-${service.id}`,
    });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-200 hover:shadow transition-all flex flex-col gap-1 cursor-grab active:cursor-grabbing group relative",
        isDragging && "opacity-30 border-indigo-300"
      )}
    >
      <div className="flex justify-between items-start gap-2 pr-6">
        <span className="font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1 select-none">
          {service.title}
        </span>
        <span className="text-xs font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded whitespace-nowrap select-none">
          € {service.price.toFixed(2)}
        </span>
      </div>
      {service.description && (
        <p className="text-xs text-slate-400 line-clamp-2 pr-6 select-none">
          {service.description}
        </p>
      )}

      {/* Quick Add Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="absolute bottom-2 right-2 h-6 w-6 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        title="Als Position anhängen"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
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
  const { folders: serviceFolders } = useServiceFolders();
  const [isPresetDrawerOpen, setIsPresetDrawerOpen] = useState(false);
  const [activePresetTab, setActivePresetTab] = useState<'services' | 'positions'>('services');
  const [presetSearchTerm, setPresetSearchTerm] = useState('');
  const [expandedPresetFolders, setExpandedPresetFolders] = useState<Record<string, boolean>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const { showToast, showConfirm } = useNotification();

  useEffect(() => {
    if (isPresetDrawerOpen) {
      document.documentElement.classList.add("sidebar-collapsed");
    } else {
      document.documentElement.classList.remove("sidebar-collapsed");
    }
    return () => {
      document.documentElement.classList.remove("sidebar-collapsed");
    };
  }, [isPresetDrawerOpen]);

  const isLoading =
    isCustomersLoading ||
    isCompanyLoading ||
    isOfferSettingsLoading ||
    isOffersLoading ||
    isProjectsLoading;

  // Form State
  const [documentType, setDocumentType] = useState<'offer' | 'estimate'>(
    initialData?.documentType || 'offer'
  );
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
  const [reverseChargeOverride, setReverseChargeOverride] = useState<boolean | null>(
    typeof initialData?.isReverseCharge === "boolean" ? initialData.isReverseCharge : null,
  );
  const [projectId, setProjectId] = useState(initialData?.projectId || "");
  const [processor, setProcessor] = useState(initialData?.processor || "");
  const [introText, setIntroText] = useState(initialData?.introText || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [discountEnabled, setDiscountEnabled] = useState(!!initialData?.discountEnabled);
  const [discountDays, setDiscountDays] = useState(initialData?.discountDays || 5);
  const [discountPercent, setDiscountPercent] = useState(initialData?.discountPercent || 3);
  const [orderAcceptanceFormEnabled, setOrderAcceptanceFormEnabled] = useState(
    !!initialData?.orderAcceptanceFormEnabled
  );
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
    setDiscountEnabled(!!offerSettings.defaultDiscountEnabled);
    setDiscountDays(offerSettings.defaultDiscountDays || 5);
    setDiscountPercent(offerSettings.defaultDiscountPercent || 3);
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

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === customerId);
  }, [customerId, customers]);

  const isReverseCharge = useMemo(() => {
    if (selectedCustomer?.type !== "business") return false;
    return reverseChargeOverride ?? !!selectedCustomer?.reverseChargeEnabled;
  }, [selectedCustomer, reverseChargeOverride]);

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

  const newInfoItem = (): OfferItem => ({
    id: Math.random().toString(36).substring(2, 11),
    itemType: "info",
    title: "",
    description: "",
    quantity: 0,
    unit: "Stk",
    pricePerUnit: 0,
    totalPrice: 0,
  });

  const addStandardItem = () =>
    setItems((prev) => [...prev, newStandardItem()]);
  const addTitleItem = () => setItems((prev) => [...prev, newTitleItem()]);
  const addDetailedItem = () =>
    setItems((prev) => [...prev, newDetailedItem()]);
  const addInfoItem = () => setItems((prev) => [...prev, newInfoItem()]);

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== id));
  };

  const duplicateItem = (item: OfferItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx === -1) return prev;
      const duplicated: OfferItem = {
        ...item,
        id: Math.random().toString(36).substring(2, 11),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, duplicated);
      return next;
    });
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

    const validationErrors: string[] = [];
    if (!customerId) validationErrors.push("Kunde auswählen");
    if (!offerNumber.trim()) validationErrors.push("Angebotsnummer eintragen");
    if (!issueDate) validationErrors.push("Angebotsdatum wählen");
    if (!processor.trim()) validationErrors.push("Bearbeiter eintragen");
    if (subtotal <= 0) {
      validationErrors.push("Mindestens eine Position mit Betrag größer als 0 EUR eintragen");
    }

    const hasEmptyPricedPosition = items.some((item) => {
      const type = item.itemType ?? ((item as any).isTitleOnly ? "title" : "standard");
      if (type === "title" || type === "info" || item.totalPrice <= 0) return false;
      return !String(item.title || item.description || "").trim();
    });
    if (hasEmptyPricedPosition) {
      validationErrors.push("Positionsbeschreibung bei allen berechneten Positionen ausfüllen");
    }

    if (discountEnabled && (!discountDays || discountDays < 1)) {
      validationErrors.push("Skontotage eintragen");
    }
    if (discountEnabled && (!discountPercent || discountPercent <= 0)) {
      validationErrors.push("Skonto in Prozent eintragen");
    }

    if (validationErrors.length > 0) {
      setError(`Bitte prüfe folgende Pflichtfelder:\n- ${validationErrors.join("\n- ")}`);
      return;
    }

    setIsSaving(true);
    try {
      const customer = customers.find((c) => c.id === customerId);
      if (customer?.status === "draft") {
        setError("Der ausgewählte Kunde ist noch ein Entwurf und kann nicht für Angebote verwendet werden.");
        setIsSaving(false);
        return;
      }

      const offerData: Offer = {
        id: initialData?.id || Math.random().toString(36).substring(2, 11),
        offerNumber,
        documentType,
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
        discountEnabled,
        discountDays: discountEnabled ? Number(discountDays) || 0 : undefined,
        discountPercent: discountEnabled ? Number(discountPercent) || 0 : undefined,
        orderAcceptanceFormEnabled,
        status,
        projectId: projectId || undefined,
        notes: notes || undefined,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pdfUrl: initialData?.pdfUrl,
      };

      if (status !== "draft") {
        const blob = await pdf(
          <OfferReactPDF
            offer={offerData}
            customer={customer}
            companySettings={companySettings}
            offerSettings={offerSettings}
          />,
        ).toBlob();

        const pdfFile = new File([blob], "offer.pdf", { type: "application/pdf" });
        const formData = new FormData();
        formData.append("file", pdfFile);
        formData.append("offerId", offerData.id);
        formData.append("offerNumber", offerData.offerNumber);
        const previousPdfPath = initialData?.pdfUrl && !initialData.pdfUrl.startsWith("http") ? initialData.pdfUrl : undefined;
        if (previousPdfPath) {
          formData.append("previousPdfPath", previousPdfPath);
        }

        const uploadResponse = await fetch("/api/offers/pdf-upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(await uploadResponse.text());
        }

        const uploadData = await uploadResponse.json();
        offerData.pdfUrl = uploadData.pdfPath;
      }

      if (initialData?.id) {
        await updateOffer(initialData.id, offerData);
      } else {
        await addOffer(offerData);
        // Increment next offer number in settings
        await updateOfferSettings({
          nextOfferNumber: offerSettings.nextOfferNumber + 1,
        });
      }

      if (status === "draft") {
        showConfirm({
          title: "Entwurf gespeichert",
          message: "Angebot wurde als Entwurf gespeichert. Möchten Sie in der Angebotserstellung bleiben oder zur Angebotsübersicht wechseln?",
          confirmLabel: "Zur Übersicht",
          cancelLabel: "Hier bleiben",
          variant: "primary",
          onConfirm: () => router.push("/offers"),
        });
      } else {
        showToast("Angebot wurde finalisiert und als PDF gespeichert.", "success");
        window.setTimeout(() => router.push("/offers"), 1000);
      }
    } catch (e) {
      console.error("Failed to save offer", e);
      setError("Speichern fehlgeschlagen. Die PDF konnte nicht gespeichert werden. Bitte erneut versuchen.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNewCustomer = (newCustomer: Customer) => {
    addCustomer(newCustomer);
    setCustomerId(newCustomer.id);
    setReverseChargeOverride(
      newCustomer.type === "business" ? !!newCustomer.reverseChargeEnabled : null,
    );
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

  const addServiceAsItem = (service: Service) => {
    const newItem: OfferItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      itemType: service.itemType || "standard",
      title: service.title,
      description: service.description || "",
      quantity: 1,
      unit: (service.unit as any) || "Stk",
      pricePerUnit: service.price || 0,
      totalPrice: service.price || 0,
    };
    setItems((prev) => [...prev, newItem]);
    showToast("Vorlage als neue Position hinzugefügt", "success");
  };

  const togglePresetFolder = (folderName: string) => {
    setExpandedPresetFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(presetSearchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(presetSearchTerm.toLowerCase());
      const isPosition = s.category === "Position";
      const matchesTab =
        activePresetTab === "positions" ? isPosition : !isPosition;
      return matchesSearch && matchesTab;
    });
  }, [services, presetSearchTerm, activePresetTab]);

  const groupedServices = useMemo(() => {
    const groups: Record<string, Service[]> = {};
    filteredServices.forEach((s) => {
      const folderName = s.folder || "Allgemein";
      if (!groups[folderName]) {
        groups[folderName] = [];
      }
      groups[folderName].push(s);
    });
    return groups;
  }, [filteredServices]);

  const positionsDropElementRef = useRef<HTMLDivElement | null>(null);
  const { setNodeRef: setPositionsDropRef, isOver: isOverPositions } = useDroppable({
    id: "offer-positions-drop-zone",
  });

  const setPositionsDropNode = (node: HTMLDivElement | null) => {
    positionsDropElementRef.current = node;
    setPositionsDropRef(node);
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

  const handleDragStart = (event: any) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (active.id.toString().startsWith("preset-")) {
      if (!over) return;
      const isOnDropZone = over.id === "offer-positions-drop-zone";
      const isOnItem = items.some((i) => i.id === over.id);
      if (!isOnDropZone && !isOnItem) return;

      const dropZoneRect = positionsDropElementRef.current?.getBoundingClientRect();
      const translatedRect = active.rect.current.translated;
      if (!dropZoneRect || !translatedRect) return;

      const activeCenterX = translatedRect.left + translatedRect.width / 2;
      const activeCenterY = translatedRect.top + translatedRect.height / 2;
      const isInsidePositions =
        activeCenterX >= dropZoneRect.left &&
        activeCenterX <= dropZoneRect.right &&
        activeCenterY >= dropZoneRect.top &&
        activeCenterY <= dropZoneRect.bottom;

      if (!isInsidePositions) return;

      const serviceId = active.id.toString().replace("preset-", "");
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        const newItem: OfferItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          itemType: service.itemType || "standard",
          title: service.title,
          description: service.description || "",
          quantity: 1,
          unit: (service.unit as any) || "Stk",
          pricePerUnit: service.price || 0,
          totalPrice: service.price || 0,
        };
        setItems((prev) => {
          const overIndex = prev.findIndex((i) => i.id === over.id);
          if (overIndex === -1) return [...prev, newItem];
          const next = [...prev];
          next.splice(overIndex, 0, newItem);
          return next;
        });
        showToast("Vorlage eingefügt", "success");
      }
      return;
    }

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

  const renderPresetLibraryPanel = (className?: string) => (
    <div
      className={cn(
        "bg-white border border-slate-100 rounded-[1.75rem] shadow-xl shadow-slate-200/60 flex flex-col overflow-hidden p-5 min-h-[520px]",
        className,
      )}
    >
      <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
        <div>
          <h4 className="font-black text-slate-800 text-lg flex items-center gap-1.5 font-outfit">
            <Bookmark className="h-5 w-5 text-indigo-600" />
            Vorlagen-Bibliothek
          </h4>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Ziehen zum Einfügen
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPresetDrawerOpen(false)}
          className="text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-bold transition-all"
        >
          Schließen
        </button>
      </div>

      <div className="space-y-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Vorlagen durchsuchen..."
            value={presetSearchTerm}
            onChange={(e) => setPresetSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="flex p-1 bg-slate-200/60 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActivePresetTab("services")}
            className={cn(
              "flex-1 py-2 font-bold rounded-lg transition-all",
              activePresetTab === "services"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Leistungen
          </button>
          <button
            type="button"
            onClick={() => setActivePresetTab("positions")}
            className={cn(
              "flex-1 py-2 font-bold rounded-lg transition-all",
              activePresetTab === "positions"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Positions-Vorlagen
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-3 min-h-0 custom-scrollbar">
        {Object.keys(groupedServices).length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            Keine Vorlagen gefunden
          </div>
        ) : (
          Object.keys(groupedServices)
            .sort()
            .map((folderName) => {
              const isExpanded = expandedPresetFolders[folderName] !== false;
              const folderServices = groupedServices[folderName];

              return (
                <div key={folderName} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => togglePresetFolder(folderName)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-550 hover:text-slate-700 py-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      {folderName} ({folderServices.length})
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 pl-2">
                      {folderServices.map((service) => (
                        <DraggablePresetItem
                          key={service.id}
                          service={service}
                          onAdd={() => addServiceAsItem(service)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto space-y-10 transition-all duration-300 w-full max-w-none px-4 lg:px-6 2xl:px-10">
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
          {initialData?.id 
            ? (documentType === 'estimate' ? "Kostenvoranschlag bearbeiten" : "Angebot bearbeiten") 
            : (documentType === 'estimate' ? "Neuer Kostenvoranschlag" : "Neues Angebot")}
        </h1>
        <p className="text-slate-500 font-medium">
          {documentType === 'estimate' 
            ? "Erstellen Sie einen neuen Kostenvoranschlag für Ihre Kunden" 
            : "Erstellen Sie ein neues Angebot für Ihre Kunden"}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={activeDragId?.toString().startsWith('preset-') ? [] : [restrictToVerticalAxis]}
      >
        <div className="space-y-8 w-full">
            {/* Card 1: Kopfdaten */}
            <div className="glass-card p-5 xl:p-7 2xl:p-8">
            <div className="grid grid-cols-1 2xl:grid-cols-[620px_minmax(0,1fr)] gap-6 2xl:gap-8 items-start">
              <div className="space-y-6 xl:space-y-7 xl:order-2">
            {/* ── Section 1: Kopfdaten ── */}
        <div className="space-y-5 xl:space-y-6">
          <h2 className={sectionTitleClasses}>
            <div className="h-8 xl:h-10 w-8 xl:w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
              <Calculator className="h-4 xl:h-5 w-4 xl:w-5 text-indigo-600" />
            </div>
            Angebotsdaten
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8">
            <div>
              <label className={labelClasses}>Dokumententyp</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as 'offer' | 'estimate')}
                className={cn(
                  inputClasses,
                  "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.25rem_center] bg-no-repeat",
                )}
              >
                <option value="offer">Angebot</option>
                <option value="estimate">Kostenvoranschlag</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Angebotsnummer <span className="text-rose-500">*</span></label>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 xl:gap-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 xl:gap-6">
            <div>
              <label className={labelClasses}>Angebotsdatum <span className="text-rose-500">*</span></label>
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
            <div>
              <label className={labelClasses}>Bearbeiter <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={processor}
                onChange={(e) => setProcessor(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>
        </div>

              </div>

        {/* ── Section 2: Kundendaten ── */}
        <div className="space-y-5 rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5 xl:p-6 xl:order-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600">
              <Copy className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">
              Kundendaten
            </h3>
          </div>
          <div className="space-y-4">
            <label className={labelClasses}>
              Kunde auswählen <span className="text-rose-500">*</span>
            </label>
            <CustomerSearchSelect
              customers={customers}
              selectedId={customerId}
              onSelect={(id) => {
                setCustomerId(id);
                setReverseChargeOverride(null);
              }}
              onAddNew={() => setIsCustomerModalOpen(true)}
            />
          </div>
          {selectedCustomer ? (
            <div className="space-y-4 rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[0.65rem] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                    {selectedCustomer.type === "business" ? "Firma" : "Privat"}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900 leading-tight">
                  {selectedCustomer.name}
                </p>
              </div>

              {selectedCustomer.type === "business" && (
                <button
                  type="button"
                  onClick={() => setReverseChargeOverride(!isReverseCharge)}
                  className={cn(
                    "w-full flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all",
                    isReverseCharge
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-100 bg-slate-50 text-slate-500"
                  )}
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">
                      Reverse Charge
                    </p>
                    <p className="text-sm font-bold">
                      {isReverseCharge ? "Aktiv" : "Inaktiv"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      isReverseCharge ? "bg-emerald-500" : "bg-slate-300"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all",
                        isReverseCharge ? "left-6" : "left-1"
                      )}
                    />
                  </span>
                </button>
              )}

              <div className="grid gap-3 text-sm font-semibold text-slate-600">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Anschrift
                  </p>
                  <p>{selectedCustomer.address.street}</p>
                  <p>
                    {selectedCustomer.address.zip} {selectedCustomer.address.city}
                  </p>
                </div>
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 min-w-0">
                    <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">
                      E-Mail
                    </p>
                    <p className="truncate">{selectedCustomer.email || "-"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 min-w-0">
                    <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Telefon
                    </p>
                    <p className="truncate">{selectedCustomer.phone || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm font-bold text-slate-400">
              Wählen Sie einen Kunden aus, damit die Angebotsanschrift hier angezeigt wird.
            </div>
          )}
        </div>


        {/* ── Section 3: Einleitungstext ── */}
        <div className="space-y-4 xl:col-span-2">
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

        <div className="space-y-5 xl:col-span-2 rounded-[1.5rem] border border-slate-100 bg-white p-5 xl:p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                Optionen & Angebotsbedingungen
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Zusätzliche Bedingungen und Dokumentseiten für dieses Angebot.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            <div className={cn(
              "rounded-2xl border p-5 transition-all",
              discountEnabled ? "border-indigo-200 bg-indigo-50/60" : "border-slate-100 bg-slate-50"
            )}>
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                    <Percent className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Skonto anbieten</p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
                      Skontohinweis im Angebot anzeigen.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={discountEnabled}
                  onChange={(e) => setDiscountEnabled(e.target.checked)}
                  className="mt-2 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              {discountEnabled && (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClasses}>Skontotage</label>
                    <input
                      type="number"
                      min="1"
                      value={discountDays}
                      onChange={(e) => setDiscountDays(Number(e.target.value))}
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Skonto in %</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className={inputClasses}
                    />
                  </div>
                  <div className="sm:col-span-2 rounded-xl border border-indigo-100 bg-white p-4 text-sm font-semibold text-slate-600">
                    Bei Zahlung innerhalb von {discountDays || 0} Tagen ab Rechnungsdatum gewähren wir {discountPercent || 0} % Skonto.
                  </div>
                </div>
              )}
            </div>

            <div className={cn(
              "rounded-2xl border p-5 transition-all",
              orderAcceptanceFormEnabled ? "border-emerald-200 bg-emerald-50/60" : "border-slate-100 bg-slate-50"
            )}>
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Auftragserteilung-Formular anhängen</p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
                      Erstellt automatisch eine zusätzliche Unterschriftenseite im Angebots-PDF.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={orderAcceptanceFormEnabled}
                  onChange={(e) => setOrderAcceptanceFormEnabled(e.target.checked)}
                  className="mt-2 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>
        </div>
            </div>
          </div>

          <div
            className={cn(
              "grid gap-6 items-start transition-all duration-300",
              isPresetDrawerOpen
                ? "2xl:grid-cols-[minmax(0,1fr)_420px]"
                : "grid-cols-1",
            )}
          >
          {/* Card 2: Positionen */}
          <div className="glass-card p-5 xl:p-7 2xl:p-8 space-y-8 xl:space-y-10 w-full min-w-0">
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
              <div className="w-px h-4 bg-slate-200" />
              <button
                type="button"
                onClick={addInfoItem}
                className="px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm transition-all flex items-center gap-1.5"
              >
                <Info className="h-3.5 w-3.5" /> Info
              </button>
              <div className="w-px h-4 bg-slate-200" />
              <button
                type="button"
                onClick={() => setIsPresetDrawerOpen(!isPresetDrawerOpen)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  isPresetDrawerOpen
                    ? "bg-indigo-50 text-indigo-600 shadow-sm"
                    : "text-indigo-600 hover:bg-white hover:shadow-sm"
                )}
              >
                <Bookmark className="h-3.5 w-3.5" /> Vorlagen {isPresetDrawerOpen ? "schließen" : "öffnen"}
              </button>
            </div>
          </div>

          <div
            ref={setPositionsDropNode}
            className={cn(
              "space-y-2 rounded-2xl transition-all min-h-[80px]",
              isOverPositions && activeDragId?.toString().startsWith("preset-") && "ring-2 ring-indigo-300 bg-indigo-50/40"
            )}
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
                        if (type !== "title" && type !== "info") posCounter++;
                        const pos = posCounter;
                        return (
                          <SortableItem key={item.id} id={item.id}>
                            <div
                              className={cn(
                                "rounded-2xl border transition-colors bg-white",
                                type === "title"
                                  ? "bg-slate-50 border-slate-200"
                                  : type === "info"
                                    ? "bg-amber-50/40 border-amber-100"
                                    : "border-slate-100 hover:border-slate-200",
                              )}
                            >
                              <div className="flex items-start gap-3 p-3">
                                <div className="flex items-center self-stretch mr-1">
                                  <DragHandle id={item.id} />
                                </div>
                                <span className="mt-3.5 w-6 text-center text-xs font-black text-slate-400 shrink-0">
                                  {type === "title" || type === "info" ? "—" : pos}
                                </span>
                                <div className="flex-1 min-w-0">
                                  {type === "info" && (
                                    <textarea
                                      rows={2}
                                      value={item.description || ""}
                                      onChange={(e) =>
                                        updateItem(item.id, "description", e.target.value)
                                      }
                                      className={cn(
                                        inputClasses,
                                        "py-3 px-4 border-amber-100 text-sm resize-y bg-transparent",
                                      )}
                                      placeholder="Informationstext / Hinweis..."
                                    />
                                  )}
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

                              {type !== "title" && type !== "info" && (
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
          </div>
        </div>
      </div>

      {isPresetDrawerOpen &&
        renderPresetLibraryPanel("hidden 2xl:flex sticky top-6 max-h-[calc(100vh-3rem)]")}
          </div>

      {/* Separate Vorlagen Card */}
      {false && isPresetDrawerOpen && (
        <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-[420px] bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden z-[110] p-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
            <div>
              <h4 className="font-black text-slate-800 text-lg flex items-center gap-1.5 font-outfit">
                <Bookmark className="h-5 w-5 text-indigo-600 animate-pulse" />
                Vorlagen-Bibliothek
              </h4>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ziehen zum Einfügen</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPresetDrawerOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-bold transition-all"
            >
              Schließen
            </button>
          </div>

          {/* Search & Tabs */}
          <div className="space-y-4 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Vorlagen durchsuchen..."
                value={presetSearchTerm}
                onChange={(e) => setPresetSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="flex p-1 bg-slate-200/60 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActivePresetTab('services')}
                className={cn(
                  "flex-1 py-2 font-bold rounded-lg transition-all",
                  activePresetTab === 'services'
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Leistungen
              </button>
              <button
                type="button"
                onClick={() => setActivePresetTab('positions')}
                className={cn(
                  "flex-1 py-2 font-bold rounded-lg transition-all",
                  activePresetTab === 'positions'
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Positions-Vorlagen
              </button>
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-3 min-h-0 custom-scrollbar">
            {Object.keys(groupedServices).length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm font-medium">
                Keine Vorlagen gefunden
              </div>
            ) : (
              Object.keys(groupedServices)
                .sort()
                .map((folderName) => {
                  const isExpanded = expandedPresetFolders[folderName] !== false;
                  const folderServices = groupedServices[folderName];

                  return (
                    <div key={folderName} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => togglePresetFolder(folderName)}
                        className="w-full flex items-center justify-between text-xs font-bold text-slate-550 hover:text-slate-700 py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                          {folderName} ({folderServices.length})
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="space-y-2 pl-2">
                          {folderServices.map((service) => (
                            <DraggablePresetItem
                              key={service.id}
                              service={service}
                              onAdd={() => addServiceAsItem(service)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Card 3: Totals & Footer */}
      <div className="glass-card p-5 sm:p-6 2xl:p-12 space-y-8 2xl:space-y-12">
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
            <div className="w-full xl:w-auto bg-rose-50 border border-rose-100 text-rose-600 px-6 py-4 rounded-2xl font-bold flex items-start gap-3 animate-in fade-in whitespace-pre-line">
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
  </div>
        <DragOverlay dropAnimation={null}>
          {activeDragId?.toString().startsWith("preset-") && (() => {
            const serviceId = activeDragId.toString().replace("preset-", "");
            const service = services.find((s) => s.id === serviceId);
            if (!service) return null;
            return (
              <div className="p-3 bg-white border-2 border-indigo-400 rounded-xl shadow-2xl w-[260px] cursor-grabbing rotate-1">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-slate-700 text-sm line-clamp-1">{service.title}</span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded whitespace-nowrap">€ {service.price.toFixed(2)}</span>
                </div>
                {service.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{service.description}</p>
                )}
              </div>
            );
          })()}
        </DragOverlay>
  </DndContext>

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
