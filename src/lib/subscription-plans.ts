export const PLAN_FEATURES = [
    { id: 'dashboard', label: 'Dashboard & Übersicht', group: 'Organisation' },
    { id: 'calendar', label: 'Kalender', group: 'Organisation' },
    { id: 'crm', label: 'Anfragen & CRM', group: 'Kunden & Projekte' },
    { id: 'customers', label: 'Kundenverwaltung', group: 'Kunden & Projekte' },
    { id: 'projects', label: 'Projektverwaltung', group: 'Kunden & Projekte' },
    { id: 'vehicles', label: 'Fahrzeugverwaltung', group: 'Betrieb' },
    { id: 'catalog', label: 'Katalog & Leistungsverzeichnis', group: 'Betrieb' },
    { id: 'employees', label: 'Mitarbeiterverwaltung', group: 'Mitarbeiter' },
    { id: 'time_tracking', label: 'Zeiterfassung', group: 'Mitarbeiter' },
    { id: 'invoices', label: 'Rechnungen', group: 'Finanzen' },
    { id: 'offers', label: 'Angebote', group: 'Finanzen' },
    { id: 'orders', label: 'Aufträge', group: 'Finanzen' },
    { id: 'dunning', label: 'Mahnwesen', group: 'Finanzen' },
    { id: 'reports', label: 'Auswertungen', group: 'Finanzen' },
    { id: 'archive', label: 'Dokumentenarchiv', group: 'Werkzeuge' },
    { id: 'credentials', label: 'Passwortmanager', group: 'Werkzeuge' },
    { id: 'user_management', label: 'Benutzerverwaltung', group: 'Benutzer & App' },
    { id: 'mobile_app', label: 'Mobile Mitarbeiter-App', group: 'Benutzer & App' },
] as const;

export type PlanFeatureId = typeof PLAN_FEATURES[number]['id'];

export interface SubscriptionPlan {
    id: string;
    slug: string;
    name: string;
    description: string;
    monthly_price: number;
    yearly_price: number;
    currency: string;
    trial_days: number;
    features: string[];
    limits: Record<string, number | null>;
    is_active: boolean;
    is_public: boolean;
    is_featured: boolean;
    sort_order: number;
    created_at?: string;
    updated_at?: string;
}
