

## Plan: SOW Upload with AI Extraction at the Client Level

### Overview
Add a SOW (Statement of Work) document management system to the client detail panel. Teams can upload multiple PDFs per client, the system marks one as "current," and an AI edge function extracts a summary plus key fields (dates, retainer, deliverables, renewal date) on upload. SOW text is stored for full-text search across clients.

### Changes

**1. Database migration** — new `client_sows` table:
```sql
CREATE TABLE public.client_sows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  -- AI-extracted fields
  summary text,
  start_date text,
  end_date text,
  renewal_date text,
  retainer_amount text,
  deliverables jsonb DEFAULT '[]',
  raw_text text,
  ai_processed boolean NOT NULL DEFAULT false
);

ALTER TABLE public.client_sows ENABLE ROW LEVEL SECURITY;

-- Only one "current" SOW per client (trigger-based)
CREATE OR REPLACE FUNCTION public.ensure_single_current_sow()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_current THEN
    UPDATE public.client_sows
    SET is_current = false
    WHERE client_name = NEW.client_name AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_current_sow
BEFORE INSERT OR UPDATE ON public.client_sows
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_sow();
```
RLS: authenticated users can SELECT, INSERT, UPDATE, DELETE.

**2. Storage bucket** — `client-sows` (private bucket, authenticated access only).

**3. Edge function `extract-sow`** — triggered after upload:
- Downloads the PDF from storage.
- Extracts text (sends to Lovable AI with a structured extraction prompt using tool calling).
- Extracts: summary, start/end dates, retainer amount, deliverables list, renewal date.
- Updates the `client_sows` row with extracted fields + raw_text.

**4. `src/pages/ClientsPage.tsx`** — new "SOW" section in client detail panel:
- Upload button (PDF only, max 20MB).
- List of uploaded SOWs with file name, upload date, and "current" badge.
- Click to set as current; click to download.
- When a SOW is current, show the AI-extracted summary and key fields (start date, end date, retainer, renewal date, deliverables) in a clean card layout.
- Delete option for each SOW.

**5. Search** — add SOW search capability:
- In the existing client search bar, also search `client_sows.raw_text` via a database function or client-side filter on the summary field.
- Alternatively, add a dedicated "Search SOWs" input that queries across all clients' SOW text.

**6. `src/data/types.ts`** — new `ClientSOW` interface:
```typescript
export interface ClientSOW {
  id: string;
  client_name: string;
  file_name: string;
  storage_path: string;
  is_current: boolean;
  uploaded_at: string;
  summary?: string;
  start_date?: string;
  end_date?: string;
  renewal_date?: string;
  retainer_amount?: string;
  deliverables?: string[];
  ai_processed: boolean;
}
```

### Files modified/created
- Database migration (new table + trigger + RLS + storage bucket)
- `supabase/functions/extract-sow/index.ts` (new edge function)
- `src/data/types.ts` (new interface)
- `src/pages/ClientsPage.tsx` (SOW section in detail panel)
- `src/hooks/useClientSows.ts` (new hook for CRUD + upload)

### User flow
1. Open client detail panel → scroll to "Statements of Work" section
2. Click "Upload SOW" → select PDF → file uploads to storage
3. Edge function auto-extracts summary + key fields via AI
4. Extracted info appears in the panel (summary, dates, retainer, deliverables)
5. Upload additional SOWs → mark any as "current"
6. Search across all client SOWs from the main search bar

