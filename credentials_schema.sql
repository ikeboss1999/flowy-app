-- SQL Script zur Erstellung der Tabelle "credentials" in Supabase
-- Kopiere diesen Code und führe ihn im "SQL Editor" deines Supabase Dashboards aus.

-- 1. Tabelle für Zugangsdaten (credentials) erstellen
CREATE TABLE IF NOT EXISTS public.credentials (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT,
    username TEXT NOT NULL,
    password TEXT NOT NULL, -- Verschlüsseltes Passwort
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. RLS (Row Level Security) aktivieren
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies für credentials erstellen
DROP POLICY IF EXISTS "Users can perform all operations on their own credentials" ON public.credentials;
CREATE POLICY "Users can perform all operations on their own credentials" 
ON public.credentials 
FOR ALL 
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");
