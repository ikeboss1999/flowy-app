# FlowY CRM — Vollständiger Technischer Audit-Bericht

**Datum:** 2026-06-09  
**Version:** 1.3.4  
**Auditor:** Claude (Senior Architect / Security Auditor)  
**Stack:** Next.js 14 · Supabase · PostgreSQL · Vercel · GitHub

---

# Executive Summary

| Kategorie | Score | Bewertung |
|---|---|---|
| **Gesamt** | **31 / 100** | Nicht produktionsreif |
| **Sicherheit** | **18 / 100** | Kritisch |
| **Datenschutz/DSGVO** | **22 / 100** | Kritisch |
| **Performance** | **45 / 100** | Mangelhaft |
| **Skalierbarkeit** | **40 / 100** | Unzureichend |
| **Wartbarkeit** | **38 / 100** | Schwach |

> **Sofortige Handlung erforderlich.** Es wurden 6 kritische Sicherheitslücken gefunden, davon 2 mit vollständiger Datenbankexposition. Die Anwendung ist in ihrem aktuellen Zustand nicht DSGVO-konform.

---

# Kritische Probleme (P0 — Sofort handeln)

## CRIT-01 — Service Role Key im Client-Bundle exponiert

**Schwere:** KRITISCH  
**Datei:** `next.config.mjs`

```js
env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, // ← KATASTROPHAL
},
```

Die `env`-Sektion in `next.config.js` bündelt Variablen in **beide** Bundles — Server **und Browser**. Der `SUPABASE_SERVICE_ROLE_KEY` ist ein Superuser-Key, der alle Row Level Security Policies umgeht. Jeder Nutzer, der die JS-Bundle-Dateien analysiert, hat vollen Lese-/Schreibzugriff auf alle Daten aller Benutzer.

---

## CRIT-02 — Schwacher JWT-Secret / Default-Passwort

**Schwere:** KRITISCH  
**Datei:** `.env.local`, `src/lib/auth.ts`

```
JWT_SECRET=super-secret-default-key-change-this-in-production
```

Dieser String ist ein bekanntes Default-Passwort. Jeder kann damit beliebige JWT-Session-Tokens fälschen und sich als jeder Benutzer ausgeben. Das System hat keine Schutzmaßnahme.

---

## CRIT-03 — Employee-PIN im Klartext in localStorage

**Schwere:** KRITISCH  
**Datei:** `src/context/AuthContext.tsx` (Zeile 48)

```tsx
// IMPORTANT: Preserving PIN because API hides it for security
const updatedEmployee = {
    ...data.employee,
    appAccess: {
        ...data.employee.appAccess,
        accessPIN: employeeData.appAccess.accessPIN  // ← Klartext-PIN in localStorage!
    }
};
localStorage.setItem('flowy_employee_session', JSON.stringify(updatedEmployee));
```

Der PIN eines Mitarbeiters wird im Klartext in `localStorage` gespeichert. Jedes XSS, jede Browser-Extension oder jede andere Webseite kann diesen PIN lesen. Beim nächsten Session-Refresh wird dieser PIN direkt an die API gesendet.

---

## CRIT-04 — `/api/db/clear` kann ohne Authentifizierung alle Daten löschen

**Schwere:** KRITISCH  
**Datei:** `src/app/api/db/clear/route.ts`

```ts
const session = await getUserSession();

// ← Kein Fallback auf 401 wenn session == null!
if (session?.userId && userId && session.userId !== userId) {
    return 403; // Wird nur blockiert wenn ALLE 3 Bedingungen wahr sind
}
// Wenn session null ist → Code läuft weiter → Daten werden gelöscht!
if (!userId) return 400;

// LÖSCHT alle Tabellen für die gegebene userId
for (const table of tables) {
    await client.from(table).delete().eq('userId', userId);
}
```

Wenn kein gültiger Session-Cookie vorhanden ist, wird die Session `null`. Da die Prüfung `session?.userId &&` dann `false` ist, wird die Authorisierungsprüfung übersprungen. Zusätzlich: Employee-Sessions haben `userId = Unternehmens-Owner-ID`, sodass ein Mitarbeiter alle Firmendaten löschen könnte.

---

## CRIT-05 — `.env.local` wurde möglicherweise in Git committed

