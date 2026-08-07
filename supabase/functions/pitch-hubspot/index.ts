import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/hubspot";
const TICKET_PIPELINE_ID = "923698812";
const RECENTLY_PITCHED_DAYS = 30;

const CONTACT_PROPS = [
  "email",
  "firstname",
  "lastname",
  "company",
  "jobtitle",
  "city",
  "lifecyclestage",
  "hubspot_owner_id",
  "pr_contact",
  "pr_owner",
  "media_relationship_status",
  "journalist_tier",
  "beats__topics_covered",
  "last_pitched_date",
  "last_coverage_date",
  "contact_source",
  "pitch_preferences__notes",
  "is_podcast_outreach_contact",
];

// Never demote a real sales relationship back to "Other".
const PROTECTED_LIFECYCLE = new Set(["customer", "opportunity", "salesqualifiedlead"]);


function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hsRaw(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const HUBSPOT_API_KEY = Deno.env.get("HUBSPOT_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!HUBSPOT_API_KEY) throw new Error("HUBSPOT_API_KEY is not configured");

  return await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": HUBSPOT_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function hs(path: string, init: RequestInit = {}) {
  const res = await hsRaw(path, init);
  if (!res.ok) {
    const body = await res.text();
    console.error(`HubSpot request failed [${res.status}] ${path}: ${body}`);
    throw new Error(`[${res.status}]: ${body}`);
  }
  return await res.json();
}

let cachedPortalId: string | null = null;
async function getPortalId(): Promise<string | null> {
  if (cachedPortalId) return cachedPortalId;
  try {
    const data = await hs("/account-info/v3/details");
    cachedPortalId = String(data?.portalId ?? "");
    return cachedPortalId || null;
  } catch (_e) {
    return null;
  }
}

let ownerCache: Map<string, { name: string; email: string }> | null = null;
let ownerByEmail: Map<string, string> | null = null;
async function getOwners() {
  if (ownerCache) return ownerCache;
  const map = new Map<string, { name: string; email: string }>();
  const byEmail = new Map<string, string>();
  try {
    const data = await hs("/crm/v3/owners?limit=500");
    for (const o of data?.results ?? []) {
      map.set(String(o.id), {
        name: [o.firstName, o.lastName].filter(Boolean).join(" ") || o.email || "",
        email: o.email ?? "",
      });
      if (o.email) byEmail.set(String(o.email).trim().toLowerCase(), String(o.id));
    }
  } catch (_e) { /* owners are optional */ }
  ownerCache = map;
  ownerByEmail = byEmail;
  return map;
}

/** Resolve the importing user's login email to a CRM owner id, if they are seated. */
async function ownerIdForEmail(email: string | undefined): Promise<string | null> {
  await getOwners();
  if (!email) return null;
  return ownerByEmail?.get(email.trim().toLowerCase()) ?? null;
}


// { label -> stageId } resolved live from the Pipelines API. Never hardcoded.
let pipelineCache: Record<string, string> | null = null;
async function loadPipeline(force = false): Promise<Record<string, string>> {
  if (pipelineCache && !force) return pipelineCache;
  const data = await hs(`/crm/v3/pipelines/tickets/${TICKET_PIPELINE_ID}`);
  const map: Record<string, string> = {};
  for (const s of data?.stages ?? []) map[String(s.label)] = String(s.id);
  pipelineCache = map;
  return map;
}

async function searchContactByEmail(email: string) {
  const data = await hs("/crm/v3/objects/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
      properties: CONTACT_PROPS,
      limit: 1,
    }),
  });
  return data?.results?.[0] ?? null;
}

async function searchContactByNameOutlet(firstname: string, lastname: string, outlet: string) {
  const filters: Record<string, string>[] = [];
  if (lastname) filters.push({ propertyName: "lastname", operator: "EQ", value: lastname });
  if (firstname) filters.push({ propertyName: "firstname", operator: "EQ", value: firstname });
  if (outlet) filters.push({ propertyName: "company", operator: "EQ", value: outlet });
  if (filters.length < 2) return [];
  const data = await hs("/crm/v3/objects/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [{ filters }],
      properties: CONTACT_PROPS,
      limit: 5,
    }),
  });
  return data?.results ?? [];
}

function splitName(name: string) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstname: "", lastname: "" };
  if (parts.length === 1) return { firstname: parts[0], lastname: "" };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}

function unionBeats(existing: string, incoming: string) {
  const split = (v: string) =>
    String(v ?? "").split(";").map((s) => s.trim()).filter(Boolean);
  const set = new Set([...split(existing), ...split(incoming)]);
  return Array.from(set).join(";");
}

