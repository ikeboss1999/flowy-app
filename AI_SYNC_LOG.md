# AI Collaboration Log (VS Code Assistant & Claude Code)

Dieses Dokument dient als gemeinsames Gedächtnis und Kommunikationsprotokoll zwischen dem VS Code AI-Assistenten und dem Claude Code CLI-Tool sowie der KI für die mobile App.

## Regeln für alle KIs:
1. **Vor der Arbeit lesen:** Lies immer die neuesten Einträge in dieser Datei, bevor du eine neue Aufgabe beginnst, um Konflikte zu vermeiden.
2. **Änderungen dokumentieren:** Trage jede signifikante Änderung (neue Features, Datenbank-Anpassungen, Architektur-Änderungen) hier mit Datum und einer kurzen Zusammenfassung ein.
3. **Relevanz angeben (SEHR WICHTIG):** Bei jedem Eintrag MUSS zwingend angegeben werden, für welches Projekt die Änderung relevant ist: `[Nur Web App]`, `[Nur Mobile App]` oder `[Beide]`. So wissen die anderen KIs, ob sie die Info berücksichtigen müssen.
4. **Format einhalten:** Nutze das untenstehende Format für jeden neuen Eintrag (neueste Einträge oben).

---

### [2026-05-14] - Feature: Dynamisches Dateisystem & Fix: Zeiterfassungs-Filter
- **KI:** Antigravity (VS Code Assistant)
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/components/projects/ProjectFiles.tsx` — Komplettumbau auf dynamische Ordner (Erstellen, Umbenennen, Löschen, Verschieben).
  - `src/hooks/useProjectFolders.ts` & `src/app/api/project-folders/route.ts` — Neue API und Hook für persistente Ordnerverwaltung.
  - `src/app/(dashboard)/time-tracking/[employeeId]/page.tsx` — Filter für Monatsauswahl hinzugefügt (begrenzt auf `startDate` des Mitarbeiters).
  - `src/components/projects/ProjectDetails.tsx` — Fix: Fehlende Props (`companySettings`, `customer`) an Preview-Modals übergeben.
- **Datenbank-Änderung (Supabase SQL erforderlich):**
  ```sql
  CREATE TABLE IF NOT EXISTS project_folders (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      name TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE("projectId", name)
  );
  ALTER TABLE project_folders ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can manage their own folders" ON project_folders
      FOR ALL USING (auth.uid()::text = "userId");
  ```
- **Hintergrund:** User-Wunsch nach flexibler Ordnerstruktur statt fester Kategorien. PDF-Vorschau zeigte keine Header (fehlender Kontext). Zeiterfassung erlaubte Buchungen vor Arbeitsbeginn.

### [2026-05-14] - Fix: Vollständige Kontolöschung (Datenbereinigung)
- **KI:** Antigravity (VS Code Assistant)
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
- `src/app/api/auth/delete-account/route.ts` — Umstellung auf `supabaseAdmin` (Service Role), um RLS beim Löschen zu umgehen. Liste der zu löschenden Tabellen erweitert (neu: `project_files`, `offers`, `einsaetze`, `project_photos`). Reihenfolge der Tabellen-Löschung optimiert (Kind-Elemente vor Eltern-Elementen), um Foreign-Key-Konflikte zu vermeiden. Storage-Bereinigung auf alle relevanten Buckets erweitert (`project-files`, `avatars`, `project-photos`, `employee-docs`, `backups`). Sicherheitscheck hinzugefügt, um sicherzustellen, dass nur Daten der spezifischen `userId` gelöscht werden.
- **Hintergrund:** User-Meldung, dass nach Kontolöschung Daten in der DB verblieben. Grund war die Nutzung des eingeschränkten Public-Clients und das Fehlen neuer Tabellen/Buckets.

### [2026-05-14] - Etappe 3: Sicheres Datei-Management + kombinierter Dokumente-Tab
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Supabase SQL erforderlich (einmalig ausführen):**
  ```sql
  -- Tabelle für Datei-Metadaten
  CREATE TABLE IF NOT EXISTS project_files (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      folder TEXT NOT NULL DEFAULT 'Sonstiges',
      name TEXT NOT NULL,
      "storagePath" TEXT NOT NULL UNIQUE,
      "mimeType" TEXT,
      size INTEGER,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS project_files_project_idx ON project_files ("projectId");
  CREATE INDEX IF NOT EXISTS project_files_user_idx ON project_files ("userId");
  ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
  -- RLS: Nutzer sehen nur eigene Dateien (wird durch API-Layer doppelt geprüft)
  CREATE POLICY "own_project_files" ON project_files FOR ALL USING ("userId" = auth.uid()::text);

  -- Privaten Storage-Bucket anlegen (alternativ: Supabase Dashboard → Storage)
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('project-files', 'project-files', false)
  ON CONFLICT (id) DO NOTHING;

  -- Storage RLS: nur Eigentümer darf lesen/schreiben/löschen
  CREATE POLICY "storage_own_files_insert" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);
  CREATE POLICY "storage_own_files_select" ON storage.objects FOR SELECT
      USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);
  CREATE POLICY "storage_own_files_delete" ON storage.objects FOR DELETE
      USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);
  ```
- **Voraussetzung:** `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` erforderlich (für privaten Bucket-Zugriff via Admin-Client).
- **Sicherheitsmodell:**
  - Alle Dateien liegen in **privatem** Supabase-Bucket `project-files` — keine öffentlichen URLs.
  - Anzeige/Download nur über **Signed URLs** (serverseitig generiert, 1 h Ablaufzeit).
  - Storage-Pfad enthält immer `{userId}/` → Pfad-Traversal ausgeschlossen.
  - API: `getUserSession()` + eigene userId-Prüfung vor JEDER Operation (GET/POST/DELETE/signed-url).
  - Signed-URL-Route prüft zusätzlich Datensatz in DB bevor URL generiert wird.
  - Datei-Typ-Whitelist server-seitig, Größenlimit 10 MB.
  - Rollback: Wenn DB-Insert nach Upload fehlschlägt, wird die hochgeladene Datei aus dem Storage entfernt (keine Waisen).
- **Neue Dateien:**
  - `src/types/project_file.ts` — `ProjectFile`-Interface, `FileFolder`-Union-Typ.
  - `src/app/api/project-files/route.ts` — GET (Liste), POST (Upload multipart), DELETE. Service Role Key Pflicht für Upload.
  - `src/app/api/project-files/signed-url/route.ts` — GET: generiert Signed URL nach doppelter Autorisierungsprüfung.
  - `src/hooks/useProjectFiles.ts` — SWR-Hook für Dateiliste; `uploadFile`, `deleteFile`, `getSignedUrl`.
  - `src/components/projects/ProjectFiles.tsx` — Vollständige Dateimanager-UI: Ordner-Grid (Baupläne/Fotos/Korrespondenz/Sonstiges), Drag-&-Drop-Upload-Zone, Datei-Kacheln mit Bild-Thumbnails (via Signed URL), Lightbox-Vorschau, Download (Signed URL → neuer Tab), Löschen mit Bestätigung.
- **Geänderte Dateien:**
  - `src/components/projects/ProjectDetails.tsx` — Tab "Dokumente": Angebote + Rechnungen in **einer** gemeinsamen chronologischen Tabelle (neueste oben); farbige Typ-Badges (Sky=Angebot, Indigo=Teilrechnung, Emerald=Schlussrechnung, Violet=Standard). Tab "Dateien": `ProjectFiles`-Komponente statt Platzhalter.

### [2026-05-14] - Etappe 2: Zentrale Projektmappe — 5-Tab Detailansicht + Angebots-Integration
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/components/projects/ProjectDetails.tsx` — Kompletter Umbau. Neues 5-Tab-System (`TabId`: `overview | documents | payment | files | diary`). Quick-Stats (Budget/Bezahlt/Offen) bleiben dauerhaft im Header-Bereich sichtbar. **Tab Übersicht:** Projektinformationen (Nummer, Status, Kundendaten inkl. E-Mail/Telefon, Datum, Notizen) + Baustellenadresse + Finanzkurzinfo. **Tab Dokumente:** Alle Angebote (`offers.filter(o => o.projectId === project.id)`) + alle Rechnungen gefiltert nach Projekt, jeweils als Tabelle mit Status-Badges. **Tab Zahlungsplan:** Finanz-Summary-Cards + bestehende Zahlungsplan-Tabelle (inkl. "Rechnung erstellen"-Buttons, Status-Verknüpfung). **Tab Dateien:** UI-Platzhalter mit 4 Ordner-Kacheln (Baupläne, Fotos, Korrespondenz, Sonstiges) + "Demnächst verfügbar"-Banner. **Tab Bautagebuch:** Bestehendes `ProjectDiary`-Component. Neue Props: `offers: Offer[]`. Alle alten Funktionen (Zahlungsplan-Modal, Bautagebuch-Druck via `InvoicePrintHandler`) bleiben erhalten.
  - `src/app/(dashboard)/projects/page.tsx` — `useOffers` Hook eingebunden; `offers`-Prop wird an `ProjectDetails` weitergegeben.
