# FlowY Mobile Web-Integration: Web-Plan

Stand: 22.07.2026

## Festgelegte Entscheidung

Der Bereich `Mobile App` bleibt in der Mitarbeiter-Detailansicht. Es wird vorerst keine eigene Web-Seite `/employees/mobile-access` gebaut.

## Aktueller Bestand

- `employees.appAccess` existiert bereits am Mitarbeiter.
- Die Mitarbeiter-Detailansicht zeigt Mobile-Zugang, Verfuegernummer, PIN-Status, letzten Login und Modulrechte.
- `/api/employees` speichert `appAccess` und hasht eine neue Klartext-PIN.
- `/api/auth/employee-login` kann mit `staffId` und PIN eine Cookie-Session fuer Mitarbeiter erstellen.
- `/api/employees/:id/mobile-access` verwaltet Aktivieren/Deaktivieren, Modulrechte, sichere `staffId`-Erzeugung und einmalige Aktivierungscodes.
- `/api/employees/:id/mobile-documents` verwaltet Mobile-Dokumentordner, Uploads, Loeschen und private Storage-Pfade fuer genau einen Mitarbeiter.
- `/api/employees/:id/mobile-projects` verwaltet aktive Mobile-Projektzuweisungen fuer genau einen Mitarbeiter.

Schaltbare Mobile-Module:

- `timeTracking`
- `projectDiary`
- `documents`

`Start` und `Profil` bleiben immer sichtbar. `personalData` wird nicht mehr als Modulschalter verwendet und bleibt nur als Legacy-Kompatibilitaetswert in alten `appAccess`-Objekten relevant.

## Zielbild

Die Web-App bleibt Quelle der Wahrheit fuer Mobile-Zugang, Mobile-Rechte, Projektzuweisungen, Dokumentfreigaben, Firmen- und Mitarbeiterdaten.

Die Mobile-App erhaelt produktiv nur eigene `/api/mobile/v1/...` Endpunkte. Bestehende Web-Endpunkte wie `/api/time-entries`, `/api/projects` oder `/api/employees` werden nicht direkt von Mobile verwendet.

## Datenmodell-Grundlage

Die neue SQL-Arbeitsgrundlage liegt in:

`migration_mobile_integration_phase1.sql`

Sie wurde am 22.07.2026 erfolgreich im Supabase SQL Editor ausgefuehrt und legt defensiv folgende Tabellen an:

- `mobile_activation_codes`
- `employee_mobile_sessions`
- `project_assignments`
- `project_diary_entries`
- `project_diary_attachments`
- `employee_document_folders`
- `employee_documents`
- `document_receipts`

Die Zusatzmigration `migration_mobile_integration_phase2.sql` ergaenzt `timesheets.submittedAt` und erlaubt `submitted` fuer den Ablauf `draft -> submitted -> finalized`.

Zusaetzlich werden private Buckets vorgesehen:

- `employee-mobile-documents`
- `employee-avatars`
- `project-diary-attachments`

## Reihenfolge der Umsetzung

1. Mobile-Zugang in der Detailansicht stabilisieren. (gestartet)
   - `staffId` serverseitig erzeugen.
   - Aktivierungscode serverseitig erzeugen, gehasht speichern und mit Ablaufdatum versehen.
   - PIN niemals im Klartext anzeigen oder erneut ausliefern.

2. Mobile-Auth v1 bauen. (gestartet)
   - Aktivierung erledigt: `POST /api/mobile/v1/auth/activate`
   - Login erledigt: `POST /api/mobile/v1/auth/login`
   - Refresh erledigt: `POST /api/mobile/v1/auth/refresh`
   - Logout/Sitzung widerrufen erledigt: `POST /api/mobile/v1/auth/logout`

3. Basis-Endpunkte bauen. (gestartet)
   - `GET /api/mobile/v1/me` erledigt
   - `GET /api/mobile/v1/company` erledigt
   - `GET /api/mobile/v1/dashboard` erledigt.
   - `POST /api/mobile/v1/me/avatar-upload-url` erledigt.
   - `POST /api/mobile/v1/me/avatar` erledigt.
   - `DELETE /api/mobile/v1/me/avatar` erledigt.
   - Mobile und Web verwenden fuer private Profilbilder `employee-avatars` mit kurzlebiger Anzeige-URL `avatarUrl`.
   - Dashboard mit echtem Mobile-Token getestet: Profilbild, Rechte, Zeitstatus, Projektzuweisung, Dokumente und Hinweise werden geliefert.

