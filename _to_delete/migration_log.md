# Migrations-Logbuch: Multi-Tenant-Umstellung & Berechtigungsarchitektur

Dieses Dokument dient als Logbuch für alle Code-Änderungen, die während der Implementierung des neuen Berechtigungssystems vorgenommen werden. Dies ermöglicht es zukünftigen KIs und Entwicklern, alle Schritte lückenlos nachzuvollziehen.

---

## Aktueller Git-Status & Backup-Punkt
*   **Backup-Methode**: Git Branching.
*   **Ausgangs-Branch**: `main` (Zustand: Clean, voll funktionsfähig).
*   **Entwicklungs-Branch**: `feature/multi-tenant-auth` (wird erstellt).
*   **Ziel**: Falls Probleme auftreten, kann jederzeit mit `git checkout main` der alte Zustand wiederhergestellt werden.

---

## Chronologisches Änderungsverzeichnis

| Zeitstempel | Datei / Komponente | Art der Änderung | Zweck / Beschreibung |
| :--- | :--- | :--- | :--- |
| 24.06.2026 21:11 | `migration_log.md` | Erstellung | Initialisierung dieses Logbuchs zur Dokumentation. |
| 24.06.2026 21:11 | `implementation_plan_...` | Aktualisierung | Einarbeitung der Verbesserungsvorschläge (Status Ausstehend, Aktivitätsprotokoll, Verknüpfung). |
| 24.06.2026 22:15 | `src/lib/auth-server.ts` | Code-Anpassung | `getUserSession` lädt nun die `companyOwnerId` und `permissions` aus der Tabelle `user_roles`. Automatisches Anlegen von Admin-Rollen für Abwärtskompatibilität. `checkAdmin` auf `developer`-Rolle beschränkt. |
| 24.06.2026 22:16 | `src/app/api/auth/me/route.ts` | Code-Anpassung | Ergänzung des `/api/auth/me` Endpunkts um die Felder `companyOwnerId` und `permissions`. |
| 24.06.2026 22:18 | `src/context/AuthContext.tsx` | Code-Anpassung | Hinzufügen des `profile` States und der Funktion `refreshProfile()`. Bereitstellen des Mandantenkontexts und der Rechte für das gesamte Frontend. |
| 24.06.2026 22:25 | `/api/projects/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`), Berechtigungsprüfung (`projects_read` / `projects_write`) und Audit Logs (`created_by`/`updated_by`). |
| 24.06.2026 22:28 | `/api/invoices/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`), Berechtigungsprüfung (`invoices_read` / `invoices_write`) und Audit Logs (`created_by`/`updated_by`). |
| 24.06.2026 22:30 | `/api/offers/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`), Berechtigungsprüfung (`offers_read` / `offers_write`) und Audit Logs (`created_by`/`updated_by`). |
| 24.06.2026 22:32 | `/api/orders/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`), Berechtigungsprüfung (`orders_read` / `orders_write`) und Audit Logs (`created_by`/`updated_by`). |
| 24.06.2026 22:35 | `/api/customers/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`), Berechtigungsprüfung (`customers_read` / `customers_write`) und Audit Logs (`created_by`/`updated_by`). |
| 24.06.2026 22:38 | `/api/crm/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`), Berechtigungsprüfung (`crm_read` / `crm_write`) und Audit Logs (`created_by`/`updated_by`). |
| 24.06.2026 22:42 | `/api/vehicles/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`), Berechtigungsprüfung (`vehicles_use`) und Audit Logs (`created_by`/`updated_by`). |
| 24.06.2026 22:45 | `/api/employees/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`), Berechtigungsprüfung (`employees_read` / `employees_create` / `employees_write`) und Audit Logs (`created_by`/`updated_by`). |
| 24.06.2026 22:48 | `/api/employees/[id]/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`) und Berechtigungsprüfung (`employees_write`). |
| 24.06.2026 22:52 | `/api/archive-files/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`), Berechtigungsprüfung (Lesen: `archive_read`, Schreiben: Admins/Devs), Mandanten-spezifischer Speicherpfad. |
| 24.06.2026 22:55 | `/api/archive-folders/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`), Berechtigungsprüfung (Lesen: `archive_read`, Schreiben: Admins/Devs). |
| 24.06.2026 23:00 | `/api/settings/route.ts` | Code-Anpassung | Mandanten-Isolation (`companyOwnerId`), Sperrung für Mitarbeiter-Rolle. |
| 24.06.2026 23:10 | `src/hooks/useUsers.ts` | Neue Datei | Hook zum Laden der Benutzerrollen und Details im Frontend. |
| 24.06.2026 23:15 | `src/types/employee.ts` | Code-Anpassung | Ergänzung des Interfaces um `created_by` und `updated_by`. |
| 24.06.2026 23:20 | `src/components/EmployeeModal.tsx` | Code-Anpassung | Systemprotokoll-Ansicht im Mitarbeiter-Modal mit Namensauflösung. |
| 24.06.2026 23:30 | `page.tsx` / `dashboard/page.tsx` | Code-Anpassung | Entwickler-Weiterleitung auf `/admin`. |
| 24.06.2026 23:45 | `src/lib/auth-server.ts` | Code-Anpassung | Fehlerbehebung: `getUserSession()` fragt nun auch für das Legacy-Token `session_token` die Rolle und Rechte aus `user_roles` ab, um 403 Forbidden bei bestehenden Accounts zu verhindern. |
| 24.06.2026 23:55 | `settings/users/route.ts` & `forgot-password/page.tsx` | Code-Anpassung | Initiale Anpassung der Aktivierungs- und Reset-Links für den Entwicklungsmodus. |
| 25.06.2026 00:05 | `auth/callback/page.tsx` & `middleware.ts` | Neue Datei & Code-Anpassung | Implementierung eines Callback-Handlers und Freigabe in der Middleware, um neu eingeladene Benutzer automatisch an das Passwort-Zurücksetzen weiterzuleiten. |
| 25.06.2026 00:40 | `src/components/UserManagement.tsx` | Code-Anpassung | Ersetzung von nativen JavaScript alerts und confirms durch modern gestaltete UI-Toasts und ein interaktives Bestätigungs-Modal. |
| 25.06.2026 00:45 | `src/app/(auth)/login/page.tsx` & `src/app/(auth)/forgot-password/page.tsx` | Code-Anpassung | Behebung des signUp- und Passwort-Zurücksetzungs-Redirect-Fehlers durch Nutzung des dynamischen `window.location.origin`. |
| 25.06.2026 00:50 | `src/app/api/settings/users/route.ts` | Code-Anpassung | Aufteilung der Einladungs-Logik: Im Entwicklungsmodus wird die E-Mail komplett unterdrückt und nur ein Einladungslink generiert (verhindert das automatische Einlösen des Tokens durch E-Mail-Clients). Erzwingung von `localhost:3000` im Dev-Modus, da Supabase unverschlüsselte `http` Redirects aus Sicherheitsgründen ausschließlich für `localhost` zulässt. |
| 25.06.2026 01:20 | `src/middleware.ts` | Code-Anpassung | Fehlerbehebung: Ausschluss von `/login/reset-password` von der automatischen Weiterleitung bereits authentifizierter User zu `/`, damit neu eingeladene Benutzer ihr Passwort festlegen können. |
| 25.06.2026 01:25 | `src/lib/auth-server.ts` | Code-Anpassung | Erweiterung von `getUserSession()`: Bei erfolgreicher Authentifizierung eines Benutzers mit Status `pending` in `user_roles` wird dieser nun automatisch auf `active` aktualisiert. |
| 29.06.2026 ~20:00 | `src/app/api/settings/route.ts` | Code-Anpassung | Settings-GET für Employees entsperrt: Statt HTTP 403 erhalten Employees jetzt das vollständige `companyData`-Objekt (Firmenname, Logo, Adresse, Kontakt, USt-ID etc.) – benötigt für Angebotsköpfe im PDF. Finanzdaten (`accountSettings`, `invoiceSettings` etc.) bleiben weiterhin gesperrt. |
| 29.06.2026 ~20:05 | `src/components/Sidebar.tsx` | Code-Anpassung | Firmenlogo in der Sidebar: `<img src>` auf `companySettings?.logo \|\| "/logo.png"` umgestellt, sodass Employees das Logo ihrer Firma sehen. Das FlowY-App-Logo (`/logo.png`) bleibt als Fallback erhalten. |
| 29.06.2026 ~20:30 | `src/components/OfferPreviewModal.tsx` | Code-Anpassung | Berechtigungsgesteuerte Buttons im Angebotsvorschau-Modal: "Auftrag bestätigen" nur sichtbar bei `orders_write`, "Rechnung erstellen" nur bei `invoices_write`. Admins/Developer sehen immer beide Buttons. Implementierung über `useAuth()` und `canConfirmOrder`/`canCreateInvoice`-Flags. |
| 29.06.2026 ~20:45 | `src/components/UserManagement.tsx` | Code-Anpassung | Neue Permission `time_tracking_use` ("Zeiten erfassen") in `PERMISSION_METADATA` unter der Kategorie "Personal" hinzugefügt. Damit kann der Admin die Zeiterfassung pro User explizit freischalten. |
| 29.06.2026 ~20:46 | `src/components/Sidebar.tsx` | Code-Anpassung | Sidebar-Sichtbarkeit für "Zeiten erfassen" (`/time-tracking`) und "Zeit-Archiv" (`/time-tracking/archive`) an die neue Permission `time_tracking_use` geknüpft. Vorher war Zeit-Archiv fälschlicherweise an `employees_read` gebunden und Zeiten erfassen immer sichtbar. |
| 29.06.2026 ~21:00 | `src/app/(dashboard)/employees/page.tsx` | Code-Anpassung | Frontend-Berechtigungsprüfung auf der Mitarbeiter-Seite eingebaut: "Neuer Mitarbeiter"-Button nur bei `employees_create`, Bearbeiten/Abmelden/Reaktivieren/Löschen-Buttons nur bei `employees_write`. Implementierung über `canCreate`/`canWrite`-Flags aus `useAuth()`. |
| 29.06.2026 ~21:05 | `src/components/EmployeeDetailModal.tsx` | Code-Anpassung | Schreibende Callback-Props (`onStartEdit`, `onDeactivate`, `onReactivate`, `onDelete`, `onDeleteDocument`) auf optional umgestellt. Buttons werden im Modal nur noch gerendert, wenn der jeweilige Callback übergeben wird (d.h. wenn die Berechtigung vorhanden ist). |
| 29.06.2026 ~21:30 | `src/hooks/usePermissionGuard.ts` | Neue Datei | Neuer React-Hook zur Absicherung aller Dashboard-Seiten gegen direkten URL-Zugriff. Nimmt eine Permission (String), mehrere Permissions (Array, OR-Logik) oder `null` (immer gesperrt für Employees) entgegen. Leitet Employees ohne die nötige Berechtigung sofort auf `/` weiter. Admins und Developer werden nie umgeleitet. |
| 29.06.2026 ~21:35 | 17 Dashboard-Seiten | Code-Anpassung | `usePermissionGuard` in alle berechtigungsgeschützten Seiten eingebaut. Verhindert, dass Employees durch manuelle URL-Eingabe auf gesperrte Seiten zugreifen können. Vollständige Liste: |