- **Hintergrund:** Etappe 2 der Projekt-Optimierung — Projektmappe als vollwertiges Kontrollzentrum.

### [2026-05-14] - Etappe 1: Projekt-Optimierung (Projektnummern, Einstellungen, Modal, UI)
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Supabase SQL erforderlich (einmalig ausführen):**
  ```sql
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS "projectNumber" TEXT;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS "projectSettings" JSONB DEFAULT '{}';
  ```
- **Dateien geändert:**
  - `src/types/project.ts` — `projectNumber?: string` als optionales Feld hinzugefügt (Auto-generiert, z.B. `PRJ-1000`).
  - `src/hooks/useProjectSettings.ts` — **Neu.** Lädt/speichert `projectSettings` (Präfix + nächste Nummer) aus der `settings`-Tabelle via `POST /api/settings` mit `type: 'project'`. Interface `ProjectSettings { projectNumberPrefix, nextProjectNumber }`.
  - `src/components/ProjectSettings.tsx` — **Neu.** Einstellungs-UI für Projektnummern: Präfix-Eingabe, Startnummer, Live-Vorschau (z.B. "PRJ-1000"), Speichern-Button.
  - `src/hooks/useProjects.ts` — `addProject` generiert jetzt automatisch eine Projektnummer (`prefix + padStart(4,'0')`), inkrementiert danach `nextProjectNumber` in den Einstellungen.
  - `src/app/api/settings/route.ts` — GET: leeres `projectSettings`-Objekt wird zu `null` normalisiert. POST: `if (payload.type === 'project') updatedSettings.projectSettings = payload.data` hinzugefügt.
  - `src/app/(dashboard)/settings/page.tsx` — Einstellungsseite neu strukturiert: 4 Haupt-Tabs (`Stammdaten | Dokumente & Projekte | Neuigkeiten | Mein Konto`). Der Tab "Dokumente & Projekte" enthält ein internes Sub-Tab-Menü (`Angebot | Rechnung | Projekte`), das jeweils die entsprechende Settings-Komponente rendert.
  - `src/components/projects/ProjectModal.tsx` — Checkbox "Von Kundenadresse übernehmen" unter Baustellenadresse: kopiert beim Aktivieren die Adresse des gewählten Kunden in die Adressfelder. Aufklappbarer Zahlungsplan-Bereich: Pro Position: Name (Text), Betrag (Netto), Typ (Teilrechnung/Schlussrechnung), Löschen-Button. Beim Speichern wird `paymentPlan` direkt ins Projekt übernommen. Bestehende Zahlungspläne werden beim Bearbeiten korrekt geladen.
  - `src/components/projects/ProjectList.tsx` — Zeigt `project.projectNumber` (falls vorhanden) in Mono-Schrift unterhalb des Projektnamens an.
  - `src/components/projects/ProjectDetails.tsx` — Zeigt `project.projectNumber` als Pill-Badge (indigo) neben dem Status-Badge im Header-Bereich.
