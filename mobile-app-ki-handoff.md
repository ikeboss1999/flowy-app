# FlowY Mobile App KI - Uebergabe Web-Integration

Stand: 22.07.2026

## Kurzfassung

Die FlowY Web-App bereitet gerade die produktive Backend-Anbindung fuer die Mitarbeiter-Mobile-App vor. Die Mobile-App darf noch nicht auf bestehende Web-Endpunkte wie `/api/employees`, `/api/projects`, `/api/time-entries` oder `/api/timesheets` umgestellt werden.

Produktiv wird Mobile ausschliesslich eigene Endpunkte unter `/api/mobile/v1/...` verwenden.

## Wichtige Web-Entscheidung

Der Bereich `Mobile App` bleibt in FlowY Web in der Mitarbeiter-Detailansicht. Es wird vorerst keine eigene Web-Seite `/employees/mobile-access` geben.

Die Detailansicht wird spaeter verwalten:

- Mobile-Zugang aktivieren/deaktivieren
- Verfuegernummer anzeigen
- einmaligen Aktivierungscode erzeugen/widerrufen
- Aktivierungsstatus anzeigen
- PIN-Status anzeigen, aber PIN niemals im Klartext anzeigen
- Modulrechte fuer Zeiterfassung, Projekte/Bautagebuch und Dokumente
- Projektzuweisungen
- Dokumentordner und Dokumentfreigaben
- Mobile-Sitzungen/Geraete widerrufen

## Aktueller Web-Bestand

Am Mitarbeiter existiert bereits:

```ts
appAccess?: {
  staffId: string;
  accessPIN: string;
  isAccessEnabled: boolean;
  permissions: {
    timeTracking: boolean;
    documents: boolean;
    projectDiary: boolean;
  };
  lastLogin?: string;
}
```

Aktuell vorhanden, aber noch nicht produktionsreif:

- `/api/auth/employee-login` kann mit `staffId` und PIN anmelden.
- `/api/employees` hasht eine neue Klartext-PIN beim Speichern.
- Die Web-Detailansicht kann `appAccess` teilweise speichern.
- `/api/employees/:id/mobile-access` verwaltet Web-seitig Aktivierung, Deaktivierung, Modulrechte und einmalige Aktivierungscodes.
- `/api/employees/:id/mobile-documents` verwaltet Web-seitig Mobile-Dokumentordner und Uploads in den privaten Bucket `employee-mobile-documents`.
- `/api/employees/:id/mobile-projects` verwaltet Web-seitig aktive Projektzuweisungen fuer genau einen Mitarbeiter.

Neu fertig auf Web/API-Seite:

- `POST /api/mobile/v1/auth/activate`
- `POST /api/mobile/v1/auth/login`
- `POST /api/mobile/v1/auth/refresh`
- `POST /api/mobile/v1/auth/logout`
- `GET /api/mobile/v1/me`
- `GET /api/mobile/v1/company`
- `GET /api/mobile/v1/dashboard`
- `POST /api/mobile/v1/me/avatar-upload-url`
- `POST /api/mobile/v1/me/avatar`
- `DELETE /api/mobile/v1/me/avatar`
- `GET /api/mobile/v1/projects`
- `GET /api/mobile/v1/documents`
- `GET /api/mobile/v1/documents/:id/download-url`
- `POST /api/mobile/v1/documents/:id/read`
- `GET /api/mobile/v1/time-entries?month=YYYY-MM`
- `POST /api/mobile/v1/time-entries`
- `PATCH /api/mobile/v1/time-entries/:id`
- `DELETE /api/mobile/v1/time-entries/:id`
- `GET /api/mobile/v1/timesheets/:month`
- `POST /api/mobile/v1/timesheets/:month/submit`
- `GET /api/mobile/v1/projects/:id`
- `GET /api/mobile/v1/projects/:id/diary`
- `POST /api/mobile/v1/projects/:id/diary`
- `POST /api/mobile/v1/projects/:id/diary/upload-url`
- Web-Projektansicht liest `project_diary_entries` ueber `GET /api/projects/:id/diary` und zeigt Mobile-Eintraege im Bautagebuch an.
- Web erstellt fuer Storage-Anhaenge kurzlebige Signed URLs und zeigt Bilder als Vorschau bzw. PDFs/Dateien als Oeffnen-Link.