**Seiten mit `usePermissionGuard`:**

| Seite | Permission |
| :--- | :--- |
| `/time-tracking` | `time_tracking_use` |
| `/time-tracking/archive` | `time_tracking_use` |
| `/time-tracking/[employeeId]` | `time_tracking_use` |
| `/calendar` | `calendar_use` |
| `/crm` | `crm_read` |
| `/customers` | `customers_read` |
| `/customers/[id]` | `customers_read` |
| `/projects` | `projects_read` |
| `/vehicles` | `vehicles_use` |
| `/archive` | `archive_read` |
| `/employees` | `employees_read` |
| `/offers` | `offers_read` |
| `/orders` | `orders_read` |
| `/invoices` | `invoices_read` |
| `/invoices/dunning` | `dunning_read` |
| `/reports` | `reports_read` |
| `/services` | `invoices_write` ODER `offers_write` |
| `/credentials` | `null` – immer gesperrt für Employees |
| `/settings` | `null` – immer gesperrt für Employees |

---

## Details zu den Änderungen (Code-Snippets & Erklärungen)

### 1. Mandanten- und Rollenauflösung (Serverseite)
In `src/lib/auth-server.ts` liest `getUserSession()` nun bei jeder Anmeldung das Mapping aus `user_roles`. Existiert kein Mapping für einen Benutzer, wird er automatisch als Admin registriert (garantiert unterbrechungsfreie Übergänge für Altdaten).
Der Admin-Check `checkAdmin()` wurde so verschärft, dass nur noch Systementwickler (`role: 'developer'`) Zugriff auf systemweite Statistiken und Partnerlogos erhalten.

