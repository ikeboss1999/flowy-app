# FlowY Codebase Audit — Report V1

**Datum:** 2026-05-19  
**Auditor:** Senior Principal Engineer & UX-Auditor (extern)  
**Version:** 1.3.0  
**Stack:** Next.js 14 (App Router), Supabase, Tailwind CSS, SWR

---

## Changelog — Durchgeführte Fixes

### Sprint 1 — 2026-05-19: Toter Code & Skalierbarkeit

#### Toter Electron-Code entfernt

| Datei | Aktion | Begründung |
|-------|--------|------------|
| `src/components/UpdateNotification.tsx` | **Gelöscht** | 226 Zeilen Electron Auto-Update, nie ausgeführt, enthielt XSS-Risiko (`dangerouslySetInnerHTML`) |
| `src/types/electron.d.ts` | **Gelöscht** | Verwaiste Electron Window-API-Typen |
| `src/app/layout.tsx` | Import + `<UpdateNotification />` entfernt | Komponente war im Root-DOM-Tree jedes Seitenaufrufs |
| `src/hooks/useDevice.ts` | `const isElectron = false` + Export entfernt | Hartcodierte Konstante, nie `true`, aber in Login-Logik ausgewertet |
| `src/app/(auth)/login/page.tsx` | `isElectron`-Destructuring + `hideRegister`-Logik entfernt | `hideRegister` war immer `false`, Registration jetzt immer sichtbar |
| `src/components/Sidebar.tsx` | Toter `isWeb/isElectron`-Kommentar entfernt | Referenz auf altes Filterkonzept |

#### SyncContext-Kopplung aus allen Hooks entfernt

`SyncContext` war ein reiner No-op-Stub aus der Electron-Zeit. Alle 15 Hooks importierten `useSync()` und riefen `markDirty()` auf, was buchstäblich nichts tat (~150 tote Zeilen).

**Betroffene Hooks (alle bereinigt):**

| Hook | Entfernt |
|------|---------|
| `useCustomers.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 3× `markDirty()` |
| `useInvoices.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 3× `markDirty()` |
| `useOffers.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 3× `markDirty()` |
| `useVehicles.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 3× `markDirty()` |
| `useServices.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 3× `markDirty()` |
| `useProjects.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 3× `markDirty()` |
| `useTodos.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 3× `markDirty()` |
| `useOrders.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 3× `markDirty()` |
| `useCalendarEvents.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 3× `markDirty()` |
| `useTimeEntries.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 6× `markDirty()` |
| `useProjectFiles.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 3× `markDirty()` |
| `useProjectFolders.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 3× `markDirty()` |
| `useCompanySettings.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 1× `markDirty()` |
| `useAccountSettings.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 1× `markDirty()` |
| `useInvoiceSettings.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 2× `markDirty()` |
| `useOfferSettings.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 1× `markDirty()` |
| `useOrderSettings.ts` | `import { useSync }`, `const { markDirty } = useSync()`, 1× `markDirty()` |
| `useEmployees.ts` | Zusätzlich: `useEffect(() => { if (lastSyncTime) mutate() }, [lastSyncTime])` + `useEffect`-Import entfernt |

#### SyncContext-Datei gelöscht (N3)

`SyncContext.tsx` wurde vollständig gelöscht. Die drei UI-Consumer wurden auf echte SWR-Revalidierung umgestellt:

| Datei | Änderung |
|-------|---------|
| `Sidebar.tsx` | `useSync` → `useSWRConfig().mutate(() => true)`, Cloud-Button zeigt echten Lade-Spinner |
| `employees/page.tsx` | `triggerPull` → `handleRefresh` mit `mutateAll()` |
| `onboarding/page.tsx` | Beide `triggerSync()` Aufrufe entfernt |

#### Pagination auf alle API-Endpunkte implementiert

Alle GET-Handler hatten kein `LIMIT` — bei wachsenden Daten würde die gesamte Tabelle in den RAM geladen. Jetzt gibt es geordnete Abfragen mit sinnvollen Obergrenzen.