- **Hintergrund:** Etappe 1 der Projekt-Optimierung — Projekte als zentralen Abrechnungs-Hub stärken.

### [2026-05-13] - Positionen: Drag & Drop Verschiebe-Logik
- **KI:** Antigravity (VS Code Assistant)
- **Relevanz:** [Nur Web App]
- **Pakete installiert:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@dnd-kit/modifiers`.
- **Dateien geändert:**
  - `src/components/OfferForm.tsx` & `src/components/InvoiceForm.tsx` — Pfeil-Buttons (Hoch/Runter) entfernt; `@dnd-kit` integriert; `GripVertical`-Handle an der linken Seite jeder Position hinzugefügt. Positionen können nun flüssig per Maus verschoben werden.
- **Hintergrund:** Verbesserung der Usability basierend auf User-Wunsch.

### [2026-05-13] - Positionen: Typ-System (title/standard/detailed) + Verschiebe-Funktion
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/types/offer.ts` — `isTitleOnly?: boolean` durch `itemType?: 'title' | 'standard' | 'detailed'` ersetzt. Backward-Kompatibilität: altes `isTitleOnly`-Feld wird zur Laufzeit als Fallback gelesen.
  - `src/types/invoice.ts` — Identische Änderung wie offer.ts.
  - `src/components/OfferForm.tsx` — Drei getrennte Factory-Funktionen (`newTitleItem`, `newStandardItem`, `newDetailedItem`) ersetzen `newEmptyItem`; entsprechende Add-Funktionen (`addTitleItem`, `addStandardItem`, `addDetailedItem`); `moveItem(id, 'up'|'down')` für Reihenfolge-Verschiebung; Toggle "T" entfernt; Button-Group mit drei Buttons `[Titel | Position | Detail-Pos.]`; `updateItem` ohne `isTitleOnly`-Sonderfall; Rendering basiert auf `type = item.itemType ?? fallback`: `title` → grauer Hintergrund, nur Textfeld; `standard` → einzeiliges Beschreibungsfeld + Vorlage-Button; `detailed` → Titel-Input + Beschreibungs-Textarea + Vorlage-Button. Hoch/Runter-Pfeile (ChevronUp/ChevronDown) an jeder Position.
  - `src/components/InvoiceForm.tsx` — Identische Änderungen wie OfferForm.
  - `src/components/OfferPDF.tsx` — `isTitleOnly`-Bedingung durch `isTitle`-Konstante ersetzt (prüft `itemType === 'title'` mit Fallback auf altes `isTitleOnly`-Feld für bestehende DB-Daten).
  - `src/components/OfferReactPDF.tsx` — Identisch.
  - `src/components/InvoicePDF.tsx` — Identisch.
  - `src/components/InvoiceReactPDF.tsx` — Identisch.
