# Angebote (Offers) — Implementierungsprotokoll

## Status: In Arbeit

## Dateien

| Datei | Status |
|---|---|
| `src/types/offer.ts` | ✅ Erstellt |
| `src/hooks/useOffers.ts` | ✅ Erstellt |
| `src/app/api/offers/route.ts` | ✅ Erstellt |
| `src/components/OfferReactPDF.tsx` | ✅ Erstellt |
| `src/components/OfferPreviewModal.tsx` | ✅ Erstellt |
| `src/components/OfferForm.tsx` | ✅ Erstellt |
| `src/app/(dashboard)/offers/page.tsx` | ✅ Erstellt |
| `src/app/(dashboard)/offers/new/page.tsx` | ✅ Erstellt |
| `src/app/(dashboard)/offers/[id]/edit/page.tsx` | ✅ Erstellt |
| `src/components/Sidebar.tsx` | ✅ Aktualisiert |

---

## Supabase SQL — Bitte in Supabase ausführen

```sql
-- Tabelle für Angebote
CREATE TABLE IF NOT EXISTS offers (
    id                  TEXT PRIMARY KEY,
    "offerNumber"       TEXT,
    "subjectExtra"      TEXT,
    "constructionProject" TEXT,
    "issueDate"         TEXT,
    "validUntil"        TEXT,
    "performancePeriod" JSONB DEFAULT '{}',
    "customerId"        TEXT,
    "customerName"      TEXT,
    processor           TEXT,
    items               JSONB DEFAULT '[]',
    subtotal            NUMERIC DEFAULT 0,
    "taxRate"           NUMERIC DEFAULT 20,
    "taxAmount"         NUMERIC DEFAULT 0,
    "totalAmount"       NUMERIC DEFAULT 0,
    "isReverseCharge"   BOOLEAN DEFAULT false,
    status              TEXT DEFAULT 'draft',
    "projectId"         TEXT,
    notes               TEXT,
    "createdAt"         TEXT,
    "updatedAt"         TEXT,
    "userId"            TEXT,
    "pdfUrl"            TEXT
);

-- Row Level Security aktivieren
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Policy: Nutzer können nur ihre eigenen Angebote sehen und verwalten
CREATE POLICY "users can manage their own offers"
    ON offers
    FOR ALL
    USING (auth.uid()::text = "userId");
```

---

## Unterschiede zu Rechnungen (`invoices`)

| Eigenschaft | Rechnung | Angebot |
|---|---|---|
| Nummer | `invoiceNumber` | `offerNumber` |
| Status | draft/pending/paid/overdue/canceled | draft/sent/accepted/rejected/expired |
| Gültigkeit | — | `validUntil` |
| Zahlungskonditionen | `paymentTerms` (Pflicht) | — |
| Rechnungsart | standard/partial/final | — |
| Mahnwesen | dunningLevel etc. | — |
| PDF-Titel | "Rechnungs-Nr." | "Angebots-Nr." |
| Zahlungsblock | IBAN + Verwendungszweck | Gültigkeitshinweis |

---

## Angebotsnummer-Format

`YYYY/A-XX` — z.B. `2026/A-01`

Die Nummer wird automatisch vorgeschlagen (basierend auf Anzahl bestehender Angebote + 1) und kann im Formular manuell angepasst werden.