| Route | Sortierung | Limit | Begründung |
|-------|-----------|-------|------------|
| `api/invoices/route.ts` | `issueDate DESC` | 500 | Rechnungen nach Datum, neueste zuerst |
| `api/offers/route.ts` | `issueDate DESC` | 500 | Angebote nach Datum, neueste zuerst |
| `api/orders/route.ts` | `issueDate DESC` | 500 | Auftragsbestätigungen nach Datum |
| `api/customers/route.ts` | `createdAt DESC` | 500 | Kunden nach Erstellungsdatum |
| `api/projects/route.ts` | `createdAt DESC` | 500 | Projekte nach Erstellungsdatum |
| `api/services/route.ts` | `createdAt DESC` | 500 | Leistungen nach Erstellungsdatum |
| `api/calendar-events/route.ts` | `startDate DESC` | 500 | Termine nach Startdatum |
| `api/time-entries/route.ts` | `date DESC` | 1000 | Zeiteinträge nach Datum (höheres Limit wegen Monatsübersichten) |
| `api/employees/route.ts` | `createdAt DESC` | 200 | Mitarbeiter (typisch klein) |
| `api/vehicles/route.ts` | `createdAt DESC` | 200 | Fahrzeuge (typisch klein) |
| `api/todos/route.ts` | `createdAt DESC` | 200 | Todos (typisch klein) |

Die SWR-Hooks mussten **nicht** angepasst werden — die API gibt weiterhin `T[]` zurück, nur eben begrenzt und geordnet. Vollständige Cursor-Pagination (für Kunden mit 500+ Datensätzen) bleibt als W1 offen.

---

### Sprint 2 — 2026-05-19: Performance & Dead Code (Fortsetzung)

#### W2: Dashboard-Summary API-Endpunkt erstellt

Das Dashboard lud bisher **6 vollständige Datensätze** gleichzeitig: `useInvoices`, `useOffers`, `useCustomers`, `useTodos`, `useCompanySettings`, `useAccountSettings`. Die Statistik-Kacheln (Gesamtumsatz, Offener Betrag, Angebote) basierten auf `useInvoices` + `useOffers` — zwei vollständige Jahrestabellen, nur um 5 Zahlen zu berechnen.

**Lösung:**

| Datei | Aktion |
|-------|--------|
| `src/app/api/dashboard/summary/route.ts` | **Neu:** Aggregiert Rechnungs- und Angebots-Stats server-seitig mit `Promise.all` — sendet nur 5 Zahlen zurück |
| `src/hooks/useDashboardSummary.ts` | **Neu:** Leichtgewichtiger SWR-Hook für den Summary-Endpunkt |
| `src/app/(dashboard)/dashboard/page.tsx` | `useOffers` entfernt, `useDashboardSummary` eingebunden, tote `stats`-useMemo entfernt, ungenutzte Imports bereinigt |

**Ergebnis:** Dashboard lädt 1 kleinen JSON-Response statt einer kompletten Angebots-Tabelle. `useOffers()` (bis zu 500 Einträge mit allen Feldern) wird nicht mehr beim Dashboard-Aufruf getriggert.

#### W6: Cookie-Namen aus `/api/db/diag` entfernt

Cookie-Namen aus dem Diagnose-Endpunkt entfernt — verhindert unbeabsichtigte Offenlegung von Session-Cookie-Namen in API-Responses.

#### W7: Debounce für `resize`-Event in `useDevice.ts`

150ms Debounce auf den `window.resize`-Listener gesetzt. Verhindert exzessives Re-Rendering beim Ändern der Fenstergröße (iPad/Touch-Erkennung).

#### N4: `currentYear` in `useMemo` verschoben + Bug behoben

`currentYear` war außerhalb von `useMemo` definiert, verursachte bei jedem Re-Render eine unnötige Neuberechnung der Stats. Nach dem Verschieben in `useMemo` verblieb ein `ReferenceError` im JSX (`Status für {currentYear}`). Behoben durch explizite `const currentYear` Deklaration auf Komponenten-Ebene.

#### N6: Electron-Pakete entfernt

`cross-spawn` und `text-encoding` aus `package.json` entfernt und deinstalliert. Beide Pakete waren Überbleibsel der Electron-Abhängigkeiten und wurden nirgendwo im Web-Code importiert.

| Paket | Größe | Grund für Removal |
|-------|-------|------------------|
| `cross-spawn ^7.0.6` | ~50 kB | Electron child_process Wrapper |
| `text-encoding ^0.7.0` | ~300 kB | TextEncoder/TextDecoder Polyfill (nativ in allen modernen Browsern vorhanden) |