- **Keine Supabase-Änderungen notwendig** — `itemType` wird als Teil des `items`-JSONB gespeichert; bestehende Datensätze mit `isTitleOnly: true` werden via Fallback-Logik korrekt als `title`-Typ gerendert.
- **Hintergrund:** User-Feedback: Universal-Toggle war zu umständlich. Drei separate Buttons beim Erstellen sind intuitiver. Verschiebe-Funktion fehlte komplett.

### [2026-05-13] - Positionen: Titelzeilen & mehrzeilige Beschreibungen (Angebote + Rechnungen)
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/types/offer.ts` — `OfferItem` um `title?: string` und `isTitleOnly?: boolean` erweitert.
  - `src/types/invoice.ts` — `InvoiceItem` um `title?: string` und `isTitleOnly?: boolean` erweitert.
  - `src/components/OfferForm.tsx` — Items auf Card-Layout umgestellt: Titel-Input (einzeilig) + Beschreibungs-Textarea (mehrzeilig) pro Position; "T"-Toggle schaltet isTitleOnly-Modus um (blendet Menge/Einheit/Preis aus, setzt Werte auf 0); neuer "Titelzeile"-Button (AlignLeft-Icon) neben "Position hinzufügen"; `handleServiceSelect` befüllt jetzt `item.title` statt `item.description`; `newEmptyItem()` Hilfsfunktion; Position-Zähler überspringt Titelzeilen.
  - `src/components/InvoiceForm.tsx` — Identische Änderungen wie OfferForm: Card-Layout, isTitleOnly-Toggle, "Titelzeile"-Button, `handleServiceSelect`→`item.title`, `newEmptyItem()`, Position-Zähler.
  - `src/components/OfferPDF.tsx` — Tabellen-Zeilen: Titelzeilen rendern mit `colSpan={5}`, grauem Hintergrund und `—` in der Pos-Spalte. Normale Zeilen: Titel fett + Beschreibung darunter (9.5pt, #555). Pos-Zähler via IIFE überspringt Titelzeilen. `cn`-Import entfernt (war ungenutzt).
  - `src/components/OfferReactPDF.tsx` — Identische Logik für react-pdf: Titelzeilen als grauer Hintergrund-View (width 93%, kein colSpan möglich); normale Zeilen mit `cDesc`-View: Titel-Text (Helvetica-Bold) + Beschreibungs-Text (9pt, #555555) gestapelt; IIFE-Position-Zähler.
  - `src/components/InvoicePDF.tsx` — Identische Änderungen wie OfferPDF (colSpan, Pos-Zähler, Titel+Beschreibung gestapelt). Ungenutzte Importe `cn` und `useCompanySettings` entfernt.
  - `src/components/InvoiceReactPDF.tsx` — Identische Änderungen wie OfferReactPDF.
- **Keine neuen Supabase-Änderungen notwendig** (Felder `title` und `isTitleOnly` werden als Teil des `items`-JSONB gespeichert — kein Schema-Update erforderlich).
- **Hintergrund:** Ermöglicht strukturierte Angebote/Rechnungen mit Abschnitts-Überschriften (Titelzeilen ohne Preis) und zweiteiligen Positionen (Titel fett + Langbeschreibung darunter).

### [2026-05-12] - Angebote: Dynamische Gültigkeit, Anrede-Logik & Layout-Finish
- **KI:** Antigravity (VS Code Assistant)
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/types/offer.ts` — `OfferSettings` um `defaultValidityDays?: number` erweitert.
  - `src/hooks/useOfferSettings.ts` — Standardwert für `defaultValidityDays` auf `20` gesetzt.
  - `src/components/OfferSettings.tsx` — Neues Eingabefeld für Standard-Gültigkeit; Hinweistext zur automatischen Anrede hinzugefügt.
  - `src/components/OfferForm.tsx` — UI-Update: Dynamisch generierte Anrede wird jetzt als schreibgeschütztes Label direkt über dem Einleitungstext-Feld angezeigt, um Klarheit zu schaffen.
  - `src/components/OfferPreviewModal.tsx` — Modal auf `max-w-5xl` verbreitert; Toolbar-Layout korrigiert (Buttons jetzt korrekt rechtsbündig); `useOfferSettings` integriert, um Einstellungen an PDF-Komponenten zu reichen.
  - `src/components/OfferPDF.tsx` (HTML-Vorschau) & `src/components/OfferReactPDF.tsx` (PDF-Export) — "30 Tage" Hardcoding entfernt; nutzt jetzt `offer.validUntil` oder den dynamischen Standardwert aus den Einstellungen.
  - `src/components/OfferPDF.tsx` — Layout-Fix: Footer wird via `flex-grow` auf dem Signatur-Block nach unten gedrückt; `white-space: nowrap` verhindert Zeilenumbrüche bei Beträgen in der Zusammenfassung.
- **Hintergrund:** Finale Feinjustierung des Angebots-Moduls für bessere UX und Konsistenz.