**Schwere:** KRITISCH

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
JWT_SECRET=super-secret-default-key-change-this-in-production
```

Die `.env.local` Datei enthält echte Produktions-Credentials. Falls sie auch nur ein einziges Mal in der Git-History committet wurde (GitHub-Repo: `https://github.com/ikeboss1999/flowy-app.git`), sind alle Credentials kompromittiert. **Sofort alle Supabase-Tokens rotieren.**

---

## CRIT-06 — Admin-Data-Route akzeptiert beliebige Tabellennamen

**Schwere:** KRITISCH  
**Datei:** `src/app/api/admin/data/[type]/route.ts`

```ts
const { type } = params;
// Kein Whitelist-Check!
let query = client.from(type).select('*');
```

Ein Admin-User kann `/api/admin/data/pg_user` oder `/api/admin/data/auth.users` aufrufen und beliebige Supabase-interne Tabellen lesen. Mit dem Service-Role-Key werden auch System-Tabellen exponiert.

---

# Sicherheitsbericht

## SB-01 — Middleware prüft nur Cookie-Existenz, nicht Token-Validität

**Schwere:** HOCH  
**Datei:** `src/middleware.ts` (Zeile 24)

```ts
if (!isPublicApi && !sessionToken && !sbAccessToken) {
    return 401;
}
```

Die Middleware überprüft nur ob ein Cookie **existiert**, nicht ob der enthaltene JWT **gültig** ist. Ein abgelaufener oder gefälschter Token passiert die Middleware. Die Fehlerantwort enthält außerdem interne Debug-Informationen:

```ts
debug: {
    path: pathname,
    cookies: request.cookies.getAll().map(c => c.name)
}
```

---

## SB-02 — `/api/partners` öffentlich ohne Authentifizierung

**Schwere:** HOCH  
**Datei:** `src/middleware.ts` (Zeile 14)

```ts
const isPublicApi =
    pathname.startsWith('/api/auth') ||
    (pathname.startsWith('/api/partners') && request.method === 'GET');
```

Alle GET-Anfragen an `/api/partners` sind ohne Auth zugänglich. Falls Partner-Daten geschäftssensibel sind, ist das ein Datenleck.

---

## SB-03 — Cookie-Management über `document.cookie` statt httpOnly

**Schwere:** HOCH  
**Datei:** `src/context/AuthContext.tsx` (Zeile 117)

```ts
document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax${secureFlag}`;
```

Der Supabase-Access-Token wird als lesbares `document.cookie` gesetzt (nicht httpOnly). Jeder XSS-Angriff kann diesen Token lesen und die Session hijacken.

---

## SB-04 — Kein Rate-Limiting

**Schwere:** HOCH  

Kein Rate-Limiting auf:
- `/api/auth/employee-login` → Brute-Force PIN (4-6 Ziffern sind trivial)
- Datei-Upload-Endpunkte → Ressourcenerschöpfung
- Admin-Endpunkte

---

## SB-05 — Admin-Rolle in `user_metadata` statt `app_metadata`

**Schwere:** HOCH  
**Datei:** `src/lib/auth-server.ts` (Zeile 22)

```ts
role: user.user_metadata?.role || 'user',
```

Die Rolle ist in `user_metadata` gespeichert. Supabase erlaubt Benutzern, `user_metadata` selbst zu manipulieren. Die sicherere Alternative ist `app_metadata`, die nur serverseitig änderbar ist.

---

## SB-06 — `time-entries` POST: userId aus Request-Body übernommen

**Schwere:** HOCH  
**Datei:** `src/app/api/time-entries/route.ts` (Zeile 40)

```ts
let userId = session?.userId;
if (!userId) userId = payload.userId;  // ← User-supplied userId!
if (!userId && payload.entry) userId = payload.entry.userId;
```

Ein authentifizierter Benutzer könnte Zeiteinträge im Namen anderer Benutzer erstellen.

---

## SB-07 — Project Files PATCH ohne Feldwhitelist

**Schwere:** MITTEL  
**Datei:** `src/app/api/project-files/route.ts` (Zeile 151)

```ts
const { data, error } = await client
    .from('project_files')
    .update({
        ...updates,  // ← Alle Felder aus dem Request-Body erlaubt!
        updatedAt: new Date().toISOString()
    })