Noch nicht fertig:

- keine weiteren Phase-1-Kernendpunkte offen; verbleibend sind Feinschliff, erweiterte Statusmodelle und optionale Spaeter-Endpunkte

## Neue Web-Datenmodell-Arbeitsgrundlage

Die Web-Seite hat eine SQL-Arbeitsgrundlage vorbereitet:

`migration_mobile_integration_phase1.sql`

Diese Migration wurde am 22.07.2026 im Supabase SQL Editor erfolgreich ausgefuehrt.

Zusatzmigration fuer den Mobile-Abgabe-Status:

`migration_mobile_integration_phase2.sql`

Diese Migration muss nach Phase 1 ausgefuehrt werden. Sie ergaenzt `timesheets.submittedAt` und erlaubt den Status `submitted`.

Vorgesehene Tabellen:

- `mobile_activation_codes`
- `employee_mobile_sessions`
- `project_assignments`
- `project_diary_entries`
- `project_diary_attachments`
- `employee_document_folders`
- `employee_documents`
- `document_receipts`

Vorgesehene private Buckets:

- `employee-mobile-documents`
- `employee-avatars`
- `project-diary-attachments`

## Verbindliche Anweisung Fuer Die Mobile-App-KI

Bis die Web-KI die Mobile-v1-Endpunkte mit echten Response-Beispielen bestaetigt, bleibt die Mobile-App im lokalen Demo-/Mockmodus.

Die Mobile-App soll keine bestehenden Web-Endpunkte direkt anbinden.

Schaltbare Mobile-Module sind nur:

- `timeTracking`
- `projectDiary`
- `documents`

`Start` und `Profil` sind fuer aktivierte Mobile-Mitarbeiter immer vorhanden. Ein alter Web-Wert `personalData` darf nicht als Tab- oder Modulschalter verwendet werden.

Die Mobile-App kann fuer Auth und erste Lesetests folgende echte Endpunkte verwenden:

```text
POST /api/mobile/v1/auth/activate
POST /api/mobile/v1/auth/login
POST /api/mobile/v1/auth/refresh
POST /api/mobile/v1/auth/logout
GET  /api/mobile/v1/me
GET  /api/mobile/v1/company
GET  /api/mobile/v1/projects
GET  /api/mobile/v1/documents
GET  /api/mobile/v1/documents/:id/download-url
POST /api/mobile/v1/documents/:id/read
GET  /api/mobile/v1/time-entries?month=YYYY-MM
POST /api/mobile/v1/time-entries
PATCH /api/mobile/v1/time-entries/:id
DELETE /api/mobile/v1/time-entries/:id
GET  /api/mobile/v1/timesheets/:month
POST /api/mobile/v1/timesheets/:month/submit
```

Noch wartende Ziel-Endpunkte:

```text
Keine offenen Phase-1-Ziel-Endpunkte.
```

## Projekt-Sicht in Mobile

Der Web-Schalter `projectDiary` bedeutet nur: Das Mobile-Modul `Projekte & Bautagebuch` ist erlaubt.

Er bedeutet ausdruecklich nicht, dass Mobile alle Projekte sehen darf. Mobile darf spaeter in `GET /api/mobile/v1/projects` nur aktive Projekte zurueckgeben, fuer die in `project_assignments` ein aktiver Datensatz existiert:

- `userId` kommt aus der Mobile-Sitzung
- `employeeId` kommt aus der Mobile-Sitzung
- `status = 'active'`
- Projekt muss zur selben Firma gehoeren

In der Web-App koennen pro Mitarbeiter maximal zwei aktive Projekte zugeordnet werden. Wird eine Zuordnung in Web entfernt, muss sie fuer Mobile sofort verschwinden.

## Echte Mobile-Auth Schnittstellen

### Aktivierung

`POST /api/mobile/v1/auth/activate`

Request:

