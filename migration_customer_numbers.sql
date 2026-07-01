-- SQL Migration: Kundennummern zurücksetzen und mandantenspezifisch neu vergeben (Reparatur- & Migrationsskript).
-- Führe dieses Skript im Supabase SQL Editor aus.

-- 1. Kundennummer-Spalte zur Tabelle 'customers' hinzufügen (falls nicht existent)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_number TEXT;

-- 2. Spalte und Constraints temporär zurücksetzen, um eine fehlerfreie Neuberechnung zu ermöglichen
ALTER TABLE customers DROP CONSTRAINT IF EXISTS unique_customer_number;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS unique_tenant_customer_number;
UPDATE customers SET customer_number = NULL;

-- 3. Bestehende Kunden mit fortlaufenden Nummern befüllen (z. B. KD-10001, KD-10002, ...)
-- PARTITION BY "userId" sorgt dafür, dass der Nummernkreis für jede Firma (userId) separat bei 1 beginnt.
WITH numbered_customers AS (
  SELECT id, 'KD-' || (10000 + ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC)) as new_num
  FROM customers
)
UPDATE customers c
SET customer_number = nc.new_num
FROM numbered_customers nc
WHERE c.id = nc.id;

-- 4. Spalte als UNIQUE pro Firma (userId) deklarieren
ALTER TABLE customers ADD CONSTRAINT unique_tenant_customer_number UNIQUE ("userId", customer_number);

-- 5. JSONB-Spalte 'customerSettings' für den Kunden-Nummernkreis zur Tabelle 'settings' hinzufügen (falls nicht existent)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "customerSettings" JSONB DEFAULT '{"prefix": "KD-", "nextNumber": 10000, "mindestLaenge": 5}'::jsonb;

-- 6. Den Zähler 'nextNumber' in den Einstellungen für jede Firma automatisch anpassen
-- Setzt den Wert auf 10000 + Anzahl der Kunden + 1, damit die nächste manuelle oder automatische Vergabe nahtlos anschließt.
WITH tenant_counts AS (
  SELECT "userId", COUNT(*) as customer_count
  FROM customers
  GROUP BY "userId"
)
UPDATE settings s
SET "customerSettings" = jsonb_build_object(
  'prefix', COALESCE(s."customerSettings"->>'prefix', 'KD-'),
  'mindestLaenge', COALESCE((s."customerSettings"->>'mindestLaenge')::int, 5),
  'nextNumber', 10000 + tc.customer_count + 1
)
FROM tenant_counts tc
WHERE s."userId" = tc."userId";