```

Ein Benutzer kann `storagePath`, `userId`, `mimeType` oder andere sensitive Felder überschreiben.

---

## SB-08 — Fehlende Security-Headers

**Schwere:** MITTEL  

Keine der folgenden Security-Headers sind konfiguriert:
- `Content-Security-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Strict-Transport-Security`
- `Permissions-Policy`
- `Referrer-Policy`

---

## SB-09 — TypeScript- und ESLint-Fehler im Build unterdrückt

**Schwere:** MITTEL  
**Datei:** `next.config.mjs`

```js
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true },
```

Typ- und Linting-Fehler erreichen still die Produktion.

---

## SB-10 — Cookie-Diskrepanz: 7-Tage Cookie, 24h JWT

**Schwere:** MITTEL  
**Datei:** `src/app/api/auth/employee-login/route.ts` (Zeile 81)

```ts
response.cookies.set('session_token', sessionToken, {
    maxAge: 60 * 60 * 24 * 7,  // 7 Tage Cookie-Lebensdauer
    ...
});
// Aber JWT läuft nach 24h ab (in auth.ts)
```

Die Middleware prüft nur die Cookie-Existenz. Nach 24h ist der JWT ungültig, aber der Cookie existiert noch 6 weitere Tage.

---

## SB-11 — Keine vercel.json

**Schwere:** MITTEL**  

Keine `vercel.json` vorhanden. Kein serverseitiges Rate-Limiting auf Vercel-Ebene, keine Custom-Headers, keine Edge-Konfiguration.

---

## SB-12 — Scratch-Dateien mit DB-Zugriff im Repository

**Schwere:** MITTEL  
**Pfad:** `scratch/`

Das `scratch/`-Verzeichnis enthält Node.js-Skripte (`db_setup.js`, `check-db.js`, etc.), die direkt auf die Produktionsdatenbank zugreifen. Diese Dateien sollten nicht im Repository sein.

---

# Datenschutzbericht (DSGVO)

## DS-01 — Hochsensible Mitarbeiterdaten ohne Verschlüsselung

**Schwere:** KRITISCH  
**Datei:** `src/types/employee.ts`

Folgende Daten werden im Klartext in Supabase gespeichert:
- `socialSecurityNumber` (Sozialversicherungsnummer)
- `taxId` (Steuernummer)
- `iban` / `bic` (Bankdaten)
- `salary` (Gehalt)
- `birthday`, `birthPlace`, `birthCountry`, `nationality`
- `maritalStatus` (Familienstand)
- `healthInsurance` (Krankenkasse)
- `emergencyContactName`, `emergencyContactPhone`

Nach DSGVO Art. 89 und österreichischem Arbeitsrecht sind Bankdaten, Sozialversicherungsnummern und Lohndaten besonders schützenswert. Keine dieser Felder ist verschlüsselt.

---

## DS-02 — Employee Avatar und Dokumente als Base64 in der Datenbank

**Schwere:** HOCH  
**Datei:** `src/types/employee.ts` (Zeile 84)

```ts
avatar?: string; // Base64 string for profile picture
documents: EmployeeDocument[];
// EmployeeDocument.content?: string; // Base64 string
```

Personalfotos und Dokumente (Reisepässe, Ausweise, Meldezetteln) werden als Base64-Strings in der Datenbank gespeichert. Das ist datenschutzrechtlich problematisch (biometrische/Identifikationsdaten) und performancetechnisch kritisch.

---

## DS-03 — Kein Löschkonzept / DSGVO-Recht auf Vergessenwerden

**Schwere:** HOCH  

Die Account-Deletion-Route löscht Daten, aber:
1. Keine Bestätigung, ob alle Daten tatsächlich gelöscht wurden
2. Keine Löschung aus Backup-Buckets geprüft
3. Keine Auditlog-Einträge
4. Kein Bestätigungsschritt

---

## DS-04 — PII in Server-Logs

**Schwere:** HOCH  
**Datei:** `src/app/api/auth/delete-account/route.ts` (Zeile 31)

```ts
console.log(`[AccountDeletion] Starting wipe for user: ${userId}`);
```

User-IDs und andere PII werden in Server-Logs geschrieben. Vercel-Logs sind langlebig und sollten keine PII enthalten.

---

## DS-05 — Kein Consent-Tracking / Datenschutzerklärung

**Schwere:** HOCH  

Keine Implementierung von:
- Cookie-Consent
- Einwilligung zur Datenverarbeitung
- Verknüpfung mit Datenschutzerklärung beim Registrieren
- Möglichkeit zum Datenexport (DSGVO Art. 20)

---

## DS-06 — Admin-Explorer sieht alle Kundendaten aller Benutzer

**Schwere:** HOCH  
**Datei:** `src/app/(dashboard)/admin/explorer/page.tsx`

Der Global Explorer zeigt einem Admin alle Kunden-, Rechnungs- und Mitarbeiterdaten aller System-Benutzer. Dies ist eine massive Datenschutzverletzung zwischen Mandanten (Multi-Tenancy-Verletzung).

---

## DS-07 — Keine Datenminimierung bei API-Antworten

**Schwere:** MITTEL  

Alle Routes verwenden `select('*')` und geben alle Felder zurück, einschließlich sensibler Mitarbeiterdaten (IBAN, Sozialversicherungsnummer), auch wenn diese Felder für den jeweiligen Use-Case nicht benötigt werden.

---

## DS-08 — Fehlendes Berechtigungskonzept für Mitarbeiter-Datenzugriff

**Schwere:** MITTEL  

Jeder angemeldete Benutzer kann alle Mitarbeiter-Datensätze abrufen, einschließlich sensibler HR-Daten. Es gibt keine Rollenprüfung, die bestimmte Felder für normale User verbirgt.

---

# Performancebericht

## PERF-01 — N+1 Queries im Dashboard

**Problem:** Das Dashboard ruft separat Rechnungen und Angebote ab (2 separate Queries), aber es gibt keine optimierte Aggregations-Query.

**Verbesserungsvorschlag:**
```sql
SELECT 
    COUNT(*) FILTER (WHERE status = 'pending') as open_invoices,
    SUM("totalAmount") FILTER (WHERE status = 'paid') as revenue