### [2026-05-12] - Angebote: Dashboard-Integration, Angebot→Rechnung-Konvertierung & Bugfixes
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/app/(dashboard)/dashboard/page.tsx` — `useOffers`-Hook integriert; Offer-Stats berechnet (`openOffersCount`, `openOffersAmount` für Status "sent"); "Angebot erstellen"-Button (outlined) neben "Rechnung erstellen" hinzugefügt; 4. Stat-Card "Offene Angebote" (blau, klickbar → `/offers`) hinzugefügt; Stats-Grid von `xl:grid-cols-3` auf `xl:grid-cols-4` erweitert.
  - `src/components/OfferPreviewModal.tsx` — Bugfix: Modal-Prop `offer` in `OffersPage` auf `offers.find(o => o.id === previewOffer?.id) ?? previewOffer` geändert, damit Status-Änderungen sofort im Modal reflektiert werden (vorher: veralteter Snapshot). Grüner "Als Rechnung erfassen"-Button für `accepted`-Angebote hinzugefügt: speichert `{ customerId, constructionProject, subjectExtra, projectId, processor, items }` in `sessionStorage` und navigiert zu `/invoices/new?fromOffer=1`. 4 ungenutzte Lucide-Icons entfernt.
  - `src/components/InvoiceForm.tsx` — Neuer `useEffect` für Angebot-Konvertierung: liest `sessionStorage.offerConversion` wenn URL-Param `fromOffer` vorhanden; befüllt `customerId`, `constructionProject`, `subjectExtra`, `projectId`, `processor` und `items`; löscht sessionStorage nach Anwendung; `offerConversionApplied`-Flag verhindert Doppel-Anwendung. Rechnungsnummer wird weiterhin normal aus Einstellungen generiert.
- **Keine neuen Supabase-Änderungen notwendig.**

### [2026-05-12] - Angebote: Einstellungen, Einleitungstext & PDF/Vorschau-Überarbeitung
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien erstellt:**
  - `src/hooks/useOfferSettings.ts` — SWR-Hook für Angebotseinstellungen. Liest `allSettings?.offerSettings`, speichert via `POST /api/settings` mit `type: 'offer'`. Default: `{ nextOfferNumber: 1, defaultIntroText: "Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Anfrage. Wir erlauben uns, Ihnen folgendes Angebot zu unterbreiten:" }`.
  - `src/components/OfferSettings.tsx` — Accordion-Einstellungsseite mit zwei Sektionen: "Allgemeine Angebotseinstellungen" (Nächste Angebotsnummer mit Formathinweis `JJJJ/A-XX`) und "Textbausteine" (Standard-Einleitungstext + Live-Vorschau).
- **Dateien geändert:**
  - `src/types/offer.ts` — `OfferSettings`-Interface hinzugefügt (`nextOfferNumber`, `defaultIntroText`); `introText?: string` zum `Offer`-Interface hinzugefügt; `performancePeriod` komplett entfernt.
  - `src/app/api/settings/route.ts` — GET: leeres `offerSettings`-Objekt wird auf `null` normalisiert. POST: neuer `type === 'offer'`-Zweig setzt `updatedSettings.offerSettings = payload.data`.
  - `src/app/(dashboard)/settings/page.tsx` — Neuer Tab "Angebot" zwischen "Stammdaten" und "Rechnung" hinzugefügt; `OfferSettings`-Komponente importiert und gerendert.
  - `src/components/OfferForm.tsx` — Komplett überarbeitet: `useOfferSettings`-Hook integriert; `useEffect` befüllt Angebotsnummer (`YYYY/A-XX`) und `introText` aus Einstellungen bei neuen Angeboten (einmalig via `settingsLoaded`-Flag); neues `introText`-Textarea-Feld zwischen Kundendaten und Positionen; Button "Standard-Text wiederherstellen"; nach erfolgreichem Speichern: `updateOfferSettings({ nextOfferNumber: n + 1 })`; `performancePeriod` vollständig entfernt.
  - `src/components/OfferReactPDF.tsx` — Zusatzinformationen-Block bereinigt: `Leistungszeitraum`, `E-Mail`, `Telefon` und `UID-Nummer` entfernt; linke Spalte zeigt nur `Baustelle` + `Gültig bis`; rechte Spalte nur `Datum` + `Bearbeiter`; `introText` wird zwischen Angebotstitel und Positionstabelle gerendert.
  - `src/components/OfferPreviewModal.tsx` — Komplett neu geschrieben als PDF-ähnliche HTML-Vorschau (794px A4, identisch zu `InvoicePreviewModal`): Toolbar mit Status-Badge, Status-Dropdown, "PDF öffnen" + "PDF Herunterladen"-Buttons; vollständiges Dokumentlayout (Header, Empfänger, Zusatzinfos, Titel, Einleitungstext, Tabelle, Zusammenfassung, Gültigkeitsblock, Signatur, Footer); Status-Änderung direkt via `updateOffer`.
- **Supabase SQL ausgeführt (2026-05-12):**
  ```sql
  ALTER TABLE offers ADD COLUMN IF NOT EXISTS "introText" TEXT;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS "offerSettings" JSONB DEFAULT '{}';
  ```
- **Hintergrund:** Erster Testlauf der Angebote-Funktion zeigte folgende Optimierungspunkte: fehlende Einstellungs-Integration für Angebotsnummer und Einleitungstext, Leistungszeitraum-Feld nicht relevant für Angebote, Vorschau-Modal optisch nicht auf dem Stand der Rechnung.

### [2026-05-12] - Angebote: Vollständige "Angebote"-Funktion implementiert
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien erstellt:**
  - `src/types/offer.ts` — `OfferStatus` (draft/sent/accepted/rejected/expired), `OfferItem`, `Offer`. Angepasst von `invoice.ts`: `offerNumber` statt `invoiceNumber`, `validUntil` hinzugefügt, Mahnwesen/paidAmount/billingType entfernt.
  - `src/hooks/useOffers.ts` — SWR-Hook mit `addOffer`, `updateOffer`, `deleteOffer`. Identisches Muster wie `useInvoices`.
  - `src/app/api/offers/route.ts` — GET/POST/DELETE gegen Supabase-Tabelle `offers`. Identisches Muster wie `invoices/route.ts`.
  - `src/components/OfferReactPDF.tsx` — `@react-pdf/renderer` Document. Basiert auf `InvoiceReactPDF.tsx`: Titel "Angebots-Nr.", Zahlungsblock durch Gültigkeitsblock ersetzt, Footer "Angebotsgültigkeit" statt "Zahlungskondition".
  - `src/components/OfferPreviewModal.tsx` — Modal ohne separate HTML-Vorschau-Komponente. Zeigt Angebotsdaten als Tabelle, Status-Änderung direkt im Modal, zwei Buttons: "PDF öffnen" + "PDF Herunterladen".
  - `src/components/OfferForm.tsx` — Formular basierend auf `InvoiceForm.tsx`, vereinfacht: kein Rechnungstyp, kein Mahnwesen, `validUntil`-Feld, Angebotsnummer auto-generiert als `YYYY/A-XX`.
  - `src/app/(dashboard)/offers/page.tsx` — Archiv-Seite mit Stats, Filter, Tabelle, Vorschau-Modal, Download.
  - `src/app/(dashboard)/offers/new/page.tsx` — Neue-Angebot-Seite.
  - `src/app/(dashboard)/offers/[id]/edit/page.tsx` — Bearbeitungsseite (nur Entwürfe).
- **Dateien geändert:**
  - `src/components/Sidebar.tsx` — `FileSignature`-Icon importiert; Menügruppe "Buchhaltung" um "Angebote"-Eintrag (mit Kindern "Neues Angebot" + "Angebotsarchiv") vor "Rechnungen" erweitert; `expandedItems` initial auf `["Angebote", "Rechnungen"]` gesetzt.
- **Supabase SQL ausgeführt (vorherige Session):** Tabelle `offers` wurde erstellt — Schema in `OFFERS_IMPLEMENTATION_LOG.md`.

### [2026-05-11] - EmployeeModal: "Mobile App"-Reiter wiederhergestellt
- **KI:** Claude Code
- **Relevanz:** [Beide]
- **Dateien geändert:**
  - `src/components/EmployeeModal.tsx` — Neuer Tab `{ id: "app-access", label: "Mobile App", icon: Smartphone }` ins TABS-Array eingefügt. Tab-Inhalt: Toggle für `appAccess.isAccessEnabled`, Read-only Verfügernummer (`appAccess.staffId`), 6-stelliges PIN-Feld (`appAccess.accessPIN`), Button "Neuen PIN generieren" ruft bestehende `generatePIN()`-Funktion auf. State-Handling über vorhandene `appAccess`-Struktur in `formData`.
- **Hintergrund:** Tab war aus UI entfernt worden, Datenstruktur + Backend-Logik (`appAccess`) war aber bereits vollständig vorhanden.

### [2026-05-11] - Projekte: Zahlungsplan-Button-Bug behoben
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/components/projects/ProjectDetails.tsx` — `<PaymentPlanModal>`-Komponente war importiert und der State (`isPaymentPlanModalOpen`) war vorhanden, aber das JSX-Element wurde **nie gerendert**. Modal jetzt am Ende des Renders eingefügt → Button funktioniert.
- **Hintergrund:** Klassischer "missing render"-Bug. Klick auf "Zahlungsplan erstellen" hat State gesetzt, aber da kein Modal im DOM war, passierte nichts.

