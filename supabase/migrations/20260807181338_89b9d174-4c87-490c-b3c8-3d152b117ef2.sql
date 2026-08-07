
WITH ranked AS (
  SELECT id, campaign_id,
         COALESCE(hubspot_contact_id, 'email:' || lower(email)) AS k,
         row_number() OVER (PARTITION BY campaign_id, COALESCE(hubspot_contact_id, 'email:' || lower(email)) ORDER BY created_at) AS rn,
         first_value(id) OVER (PARTITION BY campaign_id, COALESCE(hubspot_contact_id, 'email:' || lower(email)) ORDER BY created_at) AS keep_id
  FROM public.pitch_contacts
  WHERE hubspot_contact_id IS NOT NULL OR email IS NOT NULL
)
UPDATE public.pitch_drafts d SET contact_id = r.keep_id
FROM ranked r WHERE d.contact_id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY campaign_id, COALESCE(hubspot_contact_id, 'email:' || lower(email)) ORDER BY created_at) AS rn
  FROM public.pitch_contacts
  WHERE hubspot_contact_id IS NOT NULL OR email IS NOT NULL
)
DELETE FROM public.pitch_contacts p USING ranked r WHERE p.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS pitch_contacts_campaign_hubspot_uniq
  ON public.pitch_contacts (campaign_id, hubspot_contact_id)
  WHERE hubspot_contact_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pitch_contacts_campaign_email_uniq
  ON public.pitch_contacts (campaign_id, lower(email))
  WHERE email IS NOT NULL;