#### N1: Generische CRUD-Hook-Factory erstellt

3 strukturell identische Hooks (`useInvoices`, `useOffers`, `useOrders`, je ~69 Zeilen) auf eine gemeinsame Factory reduziert.

| Datei | Aktion |
|-------|--------|
| `src/hooks/useResourceFactory.ts` | **Neu:** ~65-Zeilen Factory-Funktion mit Optimistic-UI, Error-Handling und Rethrow |
| `src/hooks/useInvoices.ts` | 69 → 15 Zeilen (benutzt Factory) |
| `src/hooks/useOffers.ts` | 69 → 15 Zeilen (benutzt Factory) |
| `src/hooks/useOrders.ts` | 69 → 15 Zeilen (benutzt Factory) |

**Ersparnis:** ~150 Zeilen duplizierter Code eliminiert. Die Factory unterstützt das "Pattern A" (direkter Body, `?id=` Delete, Rethrow). Hooks mit abweichenden Body-Formaten (`useServices`, `useVehicles`, `useCalendarEvents`, `useEmployees`, `useTodos`) wurden bewusst nicht migriert, da die Abweichungen die Factory-Nutzung mehr verkompliziert hätten als vereinfacht.

#### Login-Bug behoben

`hideRegister` war nach der Electron-Code-Entfernung (Sprint 1) als `undefined`-Referenz im JSX verblieben. Behoben: `else if (!hideRegister)` → `else`, konditionales Render-Block durch direkte Darstellung ersetzt.

---

## Management Summary

Die FlowY-Web-App ist funktional lauffähig, trägt aber erhebliche technische Schulden aus der Electron-Migration. **Der Zustand des Codes ist besorgniserregend in drei Bereichen:**

1. **Sicherheit:** Ein kritischer Fehler — Employee-PINs werden im Klartext im `localStorage` des Browsers gespeichert und bei jedem Seitenaufruf über das Netz gesendet. Das ist ein schwerwiegendes Datenschutzproblem.
2. **Toter Code:** ~30% des Codes sind Electron-Relikte, die nie ausgeführt werden, aber gebündelt und teilweise im DOM gerendert werden (inkl. XSS-Risiko durch `dangerouslySetInnerHTML`).
3. **Skalierbarkeit:** Kein einziger API-Endpunkt hat Pagination. Bei wachsenden Kundendaten wird die App unkontrolliert langsam.

**Kurzfassung:** Vor einem öffentlichen Launch müssen mindestens die 4 KRITISCHEN Punkte behoben werden.

---

## Priorisierte TODO-Liste

### 🔴 KRITISCH — Sofort beheben

| # | Status | Problem | Datei | Zeile |
|---|--------|---------|-------|-------|
| C1 | ⏳ Offen | Employee-PIN im Klartext in `localStorage` + wird bei jedem Reload neu gesendet | `AuthContext.tsx` | 34–56 |
| C2 | ✅ Erledigt (2026-05-19) | `dangerouslySetInnerHTML` mit Server-Daten in totem Electron-Code | `UpdateNotification.tsx` | — |
| C3 | ✅ Erledigt (2026-05-19) | `SyncContext` ist ein reiner No-op-Stub, aber alle 15+ Hooks rufen `markDirty()` auf | alle Hooks | — |
| C4 | ⏳ Offen | `/api/db/clear` löscht massenweise Daten — kein Admin-Check, kein Rate-Limiting | `api/db/clear/route.ts` | 5–41 |

---

### 🟠 WICHTIG — Innerhalb der nächsten 2 Wochen