FROM invoices 
WHERE "userId" = $1 AND EXTRACT(YEAR FROM "issueDate") = EXTRACT(YEAR FROM NOW());
```

---

## PERF-02 — Employee-Daten laden gesamte Base64-Dokumente mit

**Problem:** Jedes `GET /api/employees` lädt `avatar` (Base64-Foto) und `documents` (Base64-Array) für jeden Mitarbeiter.  
**Auswirkung:** Bei 50 Mitarbeitern mit je 5 Dokumenten à 500KB = 125 MB pro API-Response.  
**Lösung:** Avatars und Dokumente in Supabase Storage auslagern, nur URLs zurückgeben.

---

## PERF-03 — Harte Limits ohne Pagination

```ts
.limit(500)   // customers, invoices
.limit(200)   // employees
.limit(1000)  // time_entries
```

**Problem:** Bei wachsenden Datenmengen keine Möglichkeit zur Pagination.

---

## PERF-04 — `select('*')` bei allen Queries

**Problem:** Jede Query lädt alle Spalten, auch wenn nur 2-3 Felder benötigt werden.

---

## PERF-05 — Admin-Stats ruft alle Auth-User pro Request ab

```ts
supabaseAdmin.auth.admin.listUsers()  // Kein Caching, kein Pagination
```

---

## PERF-06 — Fehlende Datenbankindizes

Jede Tabelle hat eine `userId`-Spalte ohne Index → Full-Table-Scan bei wachsenden Daten.

```sql
-- Empfohlene Indizes:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_userId ON invoices("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_userId ON customers("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_userId ON employees("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_userId ON projects("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_userId_date ON time_entries("userId", "date" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_files_projectId_userId ON project_files("projectId", "userId");
```

---

## PERF-07 — Keine HTTP-Cache-Headers

Alle Routes haben `export const dynamic = 'force-dynamic'` — kein CDN-Caching möglich.

---

## PERF-08 — Keine Code-Splitting-Strategie für PDF-Libraries

Alle PDF-Renderer (`@react-pdf/renderer`, `jspdf`, `html2pdf.js`) werden immer geladen, obwohl PDF-Generierung selten vorkommt.

---

# Architekturbericht

## ARCH-01 — Drei parallele Authentifizierungssysteme

Die App hat drei inkompatible Auth-Systeme gleichzeitig:
1. **Supabase OAuth** (`sb-access-token` Cookie)
2. **Custom JWT** (`session_token` Cookie)
3. **Employee localStorage** + re-auth über API

Das führt zu komplexer Session-Management-Logik, inkonsistentem Verhalten und mehrfachen Sicherheitsoberflächen.

**Empfehlung:** Standardisierung auf Supabase Auth für alle Benutzertypen. Mitarbeiter als Supabase-User mit `app_metadata.type = 'employee'`.

---

## ARCH-02 — `supabaseAdmin || supabase` Fallback überall

```ts
const client = supabaseAdmin || supabase;
```

Dieses Pattern ist in 15+ Dateien dupliziert. Wenn `supabaseAdmin` fehlt, wird auf den anonymen Client zurückgefallen.

---

## ARCH-03 — Keine echte Multi-Tenancy-Isolation

Die Datentrennung basiert ausschließlich auf dem `userId`-Feld (Application-Layer-Tenancy). Es gibt keine Row Level Security, die auf Datenbankebene absichert.

---

## ARCH-04 — God-Components

| Datei | Zeilen |
|---|---|
| `EmployeeModal.tsx` | ~1370 |
| `InvoiceForm.tsx` | ~819 |
| `CalendarWidget.tsx` | ~666 |

---

## ARCH-05 — Kein Error-Boundary-System

Kein einziges React Error Boundary in der gesamten Anwendung.

---

## ARCH-06 — Keine Tests

Null Test-Dateien in der gesamten Codebase.

---

# Datenbankbericht

## DB-01 — RLS ist durch supabaseAdmin wirkungslos

Die Anwendung verwendet `supabaseAdmin` (Service Role Key) für alle Datenbankoperationen. Dieser Key umgeht **alle** Row Level Security Policies vollständig.

---

## DB-02 — Keine Datenbank-Migrationen

Keine SQL-Migrationsdateien im Repository. Schemaänderungen sind nicht nachvollziehbar.

---

## DB-03 — Denormalisierte Datenstruktur

Mitarbeiterdaten (`personalData`, `bankDetails`, `employment`, etc.) sind als JSON-Blob in einer einzelnen Zeile gespeichert.

---

## DB-04 — Keine Foreign Key Constraints

Keine sichtbaren FK-Constraints zwischen Tabellen. Orphaned Records sind möglich.

---

## DB-05 — `nanoid()` als Primary Key statt UUID

```ts
const customerId = customer.id || nanoid();
```

nanoid generiert keine Standard-UUIDs. Das erschwert Kompatibilität mit Supabase-internen Mechanismen.

---

# Quick Wins

| # | Maßnahme | Zeit |
|---|---|---|
| 1 | `SUPABASE_SERVICE_ROLE_KEY` aus `next.config.mjs` entfernen | 5 min |
| 2 | Starken zufälligen JWT_SECRET generieren | 2 min |
| 3 | PIN aus localStorage entfernen | 30 min |
| 4 | `/api/db/clear` Auth-Check fixen | 10 min |
| 5 | Alle Supabase-Credentials rotieren | 10 min |
| 6 | Debug-Info aus Middleware-Antwort entfernen | 5 min |
| 7 | Whitelist für Admin-Tabellennamen | 15 min |
| 8 | Security-Headers via `next.config.mjs` | 20 min |
| 9 | `typescript.ignoreBuildErrors: false` | 0 min |
| 10 | `scratch/` Verzeichnis aus Repository entfernen | 5 min |

---

# Priorisierte Roadmap

## Priorität P0 — Sofort (heute)

| ID | Maßnahme | Aufwand |
|---|---|---|
| P0-1 | Alle Supabase-Tokens rotieren (Service Role Key, Anon Key) | 10 min |
| P0-2 | `SUPABASE_SERVICE_ROLE_KEY` aus `next.config.mjs` `env`-Block entfernen | 5 min |
| P0-3 | `JWT_SECRET` durch kryptographisch sicheres Secret ersetzen | 10 min |
| P0-4 | `git log --all -- .env.local` prüfen, ob .env.local in History ist | 5 min |
| P0-5 | `/api/db/clear` Auth-Bug fixen (401 wenn kein Session) | 10 min |
| P0-6 | Employee PIN aus localStorage entfernen | 30 min |
| P0-7 | GitHub Repo auf privat setzen (wenn öffentlich) | 5 min |

## Priorität P1 — Innerhalb von 30 Tagen

| ID | Maßnahme | Aufwand |
|---|---|---|
| P1-1 | Admin-Route Tabellennamen-Whitelist implementieren | 1h |
| P1-2 | Rate Limiting für Employee-Login (max 5 Versuche/5min) | 2h |
| P1-3 | Security-Headers in `next.config.mjs` konfigurieren | 2h |
| P1-4 | `sb-access-token` als httpOnly-Cookie implementieren | 1d |
| P1-5 | `user_metadata.role` → `app_metadata.role` migrieren | 4h |
| P1-6 | Zod-Validierung in allen API-Routen | 2d |
| P1-7 | Project Files PATCH Feldwhitelist | 1h |
| P1-8 | `/api/partners` Authentifizierung erzwingen | 30min |
| P1-9 | Debug-Info aus Middleware-Response entfernen | 10min |
| P1-10 | `typescript.ignoreBuildErrors: false` | 1d (Bugs fixen) |

## Priorität P2 — Innerhalb von 90 Tagen

| ID | Maßnahme | Aufwand |
|---|---|---|
| P2-1 | Employee Avatar/Dokumente in Supabase Storage auslagern | 1 Woche |
| P2-2 | Echte Row Level Security Policies implementieren | 3d |
| P2-3 | Sensible Felder (IBAN, Sozialversicherung) verschlüsseln | 3d |
| P2-4 | Pagination für alle Listen-Endpunkte | 3d |
| P2-5 | Datenbankindizes erstellen | 1h |
| P2-6 | Datenbank-Migrationsdateien einführen (Supabase CLI) | 1d |
| P2-7 | DSGVO-Datenschutzerklärung und Consent-Banner | 2d |
| P2-8 | DSGVO Datenexport-Funktion (Art. 20) | 2d |
| P2-9 | Error Boundaries einführen | 1d |
| P2-10 | Scratch-Verzeichnis aus Repository entfernen | 30min |

## Priorität P3 — Langfristig

| ID | Maßnahme | Aufwand |
|---|---|---|
| P3-1 | Einheitliches Auth-System (Supabase für alle User-Typen) | 1 Woche |
| P3-2 | God-Components aufteilen | 2 Wochen |
| P3-3 | Unit- und Integrationstests einführen (Vitest) | Laufend |
| P3-4 | Monitoring/Alerting (Sentry, Datadog) | 1d |
| P3-5 | Audit-Log für sensitive Datenoperationen | 1 Woche |
| P3-6 | Datenbankschema normalisieren | 2 Wochen |
| P3-7 | Backup-Strategie dokumentieren und testen | 3d |
| P3-8 | CI/CD mit `npm audit` und Security-Scan erweitern | 1d |

---

# Codebeispiele

## Fix CRIT-01 — Service Role Key aus next.config.mjs entfernen

```js
// next.config.mjs — VORHER (GEFÄHRLICH)
env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, // ← ENTFERNEN
},

// NACHHER (KORREKT)
env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // SUPABASE_SERVICE_ROLE_KEY wird NICHT hier eingetragen
    // Es steht bereits in .env.local und ist automatisch server-seitig verfügbar
},
```

## Fix CRIT-02 — Starkes JWT Secret

```bash
# Neues Secret generieren (Terminal):
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# .env.local:
JWT_SECRET=<generated_64_byte_hex>
```

## Fix CRIT-03 — PIN aus localStorage entfernen

```tsx
// AuthContext.tsx — VORHER
const updatedEmployee = {
    ...data.employee,
    appAccess: {
        ...data.employee.appAccess,
        accessPIN: employeeData.appAccess.accessPIN // ← ENTFERNEN
    }
};

// NACHHER
const updatedEmployee = {
    ...data.employee,
    appAccess: {
        ...data.employee.appAccess,
        accessPIN: undefined // PIN wird NICHT gespeichert
    }
};
localStorage.setItem('flowy_employee_session', JSON.stringify(updatedEmployee));
```

## Fix CRIT-04 — db/clear Auth-Bug

```ts
// /api/db/clear/route.ts — VORHER (UNSICHER)
const session = await getUserSession();
if (session?.userId && userId && session.userId !== userId) {
    return 403; // Kein 401 wenn session null!
}

// NACHHER (KORREKT)
const session = await getUserSession();

if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

if (userId && session.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

const userId = session.userId; // Immer aus Session, nie aus Body
```

## Fix SB-08 — Security Headers

```js
// next.config.mjs
const securityHeaders = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
            "img-src 'self' data: blob:",
            "style-src 'self' 'unsafe-inline'",
        ].join('; ')
    },
];