```json
{
  "staffId": "12345678",
  "activationCode": "123456",
  "pin": "123456",
  "platform": "ios",
  "deviceName": "iPhone",
  "appVersion": "1.0.0"
}
```

Die persoenliche Mobile-PIN ist immer exakt sechsstellig und numerisch.

Response:

```json
{
  "success": true,
  "accessToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshToken": "sessionId.secret",
  "refreshTokenExpiresAt": "2026-08-21T00:00:00.000Z",
  "employee": {}
}
```

### Login

`POST /api/mobile/v1/auth/login`

Request:

```json
{
  "staffId": "12345678",
  "pin": "123456",
  "platform": "android",
  "deviceName": "Pixel",
  "appVersion": "1.0.0"
}
```

Response entspricht Aktivierung.

### Refresh

`POST /api/mobile/v1/auth/refresh`

Request:

```json
{
  "refreshToken": "sessionId.secret"
}
```

Refresh rotiert den Token. Die Mobile-App muss den neuen `refreshToken` speichern und den alten verwerfen.

### Authentifizierte Requests

Alle geschuetzten Mobile-Endpunkte verwenden:

```text
Authorization: Bearer <accessToken>
```

`GET /api/mobile/v1/projects` gibt nur aktive Web-Zuordnungen aus `project_assignments` zurueck und erfordert `projectDiary: true`.

## Echte Mobile-Profilbild Schnittstellen

Profilbilder werden produktiv im privaten Bucket `employee-avatars` gespeichert. `employee.avatar` kann intern eine Storage-Referenz enthalten; Mobile soll fuer Anzeige immer `employee.avatarUrl` verwenden, falls vorhanden.

### Upload-URL Anfordern

`POST /api/mobile/v1/me/avatar-upload-url`

Request:

```json
{
  "fileName": "profil.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 123456
}
```

Erlaubte Typen: JPEG, PNG, WEBP, HEIC, HEIF. Maximale Groesse: 5 MB.

### Avatar Speichern

Nach erfolgreichem Upload:

`POST /api/mobile/v1/me/avatar`

Request:

```json
{
  "storagePath": "company/employee/file.jpg"
}
```

Der Server prueft, dass der Pfad zur eigenen Firma und zum eigenen Mitarbeiter gehoert. Die Antwort enthaelt wieder das Mobile-Mitarbeiterprofil inklusive `avatarUrl`.

### Avatar Loeschen

`DELETE /api/mobile/v1/me/avatar`

Entfernt die Avatar-Referenz am Mitarbeiter und loescht den alten privaten Storage-Avatar, sofern vorhanden.

## Echte Mobile-Dashboard Schnittstelle

`GET /api/mobile/v1/dashboard`

Optionaler Query-Parameter fuer Tests:

```text
?date=YYYY-MM-DD
```

Response buendelt die Startdaten fuer die Mobile-App:

- eigenes Mitarbeiterprofil inklusive `avatarUrl`
- aktuelle Mobile-Rechte
- heutiger Zeitstatus, falls `timeTracking` aktiv ist
- Wochenstunden, Sollstunden und Monatsstatus, falls `timeTracking` aktiv ist
- zugewiesene Projekte und heutiger Einsatz, falls `projectDiary` aktiv ist
- neue/ungelesene Dokumente, falls `documents` aktiv ist
- Hinweise wie fehlende heutige Zeit oder ungelesene Pflichtdokumente

Module ohne Berechtigung werden als `null` geliefert und duerfen in Mobile nicht sichtbar sein.

## Echte Mobile-Zeiterfassung Schnittstellen

Alle Zeiterfassungs-Endpunkte erfordern:

- `Authorization: Bearer <accessToken>`
- Mobile-Modulrecht `timeTracking: true`
- aktiven Mobile-Zugang

Mobile darf keine `employeeId` oder `userId` senden. Beide Werte kommen aus der Mobile-Sitzung.

### Eintraege Lesen

`GET /api/mobile/v1/time-entries?month=YYYY-MM`

Response:

```json
{
  "entries": []
}
```

### Eintrag Erstellen

`POST /api/mobile/v1/time-entries`

Request:

