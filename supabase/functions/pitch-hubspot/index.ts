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
// Conservative daily ceiling per user, below HubSpot's own sequence send cap.
const DAILY_ARM_CAP = 200;

const CLAIM_PROPS = [
  "ur_pitch_subject",
  "ur_pitch_body",
  "ur_pitch_enroll_trigger",
  "ur_pitch_claimed_by",
  "ur_pitch_claimed_at",
  "ur_pitch_campaign",
  "ur_pitch_release_signal",
];


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

// ---------- Phase 3: claims, tickets, arming ----------

// deno-lint-ignore no-explicit-any
type Db = any;


async function stageId(label: string): Promise<string> {
  const map = await loadPipeline();
  if (map[label]) return map[label];
  const fresh = await loadPipeline(true);
  if (!fresh[label]) throw new Error(`Pipeline stage "${label}" not found on pipeline ${TICKET_PIPELINE_ID}`);
  return fresh[label];
}

async function labelForStageId(id: string): Promise<string | null> {
  const map = await loadPipeline();
  const hit = Object.entries(map).find(([, v]) => v === id);
  if (hit) return hit[0];
  const fresh = await loadPipeline(true);
  return Object.entries(fresh).find(([, v]) => v === id)?.[0] ?? null;
}

async function readContact(contactId: string, props: string[]) {
  const data = await hs(
    `/crm/v3/objects/contacts/${contactId}?properties=${encodeURIComponent(props.join(","))}`,
  );
  return (data?.properties ?? {}) as Record<string, string>;
}

/** Acquire the single active claim on a reporter. Returns the blocking claim when taken. */
async function acquireClaim(
  supabase: Db,
  args: {
    hubspot_contact_id: string;
    campaign_id: string | null;
    contact_id: string;
    user_id: string;
    user_email: string | null;
  },
) {
  const { data, error } = await supabase
    .from("pitch_claims")
    .insert({
      hubspot_contact_id: args.hubspot_contact_id,
      campaign_id: args.campaign_id,
      contact_id: args.contact_id,
      claimed_by: args.user_id,
      claimed_by_email: args.user_email,
    })
    .select("id")
    .single();

  if (!error) return { claim_id: String(data.id), blocked: null as null | Record<string, unknown> };

  const { data: holder } = await supabase
    .from("pitch_claims")
    .select("id, claimed_by, claimed_by_email, claimed_at, campaign_id, contact_id")
    .eq("hubspot_contact_id", args.hubspot_contact_id)
    .is("released_at", null)
    .maybeSingle();

  return { claim_id: null, blocked: holder ?? { reason: error.message } };
}

async function releaseClaim(
  supabase: Db,
  claimId: string,
  reason: string,
  forcedBy?: string | null,
) {
  await supabase
    .from("pitch_claims")
    .update({ released_at: new Date().toISOString(), release_reason: reason, forced_by: forcedBy ?? null })
    .eq("id", claimId)
    .is("released_at", null);
}

async function ensureTicket(
  supabase: Db,
  contact: Record<string, any>,
  campaign: Record<string, any>,
): Promise<string> {
  if (contact.hubspot_ticket_id) return String(contact.hubspot_ticket_id);

  const subject = `${campaign.client_name} / ${campaign.angle} - ${contact.name || "Reporter"}`;
  const payload: Record<string, unknown> = {
    properties: {
      subject,
      hs_pipeline: TICKET_PIPELINE_ID,
      hs_pipeline_stage: await stageId("Researching"),
    },
  };
  if (contact.hubspot_contact_id) {
    payload.associations = [{
      to: { id: String(contact.hubspot_contact_id) },
      types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 16 }],
    }];
  }
  const created = await hs("/crm/v3/objects/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const ticketId = String(created.id);
  await supabase.from("pitch_contacts").update({ hubspot_ticket_id: ticketId, stage_cache: "Researching" }).eq("id", contact.id);
  return ticketId;
}