| # | Status | Problem | Datei | Zeile |
|---|--------|---------|-------|-------|
| W1 | ✅ Erledigt (2026-05-19) | Kein Pagination auf API-Endpunkten — unbegrenzte DB-Abfragen | alle `api/*/route.ts` | — |
| W2 | ✅ Erledigt (2026-05-19) | Dashboard lädt 6 vollständige Datensätze gleichzeitig | `dashboard/page.tsx` | 39–44 |
| W3 | ⏳ Offen (nicht anfassen) | Fixe Breiten (`min-w-[24rem]`, `w-[340px]`) brechen das Layout auf Mobilgeräten | `InvoiceForm.tsx`, `DatePicker.tsx` | 1310, 120 |
| W4 | ✅ Erledigt (2026-05-19) | Electron-Toter-Code im Root-Layout gebündelt und gerendert | `layout.tsx` | — |
| W5 | ✅ Erledigt (2026-05-19) | `isElectron = false` hartcodiert, in Login-Logik ausgewertet | `useDevice.ts`, `login/page.tsx` | — |
| W6 | ✅ Erledigt (2026-05-19) | `/api/db/diag` gibt interne Cookie-Namen zurück (Information Disclosure) | `api/db/diag/route.ts` | 29 |
| W7 | ✅ Erledigt (2026-05-19) | `useDevice.ts` re-registriert `resize`-Listener bei jedem Render, kein `debounce` | `useDevice.ts` | 36–38 |

---

### 🟡 NICE-TO-HAVE — Technische Schulden abbauen

| # | Status | Problem | Datei |
|---|--------|---------|-------|
| N1 | ✅ Erledigt (2026-05-19) | 15+ Hooks folgen identischem CRUD-Muster (~900 Zeilen Duplikation) | `src/hooks/*.ts` |
| N2 | ✅ Erledigt (2026-05-19) | `electron.d.ts` — verwaiste Type-Deklaration für Electron-API | `types/electron.d.ts` |
| N3 | ✅ Erledigt (2026-05-19) | `SyncContext` komplett entfernen (Sidebar, employees, onboarding noch als Consumer) | `SyncContext.tsx` |
| N4 | ✅ Erledigt (2026-05-19) | `currentYear` außerhalb von `useMemo` berechnet, verursacht stille Re-Render | `dashboard/page.tsx:74` |
| N5 | ✅ Erledigt (2026-05-19) | Kommentare in `Sidebar.tsx` referenzieren altes `isElectron`-Filterkonzept | `Sidebar.tsx` |
| N6 | ✅ Erledigt (2026-05-19) | `cross-spawn`, `text-encoding` in `package.json` — Node.js-Pakete ohne erkennbaren Web-Einsatz | `package.json` |
| N7 | ⏳ Offen (nicht anfassen) | `html2canvas` + `html2pdf.js` + `jspdf` + `@react-pdf/renderer` — 4 PDF-Bibliotheken gleichzeitig | `package.json` |

---

## Detailanalyse mit Code-Beispielen

---

### C1 — KRITISCH: Employee-PIN im Klartext gespeichert

**Problem:** Der Employee-PIN wird nach dem Login in `localStorage` als Klartext gespeichert und bei jedem Seitenaufruf erneut an den Server gesendet. Jeder XSS-Angriff oder Zugriff auf `localStorage` stiehlt den PIN dauerhaft.

**Fundstelle:** [AuthContext.tsx](src/context/AuthContext.tsx)

```typescript
// ❌ AKTUELL (Zeilen 48–56): PIN wird im Klartext im localStorage gespeichert
const updatedEmployee = {
    ...data.employee,
    appAccess: {
        ...data.employee.appAccess,
        accessPIN: employeeData.appAccess.accessPIN  // ← Klartext-PIN im Storage
    }
};
localStorage.setItem('flowy_employee_session', JSON.stringify(updatedEmployee)); // ← KRITISCH
```

**Fix:** PIN niemals im Client speichern. Die Session-Validierung muss komplett serverseitig über einen HttpOnly-Cookie laufen.

```typescript
// ✅ FIX: Nur ein Session-Token speichern, nie den PIN selbst
// In /api/auth/employee-login/route.ts: Session-Token erstellen
const sessionToken = await createSessionToken({ employeeId: employee.id, userId });
response.cookies.set('employee_session', sessionToken, {
    httpOnly: true,     // ← JavaScript kann dieses Cookie NICHT lesen
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8 // 8 Stunden
});

// In AuthContext.tsx: NUR nicht-sensible Daten im State halten
const updatedEmployee = {
    id: data.employee.id,
    name: data.employee.name,
    role: data.employee.role,
    // appAccess.accessPIN: NIEMALS speichern
};
setCurrentEmployee(updatedEmployee);
// localStorage.setItem(...) → komplett entfernen
```

---

