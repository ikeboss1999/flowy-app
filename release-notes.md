# FlowY Version 1.2.9

## Neue Funktionen
- **Profilbilder**: Mitarbeiter können nun in der Desktop- und Mobile-Ansicht ihre Profilbilder ändern oder löschen.
- **Erweiterte Datenbank-Synchronisation**: Vorbereitung der Datenbank-Struktur für die kommende Mobile App (Zeiterfassung & Rechnungen).

## Fehlerbehebungen
- **Zeiterfassung**: Kritischer Fehler beim Speichern von Zeitbuchungen behoben (Datenbank-Schema-Konflikt gelöst).
- **Rechnungsstellung**: Fehler beim Finalisieren von Rechnungen behoben. Die Rechnungsnummer wird nun nur noch bei erfolgreicher Speicherung erhöht.
- **Daten-Persistenz**: Alle neuen Felder (Pause, Schlechtwetter, Überstunden, etc.) werden nun korrekt in Supabase gespeichert.
- Allgemeine Stabilitäts- und Performanceverbesserungen.