```json
{
  "date": "2026-07-22",
  "startTime": "07:00",
  "endTime": "16:00",
  "type": "WORK",
  "projectId": "optional-assigned-project-id",
  "location": "Baustelle",
  "notes": "Optional"
}
```

Wenn `projectId` gesetzt ist, muss dieses Projekt dem Mitarbeiter in Web aktiv zugeordnet sein.
`breakDuration` ist optional. In Phase 1 kann Mobile nur Beginn und Ende senden; Pause kann danach im Web ergaenzt werden. Wenn Mobile keine Pause sendet, speichert die API `breakDuration = 0`.

### Eintrag Aendern / Loeschen

```text
PATCH  /api/mobile/v1/time-entries/:id
DELETE /api/mobile/v1/time-entries/:id
```

Mutationen sind nur fuer eigene Eintraege und nur fuer offene Monate erlaubt.

### Monatsstatus

`GET /api/mobile/v1/timesheets/:month`

Gibt Timesheet-Metadaten und eine einfache Summary zurueck.

### Monat Einreichen

`POST /api/mobile/v1/timesheets/:month/submit`

Mobile-Submit setzt `status = submitted` und `submittedAt = now`. Danach sind Mobile-Mutationen fuer diesen Monat gesperrt. Die finale Abnahme/Archivierung im Web setzt spaeter `status = finalized`.

## Echte Mobile-Dokument Schnittstellen

Alle Dokument-Endpunkte erfordern:

- `Authorization: Bearer <accessToken>`
- Mobile-Modulrecht `documents: true`
- aktiven Mobile-Zugang

### Dokumentliste

`GET /api/mobile/v1/documents`

Response:

```json
{
  "folders": [
    {
      "id": "...",
      "name": "Lohnzettel",
      "sortOrder": 0,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "documents": [
    {
      "id": "...",
      "folderId": "...",
      "name": "Dienstvertrag.pdf",
      "mimeType": "application/pdf",
      "fileSize": 123456,
      "isShared": true,
      "readRequired": false,
      "createdAt": "...",
      "updatedAt": "...",
      "readAt": null
    }
  ]
}
```

Mobile bekommt nur `employee_documents.isShared = true` fuer den eigenen Mitarbeiter.

### Download-URL

`GET /api/mobile/v1/documents/:id/download-url`

Response:

```json
{
  "document": {
    "id": "...",
    "name": "Dienstvertrag.pdf",
    "mimeType": "application/pdf",
    "fileSize": 123456
  },
  "url": "https://...",
  "expiresIn": 600
}
```

Die URL ist kurzlebig und darf von Mobile nicht dauerhaft gespeichert werden.

### Gelesen Markieren

`POST /api/mobile/v1/documents/:id/read`

Response:

```json
{
  "success": true,
  "receipt": {
    "documentId": "...",
    "employeeId": "...",
    "readAt": "..."
  }
}
```

## Echte Mobile-Projekt/Bautagebuch Schnittstellen

Alle Projekt-/Bautagebuch-Endpunkte erfordern:

- `Authorization: Bearer <accessToken>`
- Mobile-Modulrecht `projectDiary: true`
- aktiven Mobile-Zugang
- aktive Projektzuweisung in `project_assignments`

### Projekt-Detail

`GET /api/mobile/v1/projects/:id`

Liefert nur ein Projekt, wenn es dem Mitarbeiter aktiv zugewiesen ist.

### Bautagebuch Lesen

`GET /api/mobile/v1/projects/:id/diary`

Mobile sieht Eintraege mit `visibility = assigned_team` und eigene Mobile-Eintraege des Mitarbeiters. Interne Web-/Office-Eintraege mit `visibility = office` werden Mobile nicht automatisch angezeigt.

### Bautagebuch Eintrag Erstellen

`POST /api/mobile/v1/projects/:id/diary`

Request:

```json
{
  "description": "Fortschritt dokumentiert.",
  "visibility": "office",
  "clientOperationId": "optional-offline-id",
  "attachments": [
    {
      "storagePath": "company/project/employee/file.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 123456
    }
  ]
}
```