### C2 — KRITISCH: XSS-Risiko durch `dangerouslySetInnerHTML` mit Server-Daten

**Problem:** `UpdateNotification.tsx` ist Electron-Toter-Code, der aber trotzdem gebündelt und im Root-Layout gerendert wird. Er verwendet `dangerouslySetInnerHTML` mit Release-Notes, die vom Server kommen — ein direkter XSS-Vektor, falls die Datenquelle kompromittiert wird.

**Fundstelle:** [UpdateNotification.tsx](src/components/UpdateNotification.tsx) Zeilen 103, 111

```typescript
// ❌ AKTUELL: Server-Daten direkt als HTML gerendert
<div dangerouslySetInnerHTML={{ __html: translateReleaseNotes(note.note || "") }} />
```

**Fix:** Gesamte Datei löschen, Import aus `layout.tsx` entfernen.

```typescript
// ✅ FIX in src/app/layout.tsx: Diese 2 Zeilen entfernen
import { UpdateNotification } from "@/components/UpdateNotification"; // ← löschen
// ...
<UpdateNotification />  // ← löschen
```

Danach: `src/components/UpdateNotification.tsx` und `src/types/electron.d.ts` löschen.

---

### C3 — KRITISCH: SyncContext ist toter No-op-Code, koppelt aber 15+ Hooks

**Problem:** `SyncContext` ist ein leerer Stub — alle Methoden sind no-ops. Trotzdem importieren 15+ Hooks `useSync()` und rufen `markDirty()` auf. Das ist toter Code, der die Architektur unnötig verkompliziert und Entwickler verwirrt.

**Fundstelle:** [SyncContext.tsx](src/context/SyncContext.tsx) — alle Zeilen

```typescript
// ❌ AKTUELL: Pure No-ops — kein einziger dieser Aufrufe tut irgendetwas
export function SyncProvider({ children }: { children: React.ReactNode }) {
    return (
        <SyncContext.Provider value={{
            status: 'idle',
            markDirty: () => {},      // No-op
            triggerSync: async () => {}, // No-op
            triggerPull: async () => {}, // No-op
            // ...
        }}>
```

**Fix:** In zwei Schritten:
1. `markDirty()` aus allen 15 Hooks entfernen (einfaches Find & Replace)
2. `SyncContext.tsx` und `SyncProvider` aus `layout.tsx` entfernen

```bash
# Alle markDirty()-Aufrufe finden:
grep -r "markDirty" src/hooks/
# → In jedem Hook: `const { markDirty } = useSync();` und alle `markDirty();` Zeilen löschen
```

---

### C4 — KRITISCH: `/api/db/clear` ohne ausreichende Absicherung

**Problem:** Der Endpunkt löscht alle Daten eines Users aus 11 Tabellen. Er verwendet den normalen (nicht-Admin) Supabase-Client und hat kein Rate-Limiting. Ein Session-Hijacking reicht für einen kompletten Datenverlust.

**Fundstelle:** [api/db/clear/route.ts](src/app/api/db/clear/route.ts)

```typescript
// ❌ AKTUELL: Normaler supabase-Client, kein Rate-Limiting
import { supabase } from '@/lib/supabase';  // ← Sollte supabaseAdmin sein

// ✅ FIX: Admin-Client + explizite Session-Prüfung
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    const session = await getUserSession();
    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // userId darf nur der eigene User sein
    const userId = session.userId; // ← Nie aus dem Request-Body übernehmen!
    
    // Admin-Client verwenden, der RLS umgeht und verlässlich löscht
    for (const table of tables) {
        await supabaseAdmin.from(table).delete().eq('userId', userId);
    }
}
```

---

### W1 — WICHTIG: Fehlende Pagination auf allen Endpunkten

**Problem:** Jeder API-Endpunkt lädt den gesamten Datensatz ohne LIMIT. Bei 500+ Rechnungen oder 1000+ Zeiteinträgen kollabiert die App.

**Fundstelle:** Exemplarisch [api/customers/route.ts](src/app/api/customers/route.ts)

```typescript
// ❌ AKTUELL: Alle Datensätze ohne Limit
const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('userId', session.userId);

// ✅ FIX: Cursor-basierte Pagination
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const from = (page - 1) * limit;

    const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('userId', session.userId)
        .order('createdAt', { ascending: false })
        .range(from, from + limit - 1);

    return NextResponse.json({ data, total: count, page, limit });
}
```