### [2026-05-11] - Zeit-Archiv: Vorschau, direkter Download & Navigation repariert
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/components/TimesheetArchiveList.tsx` — Drei Aktionen komplett überarbeitet:
    1. **Vorschau** (neuer blauer Button): Öffnet `TimeTrackingPreviewModal` mit HTML-Vorschau.
    2. **Download** (Icon-Button): Generiert jetzt direkt ein PDF via `@react-pdf/renderer` + `TimesheetReactPDF` und speichert es als `Stundenzettel_<Name>_<Monat>.pdf` — ohne Modal. Spinner während Generierung.
    3. **Öffnen** (Button): Navigiert jetzt zu `/time-tracking/${employeeId}` (vorher nur `/time-tracking`).
  - `src/components/TimeTrackingPDF.tsx` — Padding & Schriftgrößen reduziert (`padding: 48px 56px`, Zeilenhöhe `3.5px`, Header-Margin `32px`) damit alle 31 Tage auf eine A4-Seite passen.

### [2026-05-11] - Dashboard "Übersicht": Download-Icon durch Vorschau-Button ersetzt
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/app/(dashboard)/dashboard/page.tsx` — In der "Letzte Rechnungen"-Tabelle: Download-Icon-Button durch beschrifteten "Vorschau"-Button (Eye-Icon + Label) ersetzt. Öffnet `InvoicePreviewModal`. Import: `Download` → `Eye`.