const nextConfig = {
    async headers() {
        return [{ source: '/(.*)', headers: securityHeaders }];
    },
    // ... rest
};
```

## Fix CRIT-06 — Admin Tabellen-Whitelist

```ts
// /api/admin/data/[type]/route.ts
const ALLOWED_ADMIN_TABLES = new Set([
    'invoices', 'customers', 'projects', 'employees',
    'vehicles', 'services', 'todos', 'calendar_events',
    'time_entries', 'timesheets', 'settings'
]);

export async function GET(request: Request, { params }: { params: { type: string } }) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });

    const { type } = params;
    if (!ALLOWED_ADMIN_TABLES.has(type)) {
        return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }
    // ...
}
```

## Fix P1-6 — Zod-Validierung (Beispiel für Customers)

```ts
// /api/customers/route.ts
import { z } from 'zod';

const CustomerSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(200),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
});

export async function POST(request: Request) {
    const session = await getUserSession();
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const result = CustomerSchema.safeParse(body.customer || body);
    if (!result.success) {
        return NextResponse.json({ error: 'Validation failed', details: result.error.flatten() }, { status: 422 });
    }

    const customer = result.data;
    // ...
}
```

## Fix PERF-06 — Datenbankindizes

```sql
-- In Supabase SQL Editor ausführen:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_userId 
    ON invoices("userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_userId 
    ON customers("userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_userId 
    ON employees("userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_userId 
    ON projects("userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_userId_date 
    ON time_entries("userId", "date" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_files_projectId_userId 
    ON project_files("projectId", "userId");
```

## Fix DS-02 — Avatar in Storage auslagern

```ts
// Vorher: avatar?: string (Base64 direkt in DB)
// Nachher: avatarUrl?: string (Storage URL)

// Upload:
const { data } = await supabaseAdmin.storage
    .from('avatars')
    .upload(`${userId}/${employeeId}/avatar.jpg`, buffer, {
        contentType: 'image/jpeg',
        upsert: true
    });
const avatarUrl = supabaseAdmin.storage
    .from('avatars')
    .getPublicUrl(data.path).data.publicUrl;
```

## Fix P2-2 — Row Level Security (RLS)

```sql
-- Supabase SQL Editor:

-- RLS aktivieren:
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy: Nur eigene Daten
CREATE POLICY "Users can only see their own customers"
ON customers FOR ALL
USING (auth.uid()::text = "userId");
```

---

# Top 20 Sicherheitsverbesserungen

1. **Alle Supabase-Credentials rotieren** (sofort)
2. **SUPABASE_SERVICE_ROLE_KEY aus next.config.mjs entfernen**
3. **Starkes JWT_SECRET generieren** (64 Byte random hex)
4. **db/clear Auth-Logic fixen** (401 wenn kein Session)
5. **Employee PIN aus localStorage entfernen**
6. **Admin-Tabellen-Whitelist**
7. **sb-access-token als httpOnly Cookie**
8. **Rate Limiting auf Employee-Login**
9. **Middleware: Token-Validierung statt nur Existenzprüfung**
10. **Security Headers** (CSP, HSTS, X-Frame-Options)
11. **Admin-Rolle in `app_metadata` statt `user_metadata`**
12. **time-entries userId aus Body verbieten**
13. **project_files PATCH Feldwhitelist**
14. **Debug-Info aus 401-Responses entfernen**
15. **Zod-Validierung auf allen API-Routen**
16. **TypeScript strict mode aktivieren**
17. **Scratch-Dateien aus Repository entfernen**
18. **`.env.local` in `.gitignore` verifizieren**
19. **vercel.json** mit Rate Limiting und Edge-Firewall konfigurieren
20. **Supabase Service Role nur serverseitig** — sicherstellen, dass Admin-Key nie zum Client gelangt

---

# Top 20 Performanceverbesserungen

1. **Datenbankindizes** auf `userId`, `date`, `projectId`
2. **Avatar/Dokumente in Blob-Storage auslagern**
3. **Pagination** statt Hardlimits
4. **`select('*')` → Spezifische Felder**
5. **PDF-Komponenten lazy-laden**
6. **Employee-Liste ohne eingebettete Dokumente**
7. **Admin-User-List cachen** (5-Minuten-Cache)
8. **SWR-Revalidierung bei Focus deaktivieren** für unkritische Daten
9. **Dashboard-Summary als Single Aggregation Query**
10. **`force-dynamic` nur wo nötig** — ISR für statische Seiten
11. **HTTP Cache-Headers** für Settings/Services
12. **Supabase Connection Pooling** prüfen (pgBouncer)
13. **Base64-Dokumente komprimieren** (kurzfristig)
14. **SWR deduplication interval erhöhen**
15. **Time-Entries: Datumsbereich-Filter** (nur aktueller Monat)
16. **React.memo** auf teuren Listen-Komponenten
17. **Vercel Analytics** aktivieren
18. **Supabase Query Explain** auf häufigsten Queries
19. **Bundle-Analyse** mit `@next/bundle-analyzer`
20. **`next/image`** statt `<img>` für automatische WebP-Optimierung

---

# Top 20 Architekturverbesserungen

1. **Einheitliches Auth-System** — Supabase Auth für alle User-Typen
2. **Row Level Security aktivieren** — Datentrennung auf DB-Ebene
3. **Zod-Schemas** für alle Datenmodelle
4. **Repository Pattern** — `supabaseAdmin || supabase` zentralisieren
5. **Error Boundaries** in alle Haupt-Views einführen
6. **SQL-Migrationen** mit Supabase CLI
7. **EmployeeModal aufteilen** in 5-6 kleinere Komponenten
8. **Server Components** für daten-intensive Views nutzen
9. **API-Error-Handling** standardisieren
10. **Testing-Infrastruktur** einführen (Vitest + Testing Library)
11. **Monitoring** (Sentry) für Frontend-Fehler
12. **Feature-basierte Ordnerstruktur**
13. **Custom Hook Factory** verbessern
14. **Audit-Log-Tabelle** in Supabase
15. **Getrennte Admin-Middleware**
16. **Foreign Key Constraints** in DB definieren
17. **Normalisiertes Datenbankschema** für Mitarbeiterdaten
18. **Umgebungs-spezifische Konfiguration** (dev/staging/prod) trennen
19. **OpenAPI/Swagger Dokumentation** der API-Routes
20. **CI/CD Pipeline erweitern** (Tests, Security-Audit, Type-Check)

---

# Top 20 Datenschutzverbesserungen

1. **Sensible Felder verschlüsseln** (IBAN, SV-Nummer, taxId)
2. **Datenschutzerklärung einbinden** und beim Registrieren zustimmen lassen
3. **Cookie-Consent** implementieren
4. **Datenexport-Funktion** (DSGVO Art. 20)
5. **PII aus Server-Logs entfernen**
6. **Audit-Log** für Zugriff auf sensitive Daten
7. **Datenretention-Policies** — Automatisches Löschen nach X Jahren
8. **Multi-Tenancy Isolation stärken** — Admins sehen keine fremden Kundendaten
9. **Pseudonymisierung** in Logs und nicht-produktiven Umgebungen
10. **Verarbeitungsverzeichnis** dokumentieren (DSGVO Art. 30)
11. **Datenschutz-Folgenabschätzung (DSFA)** für HR-Daten
12. **Avatar und Dokumente in verschlüsseltem Storage**
13. **Zugriffsrechte der Mitarbeiter** einschränken — Nur eigene Daten
14. **Daten-Löschnachweis** nach Account-Deletion
15. **Verarbeitungseinwilligung für HR-Daten** dokumentieren
16. **Supabase Datenregion** prüfen — EU-Hosting für DSGVO
17. **Passwort-Policy** stärken (Supabase-Konfiguration)
18. **Benachrichtigung bei Datenschutzverletzung** (DSGVO Art. 33 — 72h-Regel) prozessual vorbereiten
19. **Mitarbeiter-Dokumente** aus Base64-in-DB in verschlüsselte Storage-Buckets auslagern
20. **Datenschutzhinweis** auf Login-Seite und bei Registrierung

---

*Bericht erstellt am 2026-06-09 durch automatisierte Codeanalyse aller Quelldateien.*