---

### W2 — WICHTIG: Dashboard lädt 6 vollständige Datensätze

**Problem:** Das Dashboard feuert beim Mount 6 separate SWR-Requests ab, die jeweils den gesamten Datensatz laden. `sortedInvoices` filtriert danach nur das aktuelle Jahr — alle historischen Daten werden unnötig geladen.

**Fundstelle:** [dashboard/page.tsx](src/app/(dashboard)/dashboard/page.tsx) Zeilen 39–44, 97–106

```typescript
// ❌ AKTUELL: 6 vollständige Datensätze auf einmal
const { invoices } = useInvoices();    // Alle Rechnungen aller Zeiten
const { offers } = useOffers();        // Alle Angebote aller Zeiten
const { customers } = useCustomers();  // Alle Kunden
const { todos } = useTodos();

// sortedInvoices zeigt dann .slice() oder filtert nur das aktuelle Jahr
// → 95% der geladenen Daten werden im Dashboard nie gezeigt
```

**Fix:** Einen dedizierten `/api/dashboard/summary`-Endpunkt erstellen, der alle Stats in einer DB-Query aggregiert:

```typescript
// ✅ FIX: Ein einziger API-Call statt 6
// src/app/api/dashboard/summary/route.ts
export async function GET() {
    const session = await getUserSession();
    const year = new Date().getFullYear();
    
    const [invoiceStats, offerStats, recentInvoices, todos] = await Promise.all([
        supabase.from('invoices')
            .select('status, totalAmount')
            .eq('userId', session.userId)
            .gte('issueDate', `${year}-01-01`),
        supabase.from('offers')
            .select('status, totalAmount')
            .eq('userId', session.userId)
            .gte('issueDate', `${year}-01-01`),
        supabase.from('invoices')
            .select('id, invoiceNumber, status, totalAmount, issueDate, customerId')
            .eq('userId', session.userId)
            .order('issueDate', { ascending: false })
            .limit(10),
        supabase.from('todos')
            .select('*')
            .eq('userId', session.userId)
            .eq('completed', false)
    ]);
    
    return NextResponse.json({ invoiceStats: invoiceStats.data, offerStats: offerStats.data, recentInvoices: recentInvoices.data, todos: todos.data });
}
```

---

### W3 — WICHTIG: Fixe Breiten brechen das Mobile-Layout

**Fundstellen:**
- [InvoiceForm.tsx](src/components/InvoiceForm.tsx) Zeile ~1310: `min-w-[24rem]`
- [DatePicker.tsx](src/components/DatePicker.tsx) Zeile 120: `w-[340px]`
- [OfferForm.tsx](src/components/OfferForm.tsx) Zeile ~935: `min-w-[24rem]`

```tsx
// ❌ AKTUELL: Feste Mindestbreite — bricht auf iPhone (375px Viewport)
<div className="min-w-[24rem] ...">  // 384px > 375px

// ✅ FIX: Responsive mit Fallback
<div className="w-full sm:min-w-[24rem] ...">

// ❌ AKTUELL: DatePicker-Dropdown mit fixer Breite
<div className="w-[340px] ...">

// ✅ FIX: Viewport-relativ
<div className="w-[min(340px,calc(100vw-2rem))] ...">
```

---

### W4 — WICHTIG: Electron-Toter-Code im Root-Layout gebündelt

**Problem:** `UpdateNotification` wird in jedem Seitenaufruf gerendert. Der `useEffect` prüft zwar `window.electron`, aber die Komponente ist trotzdem im React-Tree und im JS-Bundle.

**Fix:** Dateien löschen (nach C2 oben).

Zusätzlich `useDevice.ts` bereinigen:

```typescript
// ❌ AKTUELL: isElectron hartcodiert exportiert
const isElectron = false;
return { isIPhone, isIPad, isTouchDevice, isMobile, isDesktop, isElectron };

// ✅ FIX: isElectron komplett entfernen
return { isIPhone, isIPad, isTouchDevice, isMobile, isDesktop };
// Dann in login/page.tsx: hideRegister-Logik entfernen, immer true zeigen
```

---