### [2026-05-11] - Zeiterfassung PDF: Neues @react-pdf/renderer System
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/components/TimesheetReactPDF.tsx` *(neu)* — `@react-pdf/renderer` Document-Komponente für Stundenzettel. Gleiche Berechnungslogik wie `TimeTrackingPDF.tsx`, aber als echtes PDF mit selektierbarem Text. Built-in Helvetica-Fonts. Alle Style-Werte mit Kommentaren versehen (← Pfeile) damit User Abstände/Schriftgrößen selbst anpassen kann.
  - `src/components/TimeTrackingPreviewModal.tsx` — `TimeTrackingPrintHandler` komplett entfernt. "PDF Erstellen"-Button nutzt jetzt dynamischen Import von `@react-pdf/renderer` + `TimesheetReactPDF`. PDF öffnet in neuem Tab (identisch zu `InvoicePreviewModal`).
- **Hintergrund:** Altes System (`TimeTrackingPrintHandler`) nutzte Browser-Print-Dialog → kein echter PDF-Download. Neues System erzeugt echte PDFs mit selektierbarem Text.

---

## Aktueller Status: Mobile App Integration (In Arbeit)
- **Verfügernummer:** Logik auf 6-stellige Nummern (ab 100001) umgestellt. `staffId` in `appAccess` wird automatisch generiert.
- **Datenbank:** Tabellen `einsaetze` und `project_photos` sowie `synced`-Spalten für mobile Synchronisation vorbereitet.
- **Storage:** Buckets `avatars`, `project-photos` und `employee-docs` müssen in Supabase erstellt werden.
- **Auth:** Login erfolgt über eine Custom-Logic (Staff-ID + PIN). Die Web-App speichert diese Daten im JSONB-Feld `appAccess` der `employees` Tabelle.
- **Push Notifications:** Noch keine API implementiert (geplant für 1.3.0).

---

## Log-Einträge

### [2026-05-10] - InvoiceReactPDF: Layout nach Musterrechnung redesigned
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/components/InvoiceReactPDF.tsx` — Komplett neu geschrieben nach einem Muster-PDF (RASNO BAU GMBH Stil). CDN-Font-Registration entfernt, eingebaute Helvetica-Varianten (`Helvetica`, `Helvetica-Bold`, `Helvetica-BoldOblique`). Layout: Firmenname-Fallback mit `//` + rote Tagline, Adressblock oben rechts mit schwarzer Grenzlinie, Empfänger-Bereich, Zusatzinformationen-Badge (schwarz, abgerundet), zweispaltiges Info-Grid, fette Titelzeile, schwarze Tabellen-Kopfzeile, rechts ausgerichtete Zusammenfassung, zentrierter Zahlungsblock, Signatur, Footer mit Zahlungskondition + Firmen-Grid.
- **Hintergrund:** User hat Muster-PDF hochgeladen und möchte das exakt dieses Design in den heruntergeladenen Rechnungen widergespiegelt wird.

### [2026-05-10] - PDF-Export: Zurück zu @react-pdf/renderer (selektierbarer Text)
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/components/InvoicePreviewModal.tsx` — `handlePrint` nutzt jetzt wieder `@react-pdf/renderer` (`pdf()` + `InvoiceReactPDF`) als dynamischen Import. Kein `html2canvas` mehr. Öffnet PDF in neuem Tab mit selektierbarem Text.
  - `src/app/(dashboard)/invoices/page.tsx` — Download-Button ruft `handleDownload()` auf, das ebenfalls `@react-pdf/renderer` nutzt und das PDF direkt als `Rechnung_<Nr>.pdf` speichert. Mehrere Rechnungen können gleichzeitig heruntergeladen werden (`downloadingIds` Set).
- **Hintergrund:** `html2canvas` erzeugte nur einen Bild-Screenshot (kein selektierbarer Text). Wir sind zum `@react-pdf/renderer`-Ansatz zurückgekehrt, der echte PDF-Dokumente mit eingebettetem Text generiert.

### [2026-05-10] - Rechnungsliste: Download-Button & 1:1 PDF-Export
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/components/InvoicePreviewModal.tsx` — Zusätzlicher `captureRef` auf einem versteckten Offscreen-Div (`position:fixed; left:-9999px; width:794px`), das eine zweite `InvoicePDF`-Instanz in exakter A4-Breite rendert. `handlePrint` nutzt jetzt diesen `captureRef` statt dem sichtbaren Vorschau-Div — dadurch ist das PDF pixel-identisch zur Vorschau.
  - `src/app/(dashboard)/invoices/page.tsx` — Neuer Download-Button (Download-Icon) in der Aktionen-Spalte neben "Vorschau". Klick setzt `downloadTarget`, was ein verstecktes Offscreen-Slot mit `InvoicePDF` bei 794px rendert; ein `useEffect` feuert nach dem Render, erzeugt das PDF via `html2canvas` + `jsPDF` und speichert es direkt als `Rechnung_<Nr>.pdf`.