### 2. Clientseitige Zugriffssteuerung
Der `AuthContext` lädt nun über `/api/auth/me` die `profile`-Informationen und macht sie über `useAuth()` überall im React-Baum zugänglich. Dadurch können wir in der Sidebar und den Dashboard-Karten sofort auf die individuellen Rechte (`profile.permissions`) zugreifen.

### 3. API-Absicherung und Audit Trail
Alle wesentlichen operativen Schnittstellen (`/api/projects`, `/api/invoices`, `/api/offers`, `/api/orders`, `/api/customers`, `/api/crm`, `/api/vehicles`, `/api/employees`, `/api/archive-*` und `/api/settings`) wurden umgestellt:
- **Mandantentrennung**: Filterung erfolgt nun über `userId = companyOwnerId` statt über den individuellen `userId` des anfragenden Benutzers.
- **Berechtigungsprüfung**: Über den Helper `hasPermission(session, requiredPermission)` wird geprüft, ob der anfragende Mitarbeiter die Berechtigung besitzt. Falls nicht, wird ein HTTP 403 Forbidden zurückgegeben. Admins und Developer haben immer vollen Zugriff.
- **Audit-Tracking**: Bei Schreibvorgängen (POST/upsert) wird ermittelt, wer den Datensatz ursprünglich angelegt hat (`created_by`). Der aktuelle Bearbeiter wird in `updated_by` gespeichert.
- **Storage-Siloing**: Im Dateianhangs-Archiv (`/api/archive-files`) wird der Ordnerpfad im Bucket nun über die `companyOwnerId` geschützt, um auch dort absolute Isolation zu gewährleisten.
- **Persönliche To-Dos**: To-Dos verbleiben wie gewünscht benutzerspezifisch (gefiltert nach `session.userId`), so dass Mitarbeiter nur ihre eigenen Aufgaben sehen.