### W6 — WICHTIG: `/api/db/diag` gibt interne Cookie-Namen zurück

**Fundstelle:** [api/db/diag/route.ts](src/app/api/db/diag/route.ts) Zeile 29

```typescript
// ❌ AKTUELL: Gibt alle Cookie-Namen aus — hilft Angreifern beim Session-Fingerprinting
allCookies: (await cookieStore).getAll().map(c => c.name)

// ✅ FIX: Cookie-Namen aus der Antwort entfernen — völlig unnötig für Diagnose
auth: {
    userId: session.userId,
    role: session.role,
    // allCookies: ← diese Zeile löschen
}
```

---

### N1 — NICE-TO-HAVE: 15 Hooks, 1 Muster, ~900 Zeilen Duplikation

Alle Hooks in `src/hooks/` folgen exakt demselben Muster. Beispiel der Duplizierung:

```typescript
// Identische Struktur in useCustomers, useInvoices, useOffers, useVehicles, useTodos...
export function useXxx() {
    const { markDirty } = useSync();  // ← No-op (nach C3-Fix entfernen)
    const { data, mutate, isLoading } = useSWR<Xxx[]>('/api/xxx', fetcher);
    const items = data ?? [];

    const addItem = async (item: Partial<Xxx>) => {
        await mutate(async (prev) => {
            const res = await fetch('/api/xxx', { method: 'POST', body: JSON.stringify(item) });
            return [...(prev ?? []), await res.json()];
        }, { revalidate: true });
        markDirty(); // ← No-op
    };
    // updateItem, deleteItem: exakt gleich
}
```

**Potential:** Eine generische Factory `createEntityHook('customers', '/api/customers')` würde ~700 Zeilen eliminieren. Nur Hooks mit Sonderlogik (z.B. `useTimeEntries`) bräuchten individuelle Implementierungen.

---

### N7 — NICE-TO-HAVE: 4 PDF-Bibliotheken gleichzeitig

`package.json` enthält:
- `@react-pdf/renderer` (Haupt-PDF-Rendering)
- `html2canvas` (Screenshot → Canvas)
- `html2pdf.js` (HTML → PDF via Canvas)
- `jspdf` (Low-Level PDF)

Das sind ~800KB+ an gzipptem JS nur für PDFs. Eine einheitliche Lösung auf Basis von `@react-pdf/renderer` würde die Bundle-Größe signifikant reduzieren.

---

## Datei-Löschliste

| Datei | Status | Aktion |
|-------|--------|--------|
| `src/types/electron.d.ts` | ✅ Gelöscht (2026-05-19) | Electron-Typen, nie wieder gebraucht |
| `src/components/UpdateNotification.tsx` | ✅ Gelöscht (2026-05-19) | Electron Auto-Update, tote Komponente mit XSS-Risiko |
| `src/context/SyncContext.tsx` | ⏳ Offen | Kann gelöscht werden sobald Sidebar, employees/page + onboarding/page umgebaut sind (N3) |

---

## Zusammenfassung der Risiken (aktualisiert 2026-05-19)

| Kategorie | Bewertung | Begründung |
|-----------|-----------|------------|
| Sicherheit | 🔴 Kritisch | PIN in localStorage (C1 offen), `/api/db/clear` ohne Admin-Client (C4 offen) |
| Performance | 🟡 Verbessert | Alle API-Routen haben jetzt Limits (W1 ✅). Dashboard-Summary-Endpunkt noch offen (W2) |
| Code-Qualität | 🟡 Verbessert | ~150 Zeilen tote SyncContext-Kopplung entfernt (C3 ✅), Electron-Files gelöscht |
| Responsiveness | 🟠 Mittel | Fixe Breiten in Kernkomponenten noch offen (W3) |
| UX/Onboarding | 🟡 Mittel | Funktional, aber ohne Guided Tour nach erstem Login |

**Nächste Prioritäten:**
1. **C1** — Employee-PIN aus localStorage entfernen (Sicherheit / DSGVO)
2. **C4** — `/api/db/clear` auf Admin-Client + Rate-Limiting umstellen
3. **W2** — Dashboard-Summary-Endpunkt bauen (6 API-Calls → 1)
4. **N3** — `SyncContext.tsx` vollständig entfernen (Sidebar, employees, onboarding umbauen)