- **Hintergrund:** `html2canvas` muss das Element bei exakter A4-Breite (794px bei 96 DPI) erfassen, sonst stimmen die Proportionen nicht. Das in einem `overflow-y-auto`-Container liegende Vorschau-Div hatte keine feste Breite.

### [2026-05-10] - Rechnungserstellung: Datenbank-Schema & Fehlerbehandlung
- **KI:** VS Code Assistent
- **Relevanz:** [Beide]
- **Aktionen:** 
  - Die Tabelle `invoices` in Supabase benötigt viele neue Spalten (customerName, billingType, pdfUrl etc.), damit das Finalisieren klappt.
  - `src/hooks/useInvoices.ts` angepasst: Fehler werden jetzt korrekt an die UI weitergegeben, anstatt sie zu verschlucken. Das verhindert, dass die Rechnungsnummer hochzählt, wenn das Speichern fehlschlägt.
  - **Vollständiger DB-Check durchgeführt:** 
    - Kunden, Mitarbeiter, Fahrzeuge und Leistungen sind korrekt konfiguriert.
    - In der Tabelle `projects` fehlt noch die Spalte `diaryEntries` (Bautagebuch).
- **Mitarbeiter-Verwaltung:** Beschäftigungsstatus auf "Vollzeit" und "Teilzeit" begrenzt (andere Optionen wie Freelancer entfernt).
- **Nächste Schritte:** User führt SQL-Updates für `invoices` und `projects` aus.

### [2026-05-10] - Datenbank Schema Update für time_entries
- **KI:** VS Code Assistent
- **Relevanz:** [Beide]
- **Aktionen:** 
  - Die Tabelle `time_entries` in Supabase wurde manuell vom User um fehlende Spalten erweitert (`breakDuration`, `badWeatherDuration`, `overtime`, `duration`, `location`).
  - Dadurch stürzt der Speichervorgang in der Web-App nicht mehr ab (vorher: `PGRST204 Could not find the 'breakDuration' column`). Beide Apps können diese Spalten jetzt nutzen.

### [2026-05-10] - PDF-Generierung: Vorschau-identischer Export
- **KI:** Claude Code
- **Relevanz:** [Nur Web App]
- **Dateien geändert:**
  - `src/components/InvoicePreviewModal.tsx` — `handlePrint` nutzt jetzt `html2canvas` + `jsPDF` direkt auf dem HTML-Vorschau-Div (`InvoicePDF` via `pdfRef`). `@react-pdf/renderer` und `InvoiceReactPDF` werden nicht mehr verwendet (Imports entfernt). Mehrseitige Rechnungen werden unterstützt.
- **Hintergrund:** `@react-pdf/renderer` hat eine eigene Layout-Engine, die nicht mit Browser-HTML übereinstimmt. `html2canvas` macht einen Screenshot des exakt gerenderten HTML — PDF ist damit pixel-identisch zur Vorschau.

### [2026-05-10] - Zeiterfassung: Speichern & Abschließen repariert
- **KI:** Claude Code
- **Relevanz:** [Beide]
- **Dateien geändert:**
  - `src/hooks/useTimeEntries.ts` — `finalizeMonth` / `reopenMonth` nutzen jetzt `activeUserId` statt `user.id` (behebt Silent-Failure für Employee-Sessions); beide Funktionen werfen jetzt echte Fehler.
  - `src/app/api/timesheets/route.ts` — POST-Route hat jetzt denselben `payload.userId`-Fallback wie die time-entries-Route, damit die API auch ohne gültiges Session-Cookie Daten speichern kann.
  - `src/app/(dashboard)/time-tracking/[employeeId]/page.tsx` — `performSave` liest jetzt aus einem `useRef` (kein Stale-Closure-Risiko mehr), übergibt `userId` explizit im Fetch-Body, wartet auf `refreshEntries()` bevor `unsavedChanges` geleert wird (verhindert leere Tabelle nach dem Speichern).
- **Hintergrund:** Supabase-Schema unverändert. Die `time_entries`- und `timesheets`-Tabellen werden von beiden Apps genutzt werden.

### [2026-05-10] - Initialisierung des Protokolls
- **KI:** VS Code Assistent
- **Relevanz:** [Beide]
- **Aktionen:** 
  - Erstellung und Update dieses Sync-Dokuments zur projektübergreifenden Zusammenarbeit.
  - Neue Regel zur "Relevanz" hinzugefügt.
- **Nächste Schritte:** Warten auf die Zusammenfassung der mobilen App-Architektur vom User.