4. Zeiterfassung anbinden. (Mobile-v1 gestartet)
   - Eigene Mobile-Endpunkte, strikt an `employeeId` und `userId` aus der Mobile-Sitzung gebunden.
   - Eintrag erscheint sofort in der Web-Zeiterfassung.
   - `GET /api/mobile/v1/time-entries?month=YYYY-MM` erledigt.
   - `POST /api/mobile/v1/time-entries` erledigt.
   - `PATCH /api/mobile/v1/time-entries/:id` erledigt.
   - `DELETE /api/mobile/v1/time-entries/:id` erledigt.
   - `GET /api/mobile/v1/timesheets/:month` erledigt.
   - `POST /api/mobile/v1/timesheets/:month/submit` erledigt.
   - Statusfolge `draft -> submitted -> finalized` gestartet: Mobile-Submit setzt `submitted`, Web-Finalisierung setzt `finalized`.
   - Mobile darf `breakDuration` weglassen; Phase 1 kann nur Beginn/Ende senden, Pause wird im Web ergaenzt.
   - `submitted`-Lock getestet: Mobile-Zeiteintrag im eingereichten Monat wird mit `409` blockiert.

## Bestaetigte Security-Tests

- Nicht zugewiesenes/fremdes Projekt: `404`.
- Fremdes/nicht vorhandenes Dokument: `404`.
- Fremder/nicht eigener Zeiteintrag: `404`.
- Deaktivierter Mobile-Zugang: Sessions werden widerrufen, alter Token erhaelt `401`.

5. Projektzuweisungen und Bautagebuch anbinden. (Web-Zuordnung + Mobile-Liste gestartet)
   - Maximal zwei aktive Projekte pro Mitarbeiter.
   - Mobile sieht nur zugewiesene aktive Projekte.
   - `projectDiary` ist nur der Modulschalter; die Sichtbarkeit kommt aus `project_assignments`.
   - `GET /api/mobile/v1/projects` erledigt.
   - `GET /api/mobile/v1/projects/:id` erledigt.
   - `GET /api/mobile/v1/projects/:id/diary` erledigt.
   - `POST /api/mobile/v1/projects/:id/diary` erledigt.
   - `POST /api/mobile/v1/projects/:id/diary/upload-url` erledigt.
   - Bautagebuch-Eintraege werden auditierbar gespeichert.
   - Web-Projekt-Bautagebuch liest `project_diary_entries` und zeigt Mobile-/Web-Eintraege an.
   - Neuer Web-Endpoint `GET/POST/DELETE /api/projects/:id/diary` erledigt.
   - Storage-Anhaenge bekommen in Web kurzlebige Signed URLs und werden als Bildvorschau bzw. Download-Link angezeigt.

6. Dokumente und Storage anbinden. (Web-Verwaltung + Mobile-Lesen gestartet)
   - Mobile sieht nur explizit freigegebene Dokumente des eigenen Mitarbeiters.
   - Download erfolgt ueber kurzlebige Signed URLs.
   - `GET /api/mobile/v1/documents` erledigt.
   - `GET /api/mobile/v1/documents/:id/download-url` erledigt.
   - `POST /api/mobile/v1/documents/:id/read` erledigt.

## Release-Blocker

- Mitarbeiter A darf keine Daten von Mitarbeiter B lesen, aendern oder loeschen.
- Firma A darf keine Daten von Firma B lesen, aendern oder loeschen.
- Deaktivierter Mobile-Zugang muss `403` erhalten.
- `MOBILE_JWT_SECRET` muss in Production gesetzt sein; kein Production-Fallback auf `JWT_SECRET`.
- Fehlende Modulberechtigung muss UI und API sperren.
- Manipulierte `userId`, `companyOwnerId`, `employeeId` oder bekannte UUIDs duerfen den erlaubten Datenbereich nicht erweitern.