`clientOperationId` ist fuer Offline-/Retry-Sicherheit gedacht. Mobile soll pro lokalem Vorgang eine stabile ID senden.

### Bautagebuch Upload-URL

`POST /api/mobile/v1/projects/:id/diary/upload-url`

Request:

```json
{
  "fileName": "foto-baustelle.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 123456
}
```

Response:

```json
{
  "storagePath": "...",
  "signedUrl": "...",
  "token": "...",
  "bucket": "project-diary-attachments",
  "expiresIn": 7200
}
```

Mobile laedt die Datei damit direkt in Supabase Storage hoch und sendet danach `storagePath`, `mimeType` und `fileSize` beim Diary-POST mit.

## Sicherheitsregeln

Mobile darf niemals `userId`, `companyOwnerId` oder `employeeId` als vertrauenswuerdige Quelle setzen. Diese Werte muessen immer aus der geprueften Mobile-Sitzung auf dem Server kommen.

Mobile muss damit rechnen:

- fehlendes Modulrecht ergibt `403`
- deaktivierter Zugang ergibt `403`
- eingereichter oder abgeschlossener Monat ergibt bei Mutationen `409`
- bekannte UUIDs anderer Mitarbeiter oder Firmen ergeben `404` oder `403`

## Bestaetigte Tests Am 22.07.2026

- Aktivierung mit echtem Web-Mitarbeiter erfolgreich.
- Login mit PIN erfolgreich.
- `GET /api/mobile/v1/me` erfolgreich.
- Projektzuweisung in Web erstellt; `GET /api/mobile/v1/projects` liefert nur das zugewiesene Projekt.
- Dokumentordner in Web erstellt, Dokument hochgeladen und freigegeben.
- `GET /api/mobile/v1/documents` erfolgreich.
- `GET /api/mobile/v1/documents/:id/download-url` erfolgreich.
- `POST /api/mobile/v1/documents/:id/read` erfolgreich.
- Zeiteintrag per Mobile-API erstellt; Eintrag erscheint in der Web-Zeiterfassung.
- `GET /api/mobile/v1/time-entries?month=YYYY-MM` erfolgreich.
- `PATCH /api/mobile/v1/time-entries/:id` erfolgreich.
- `DELETE /api/mobile/v1/time-entries/:id` liefert `success: true`.
- Bautagebuch mit Storage-Anhang erscheint in Web.
- Mobile-Profilbild aus `employee-avatars` erscheint in Web.
- `GET /api/mobile/v1/dashboard?date=2026-07-23` erfolgreich mit `avatarUrl`, konsistenten Berechtigungen, Zeitstatus, Projektzuweisung, Dokumenten und Hinweisen.
- Mobile-PIN-Vertrag auf sechs Ziffern festgezogen.
- Mobile-Timesheet-Submit auf `submitted` statt `finalized` umgestellt.
- `POST /api/mobile/v1/timesheets/2026-07/submit` erfolgreich: `status = submitted`, `submittedAt` gesetzt, `finalizedAt = null`.
- Nach `submitted` blockiert `POST /api/mobile/v1/time-entries` fuer denselben Monat korrekt mit `409 Timesheet is locked for this month`.
- Security-Test Projekt: nicht zugewiesenes/fremdes Projekt liefert `404 Project not found or not assigned to this mobile employee`.
- Security-Test Dokument: fremdes/nicht vorhandenes Dokument liefert `404 Document not found`.
- Security-Test Zeiteintrag: fremder/nicht eigener Zeiteintrag liefert `404 Time entry not found`.
- Security-Test deaktivierter Zugang: Web-Deaktivierung setzt `appAccess.isAccessEnabled = false`, widerruft Sessions mit `revokedAt`, alter Mobile-Token erhaelt danach `401 Unauthorized`.

## Naechste Web-Schritte

1. Vor Release gezielte Security-Grenztests durchfuehren: fremder Mitarbeiter, fremdes Projekt, fremdes Dokument, deaktivierter Zugang.
2. Web-Abnahmefluss fuer `submitted -> finalized` in der Zeiterfassung visuell ausbauen.