/** Additive property patch — never clobbers a populated HubSpot field with a blank cell. */
function buildPatch(row: Row, existing: Record<string, unknown> | null, ownerId?: string | null) {
  const p = existing ?? {};
  const patch: Record<string, string> = {
    pr_contact: "true",
    contact_source: "Import",
  };
  const { firstname, lastname } = splitName(row.name);
  if (firstname && !p.firstname) patch.firstname = firstname;
  if (lastname && !p.lastname) patch.lastname = lastname;
  if (row.outlet && !p.company) patch.company = row.outlet;
  if (row.title && !p.jobtitle) patch.jobtitle = row.title;
  if (row.location && !p.city) patch.city = row.location;
  if (row.notes && !p.pitch_preferences__notes) patch.pitch_preferences__notes = row.notes;
  if (!p.media_relationship_status) patch.media_relationship_status = "New";
  if (row.beat) {
    const merged = unionBeats(String(p.beats__topics_covered ?? ""), row.beat);
    if (merged && merged !== String(p.beats__topics_covered ?? "")) {
      patch.beats__topics_covered = merged;
    }
  }
  if (row.tier && !p.journalist_tier) patch.journalist_tier = row.tier;

  // Contact Owner: fill only when empty — enroll is the authoritative owner-set.
  if (ownerId && !p.hubspot_owner_id) patch.hubspot_owner_id = ownerId;

  // Lifecycle: keep journalists out of the lead funnel, but never demote real sales stages.
  const lifecycle = String(p.lifecyclestage ?? "").toLowerCase();
  if (!PROTECTED_LIFECYCLE.has(lifecycle) && lifecycle !== "other") {
    patch.lifecyclestage = "other";
  }
  return patch;
}

interface Row {
  name: string;
  outlet: string;
  email: string;
  beat: string;
  title: string;
  location: string;
  notes?: string;
  tier?: string;
  source_row?: Record<string, unknown>;
}


interface Signals {
  hubspot_contact_id: string | null;
  matched: boolean;
  warnings: { kind: string; label: string; detail?: string }[];
  duplicate_candidates?: { id: string; name: string; outlet: string; hubspot_url: string }[];
}

function contactWarnings(props: Record<string, unknown>, owners: Map<string, { name: string; email: string }>) {
  const warnings: { kind: string; label: string; detail?: string }[] = [];

  const lastPitched = props.last_pitched_date ? new Date(String(props.last_pitched_date)) : null;
  if (lastPitched && !isNaN(lastPitched.getTime())) {
    const days = Math.floor((Date.now() - lastPitched.getTime()) / 86400000);
    if (days <= RECENTLY_PITCHED_DAYS) {
      warnings.push({
        kind: "recently_pitched",
        label: "Recently pitched",
        detail: `Pitched ${days === 0 ? "today" : `${days} days ago`} by someone on the team`,
      });
    }
  }

  if (String(props.is_podcast_outreach_contact ?? "").toLowerCase() === "true") {
    warnings.push({
      kind: "podcast_team",
      label: "Podcast team is working them",
    });
  }

  if (String(props.media_relationship_status ?? "") === "Do Not Pitch") {
    warnings.push({ kind: "do_not_pitch", label: "Do Not Pitch" });
  }

  const ownerId = props.hubspot_owner_id ? String(props.hubspot_owner_id) : "";
  const isPr = String(props.pr_contact ?? "").toLowerCase() === "true";
  if (ownerId && !isPr) {
    const owner = owners.get(ownerId);
    warnings.push({
      kind: "owned_by_sales",
      label: "Owned by sales",
      detail: owner?.name ? `Owner: ${owner.name}` : undefined,
    });
  }

  return warnings;
}