---

## Session vom 29.06.2026 – Frontend-Berechtigungen & URL-Schutz

### 4. Firmen-Branding für Employees

**Problem:** Employees sahen in der Sidebar immer das statische `/logo.png` und die Angebots-PDF-Köpfe waren leer, da `/api/settings` für Employees HTTP 403 zurückgab.

**Lösung:**
- `GET /api/settings` gibt Employees jetzt das vollständige `companyData`-Objekt zurück (Name, Logo, Adresse, Telefon, USt-ID, Bankdaten etc.). Diese Daten stehen ohnehin auf jedem Angebot drauf und sind daher nicht sensibel für berechtigte Mitarbeiter.
- Finanzdaten (`accountSettings`, `invoiceSettings`, `offerSettings`, `orderSettings`, `projectSettings`) bleiben für Employees weiterhin unsichtbar.
- Die Sidebar liest das Logo dynamisch: `companySettings?.logo || "/logo.png"`.

### 5. Berechtigungsgesteuerte UI-Elemente

**Angebots-Vorschau (`OfferPreviewModal`):**
- Button "Auftrag bestätigen" → nur sichtbar wenn `orders_write` vorhanden
- Button "Rechnung erstellen" → nur sichtbar wenn `invoices_write` vorhanden
- Admins/Developer sehen immer beide Buttons

**Mitarbeiter-Seite (`/employees`):**
- "Neuer Mitarbeiter"-Button → nur bei `employees_create`
- Bearbeiten (✏️), Abmelden (👤❌), Reaktivieren (👤✅), Löschen (🗑️) in Tabelle und Detail-Modal → nur bei `employees_write`
- Dokument löschen im Archiv → nur bei `employees_write`
- `EmployeeDetailModal`: Alle schreibenden Callbacks (`onStartEdit`, `onDeactivate`, `onReactivate`, `onDelete`, `onDeleteDocument`) sind jetzt optional. Fehlt der Callback, wird der Button nicht gerendert.

**Neue Permission `time_tracking_use`:**
- In `PERMISSION_METADATA` (UserManagement) unter "Personal" eingetragen
- Steuert Sichtbarkeit von "Zeiten erfassen" UND "Zeit-Archiv" in der Sidebar
- Vorher war Zeit-Archiv an `employees_read` gebunden — fehlerhaft, da ein User Zeiten einsehen können soll ohne zwingend die Mitarbeiterliste zu sehen

### 6. URL-Schutz: `usePermissionGuard` Hook

**Problem (kritisch):** Die Sidebar versteckt Menüpunkte per Permission-Check — aber ein Employee konnte jede URL manuell eintippen (z.B. `/time-tracking/archive`) und hatte vollen Zugriff auf die Seite.

**Lösung:** Neuer Hook `src/hooks/usePermissionGuard.ts`:

```typescript
usePermissionGuard(permission: string | string[] | null)
// string   → prüft einzelne Permission
// string[] → prüft ob EINE der Permissions vorhanden (OR-Logik)
// null     → Employees immer blockiert (settings, credentials)
```

**Verhalten:**
- Wartet auf `isLoading === false` (verhindert Redirect-Flackern beim Laden)
- `profile === null` (PIN-Employee oder noch nicht geladen) → kein Redirect (Middleware übernimmt Basis-Auth)
- `role === 'admin'` oder `'developer'` → immer durchgelassen
- `role === 'employee'` ohne Permission → sofortige Weiterleitung auf `/`

Der Hook wurde in alle 19 betroffenen Dashboard-Seiten eingebaut (siehe Tabelle oben).

**Wichtiger Hinweis für zukünftige Entwicklung:** Jede neue Dashboard-Seite, die für Employees eingeschränkt sein soll, muss `usePermissionGuard(...)` am Anfang der Komponente aufrufen. Die API-Routen sind serverseitig bereits durch `hasPermission()` abgesichert — der Hook ist die clientseitige Ergänzung für UX und direkten URL-Zugriff.

