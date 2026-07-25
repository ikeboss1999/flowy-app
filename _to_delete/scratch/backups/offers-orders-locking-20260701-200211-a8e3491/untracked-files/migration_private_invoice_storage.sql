-- Make invoice PDFs private.
-- Run this in the Supabase SQL editor after deploying the server-side signed URL flow.

update storage.buckets
set public = false
where id = 'invoices';