async function moveTicket(ticketId: string, label: string) {
  await hs(`/crm/v3/objects/tickets/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { hs_pipeline_stage: await stageId(label) } }),
  });
}

/**
 * Approve -> claim -> write body -> verify -> own -> ticket -> arm trigger.
 * Any failure after the claim releases it, so a half-written pitch never enrolls.
 */
async function armContact(
  supabase: Db,
  contactRowId: string,
  user: { id: string; email?: string | null },
): Promise<{ ok: boolean; reason?: string; blocked?: unknown; ticket_id?: string }> {
  const { data: contact } = await supabase
    .from("pitch_contacts")
    .select("*")
    .eq("id", contactRowId)
    .maybeSingle();
  if (!contact) return { ok: false, reason: "Reporter not found" };
  if (contact.excluded) return { ok: false, reason: "Reporter is excluded from this campaign" };
  if (!contact.hubspot_contact_id) return { ok: false, reason: "Reporter is not in the CRM yet" };

  const { data: campaign } = await supabase
    .from("pitch_campaigns")
    .select("id, client_name, angle")
    .eq("id", contact.campaign_id)
    .maybeSingle();
  if (!campaign) return { ok: false, reason: "Campaign not found" };

  const { data: draft } = await supabase
    .from("pitch_drafts")
    .select("id, subject, body, status")
    .eq("contact_id", contactRowId)
    .maybeSingle();
  if (!draft) return { ok: false, reason: "No draft to arm" };
  if (draft.status !== "approved") return { ok: false, reason: "Draft is not approved yet" };

  const claim = await acquireClaim(supabase, {
    hubspot_contact_id: String(contact.hubspot_contact_id),
    campaign_id: contact.campaign_id,
    contact_id: contactRowId,
    user_id: user.id,
    user_email: user.email ?? null,
  });
  if (!claim.claim_id) {
    return { ok: false, reason: "Another pitch is active on this reporter", blocked: claim.blocked };
  }

  try {
    const ownerId = await ownerIdForEmail(user.email ?? undefined);
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);

    // 1. Write the pitch, without the trigger.
    const writeProps: Record<string, string> = {
      ur_pitch_subject: draft.subject ?? "",
      ur_pitch_body: draft.body ?? "",
      ur_pitch_claimed_by: user.email ?? "",
      ur_pitch_claimed_at: today,
      ur_pitch_campaign: `${campaign.client_name} / ${campaign.angle}`,
      ur_pitch_release_signal: "false",
      last_pitched_date: today,
    };
    if (ownerId) writeProps.hubspot_owner_id = ownerId;
    const currentStatus = await readContact(String(contact.hubspot_contact_id), ["media_relationship_status"]);
    if (String(currentStatus.media_relationship_status ?? "New") === "New") {
      writeProps.media_relationship_status = "Warm";
    }
    await hs(`/crm/v3/objects/contacts/${contact.hubspot_contact_id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: writeProps }),
    });

    // 2. Read back and confirm before anything can send.
    const verify = await readContact(String(contact.hubspot_contact_id), CLAIM_PROPS);
    if ((verify.ur_pitch_body ?? "").trim() !== (draft.body ?? "").trim()) {
      throw new Error("Pitch body did not save correctly in the CRM, so nothing was armed");
    }

    // 3. Ticket, then advance it.
    const ticketId = await ensureTicket(supabase, contact, campaign);
    await moveTicket(ticketId, "Pitched");

    // 4. Arm the enrollment workflow last.
    await hs(`/crm/v3/objects/contacts/${contact.hubspot_contact_id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: { ur_pitch_enroll_trigger: "true" } }),
    });

    await supabase
      .from("pitch_contacts")
      .update({ armed_at: nowIso, arm_error: null, hubspot_ticket_id: ticketId, stage_cache: "Pitched" })
      .eq("id", contactRowId);
    await supabase.from("pitch_drafts").update({ status: "armed", sent_at: nowIso }).eq("id", draft.id);

    return { ok: true, ticket_id: ticketId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await releaseClaim(supabase, claim.claim_id, `arm failed: ${message}`);
    await supabase.from("pitch_contacts").update({ arm_error: message }).eq("id", contactRowId);
    return { ok: false, reason: message };
  }
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

        if (signals.hubspot_contact_id && seenHubspot.has(signals.hubspot_contact_id)) {
          skipped++;
          continue;
        }
        if (rowEmail) seenEmails.add(rowEmail);
        if (signals.hubspot_contact_id) seenHubspot.add(signals.hubspot_contact_id);

        inserts.push({
          campaign_id: campaignId,
          name: row.name ?? "",
          outlet: row.outlet ?? "",
          email: rowEmail || null,
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

      if (inserts.length) {
        const { error } = await supabase.from("pitch_contacts").insert(inserts);
        if (error) throw new Error(error.message);
      }

      return json({ ok: true, imported: inserts.length, created, matched, failed, skipped });
    }

    if (action === "create-ticket") {
      const contactRowId = String(body.contact_id ?? "");
      if (!contactRowId) return json({ error: "contact_id required" }, 400);
      const { data: contact } = await supabase.from("pitch_contacts").select("*").eq("id", contactRowId).maybeSingle();
      if (!contact) return json({ error: "Reporter not found" }, 404);
      const { data: campaign } = await supabase
        .from("pitch_campaigns").select("id, client_name, angle").eq("id", contact.campaign_id).maybeSingle();
      if (!campaign) return json({ error: "Campaign not found" }, 404);
      const ticketId = await ensureTicket(supabase, contact, campaign);
      return json({ ok: true, ticket_id: ticketId });
    }

    if (action === "approve-and-arm") {
      const ids: string[] = Array.isArray(body.contact_ids)
        ? body.contact_ids.map(String)
        : body.contact_id ? [String(body.contact_id)] : [];
      if (!ids.length) return json({ error: "contact_id required" }, 400);

      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      const { count: armedToday } = await supabase
        .from("pitch_claims")
        .select("id", { count: "exact", head: true })
        .eq("claimed_by", user.id)
        .gte("claimed_at", since.toISOString());

      let remaining = Math.max(0, DAILY_ARM_CAP - (armedToday ?? 0));
      const results: Record<string, unknown>[] = [];
      let armed = 0, blocked = 0, failed = 0, capped = 0;

      for (const id of ids) {
        if (remaining <= 0) {
          capped++;
          results.push({ contact_id: id, ok: false, reason: "Daily send cap reached" });
          continue;
        }
        const res = await armContact(supabase, id, { id: user.id, email: user.email });
        if (res.ok) { armed++; remaining--; }
        else if (res.blocked) blocked++;
        else failed++;
        results.push({ contact_id: id, ...res });
      }

      return json({ ok: true, armed, blocked, failed, capped, results });
    }

    if (action === "release-claim") {
      const contactRowId = String(body.contact_id ?? "");
      const reason = String(body.reason ?? "released manually");
      const force = body.force === true;
      const { data: claim } = await supabase
        .from("pitch_claims")
        .select("id, claimed_by")
        .eq("contact_id", contactRowId)
        .is("released_at", null)
        .maybeSingle();
      if (!claim) return json({ ok: true, released: 0 });

      if (claim.claimed_by !== user.id) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (!isAdmin) return json({ error: "Only the holder or an admin can release this claim" }, 403);
      }
      await releaseClaim(supabase, String(claim.id), reason, force ? user.id : null);

      const { data: contact } = await supabase
        .from("pitch_contacts").select("hubspot_contact_id").eq("id", contactRowId).maybeSingle();
      if (contact?.hubspot_contact_id) {
        try {
          await hs(`/crm/v3/objects/contacts/${contact.hubspot_contact_id}`, {
            method: "PATCH",
            body: JSON.stringify({
              properties: { ur_pitch_claimed_by: "", ur_pitch_enroll_trigger: "false", ur_pitch_release_signal: "false" },
            }),
          });
        } catch (e) {
          console.error("claim release CRM clear failed:", e);
        }
      }
      return json({ ok: true, released: 1 });
    }

    if (action === "read-stages") {
      const { data: rows } = await supabase
        .from("pitch_contacts")
        .select("id, hubspot_ticket_id")
        .eq("campaign_id", String(body.campaign_id ?? ""))
        .not("hubspot_ticket_id", "is", null);

      const stages: Record<string, string | null> = {};
      for (const r of rows ?? []) {
        try {
          const t = await hs(`/crm/v3/objects/tickets/${r.hubspot_ticket_id}?properties=hs_pipeline_stage`);
          const label = await labelForStageId(String(t?.properties?.hs_pipeline_stage ?? ""));
          stages[r.id] = label;
          if (label) await supabase.from("pitch_contacts").update({ stage_cache: label }).eq("id", r.id);
        } catch (e) {
          console.error(`read-stages failed for ${r.id}: ${e}`);
          stages[r.id] = null;
        }
      }
      return json({ ok: true, stages });
    }

    if (action === "set-stage") {
      const contactRowId = String(body.contact_id ?? "");
      const label = String(body.stage ?? "");
      if (!contactRowId || !label) return json({ error: "contact_id and stage required" }, 400);
      const { data: contact } = await supabase
        .from("pitch_contacts").select("id, hubspot_contact_id, hubspot_ticket_id").eq("id", contactRowId).maybeSingle();
      if (!contact?.hubspot_ticket_id) return json({ error: "No ticket on this reporter yet" }, 400);

      await moveTicket(String(contact.hubspot_ticket_id), label);
      const t = await hs(`/crm/v3/objects/tickets/${contact.hubspot_ticket_id}?properties=hs_pipeline_stage`);
      const current = await labelForStageId(String(t?.properties?.hs_pipeline_stage ?? "")) ?? label;
      await supabase.from("pitch_contacts").update({ stage_cache: current }).eq("id", contactRowId);

      if (current === "Published (Won)" && contact.hubspot_contact_id) {
        const props: Record<string, string> = { last_coverage_date: new Date().toISOString().slice(0, 10) };
        if (body.clip_url) {
          // Additive: never clobber notes another team member wrote.
          const existing = await readContact(String(contact.hubspot_contact_id), ["pitch_preferences__notes"]);
          const prior = String(existing.pitch_preferences__notes ?? "").trim();
          const line = `Clip: ${String(body.clip_url)}`;
          props.pitch_preferences__notes = prior.includes(line) ? prior : [prior, line].filter(Boolean).join("\n");
        }

        await hs(`/crm/v3/objects/contacts/${contact.hubspot_contact_id}`, {
          method: "PATCH",
          body: JSON.stringify({ properties: props }),
        });
      }

      const closing = ["In Conversation", "Committed", "Published (Won)", "Closed Lost"];
      if (closing.includes(current)) {
        const { data: claim } = await supabase
          .from("pitch_claims").select("id").eq("contact_id", contactRowId).is("released_at", null).maybeSingle();
        if (claim) await releaseClaim(supabase, String(claim.id), `ticket reached ${current}`);
      }

      return json({ ok: true, stage: current });
    }

    if (action === "reconcile-claims") {
      const { data: claims } = await supabase
        .from("pitch_claims")
        .select("id, hubspot_contact_id, contact_id")
        .is("released_at", null);

      let released = 0;
      for (const c of claims ?? []) {
        try {
          const props = await readContact(String(c.hubspot_contact_id), CLAIM_PROPS);
          const signalled = String(props.ur_pitch_release_signal ?? "").toLowerCase() === "true";
          if (!signalled) continue;
          await releaseClaim(supabase, String(c.id), "sequence finished or reporter replied");
          await hs(`/crm/v3/objects/contacts/${c.hubspot_contact_id}`, {
            method: "PATCH",
            body: JSON.stringify({
              properties: { ur_pitch_release_signal: "false", ur_pitch_claimed_by: "", ur_pitch_enroll_trigger: "false" },
            }),
          });
          released++;
        } catch (e) {
          console.error(`reconcile failed for claim ${c.id}: ${e}`);
        }
      }
      return json({ ok: true, checked: claims?.length ?? 0, released });
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