async function findOrCreateContact(row: Row, owners: Map<string, { name: string; email: string }>, portalId: string | null, ownerId: string | null): Promise<Signals> {
  const email = String(row.email ?? "").trim().toLowerCase();
  const { firstname, lastname } = splitName(row.name);

  if (!email) {
    // No email: HubSpot enforces uniqueness on email only, so surface possible
    // duplicates for a human decision instead of creating blind.
    const candidates = await searchContactByNameOutlet(firstname, lastname, row.outlet);
    if (candidates.length) {
      return {
        hubspot_contact_id: null,
        matched: false,
        warnings: [{
          kind: "possible_duplicate",
          label: "Possible duplicate",
          detail: "No email on this row — link to an existing contact or create new",
        }],
        duplicate_candidates: candidates.map((c: any) => ({
          id: String(c.id),
          name: [c.properties?.firstname, c.properties?.lastname].filter(Boolean).join(" "),
          outlet: c.properties?.company ?? "",
          hubspot_url: portalId ? `https://app.hubspot.com/contacts/${portalId}/contact/${c.id}` : "",
        })),
      };
    }
    const created = await hs("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({ properties: buildPatch(row, null, ownerId) }),
    });
    return { hubspot_contact_id: String(created.id), matched: false, warnings: [] };
  }

  let existing = await searchContactByEmail(email);

  if (!existing) {
    const res = await hsRaw("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({ properties: { email, ...buildPatch(row, null, ownerId) } }),
    });
    if (res.status === 409) {
      // Race: another import created it first. Re-fetch by email and reuse.
      await res.text();
      existing = await searchContactByEmail(email);
    } else if (!res.ok) {
      const body = await res.text();
      throw new Error(`[${res.status}]: ${body}`);
    } else {
      const created = await res.json();
      return { hubspot_contact_id: String(created.id), matched: false, warnings: [] };
    }
  }

  if (!existing) throw new Error(`Could not resolve contact for ${email}`);

  const props = existing.properties ?? {};
  const patch = buildPatch(row, props, ownerId);
  await hs(`/crm/v3/objects/contacts/${existing.id}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: patch }),
  });

  return {
    hubspot_contact_id: String(existing.id),
    matched: true,
    warnings: contactWarnings(props, owners),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action === "load-pipeline") {
      const map = await loadPipeline(true);
      return json({ stages: map, portal_id: await getPortalId() });
    }

    if (action === "import") {
      const campaignId = String(body.campaign_id ?? "");
      const rows = (body.rows ?? []) as Row[];
      if (!campaignId) return json({ error: "campaign_id required" }, 400);
      if (!Array.isArray(rows) || !rows.length) return json({ error: "No rows to import" }, 400);

      const owners = await getOwners();
      const portalId = await getPortalId();
      const importerOwnerId = await ownerIdForEmail(user.email ?? undefined);
      const ownerWarning = importerOwnerId
        ? []
        : [{
          kind: "owner_unmatched",
          label: "Owner not set",
          detail: `No CRM user matches ${user.email ?? "your login"}, so Contact Owner was left as-is.`,
        }];

      let created = 0;
      let matched = 0;
      let failed = 0;
      let skipped = 0;
      const inserts: Record<string, unknown>[] = [];

      // Already on this campaign — never list the same reporter twice.
      const { data: existingRows } = await supabase
        .from("pitch_contacts")
        .select("email, hubspot_contact_id")
        .eq("campaign_id", campaignId);
      const seenEmails = new Set<string>();
      const seenHubspot = new Set<string>();
      for (const r of existingRows ?? []) {
        if (r.email) seenEmails.add(String(r.email).trim().toLowerCase());
        if (r.hubspot_contact_id) seenHubspot.add(String(r.hubspot_contact_id));
      }

      for (const row of rows) {
        const rowEmail = row.email ? String(row.email).trim().toLowerCase() : "";
        if (rowEmail && seenEmails.has(rowEmail)) {
          skipped++;
          continue;
        }
        let signals: Signals;
        try {
          signals = await findOrCreateContact(row, owners, portalId, importerOwnerId);
          if (signals.matched) matched++;
          else if (signals.hubspot_contact_id) created++;
          if (signals.hubspot_contact_id) signals.warnings.push(...ownerWarning);
        } catch (e) {
          failed++;
          console.error(`import row failed (${row.email || row.name}): ${e}`);
          signals = {
            hubspot_contact_id: null,
            matched: false,
            warnings: [{
              kind: "hubspot_error",
              label: "Not saved to CRM",
              detail: e instanceof Error ? e.message : String(e),
            }],
          };
        }

        inserts.push({
          campaign_id: campaignId,
          name: row.name ?? "",
          outlet: row.outlet ?? "",
          email: row.email ? String(row.email).trim().toLowerCase() : null,
          beat: row.beat ?? "",
          title: row.title ?? "",
          location: row.location ?? "",
          source_row: row.source_row ?? row,
          hubspot_contact_id: signals.hubspot_contact_id,
          warnings: [
            ...signals.warnings,
            ...(signals.duplicate_candidates?.length
              ? [{ kind: "duplicate_candidates", label: "Candidates", detail: JSON.stringify(signals.duplicate_candidates) }]
              : []),
          ],
        });
      }

      const { error } = await supabase.from("pitch_contacts").insert(inserts);
      if (error) throw new Error(error.message);

      return json({ ok: true, imported: inserts.length, created, matched, failed });
    }

    if (action === "portal") {
      return json({ portal_id: await getPortalId() });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("pitch-hubspot error:", message);
    return json({ error: message }, 500);
  }
});
