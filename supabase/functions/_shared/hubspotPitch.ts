// Shared HubSpot writes for the Gmail send path. Server-only.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/hubspot";
export const TICKET_PIPELINE_ID = "923698812";

export async function hs(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const HUBSPOT_API_KEY = Deno.env.get("HUBSPOT_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!HUBSPOT_API_KEY) throw new Error("HUBSPOT_API_KEY is not configured");

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": HUBSPOT_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`HubSpot request failed [${res.status}] ${path}: ${body}`);
    throw new Error(`[${res.status}]: ${body}`);
  }
  return await res.json();
}

// { label -> stageId }, resolved live. Never hardcoded.
let pipelineCache: Record<string, string> | null = null;
async function loadPipeline(force = false): Promise<Record<string, string>> {
  if (pipelineCache && !force) return pipelineCache;
  const data = await hs(`/crm/v3/pipelines/tickets/${TICKET_PIPELINE_ID}`);
  const map: Record<string, string> = {};
  for (const s of data?.stages ?? []) map[String(s.label)] = String(s.id);
  pipelineCache = map;
  return map;
}

export async function stageId(label: string): Promise<string> {
  const map = await loadPipeline();
  if (map[label]) return map[label];
  const fresh = await loadPipeline(true);
  if (!fresh[label]) {
    throw new Error(`Pipeline stage "${label}" not found on pipeline ${TICKET_PIPELINE_ID}`);
  }
  return fresh[label];
}

let ownerByEmail: Map<string, string> | null = null;
export async function ownerIdForEmail(email: string | undefined | null): Promise<string | null> {
  if (!ownerByEmail) {
    const map = new Map<string, string>();
    try {
      const data = await hs("/crm/v3/owners?limit=500");
      for (const o of data?.results ?? []) {
        if (o.email) map.set(String(o.email).trim().toLowerCase(), String(o.id));
      }
    } catch (_e) { /* owners are optional */ }
    ownerByEmail = map;
  }
  if (!email) return null;
  return ownerByEmail.get(email.trim().toLowerCase()) ?? null;
}

// deno-lint-ignore no-explicit-any
type Db = any;

export async function ensureTicket(
  supabase: Db,
  // deno-lint-ignore no-explicit-any
  contact: Record<string, any>,
  // deno-lint-ignore no-explicit-any
  campaign: Record<string, any>,
): Promise<string> {
  if (contact.hubspot_ticket_id) return String(contact.hubspot_ticket_id);

  const payload: Record<string, unknown> = {
    properties: {
      subject: `${campaign.client_name} / ${campaign.angle} - ${contact.name || "Reporter"}`,
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
  await supabase
    .from("pitch_contacts")
    .update({ hubspot_ticket_id: ticketId, stage_cache: "Researching" })
    .eq("id", contact.id);
  return ticketId;
}

export async function moveTicket(ticketId: string, label: string) {
  await hs(`/crm/v3/objects/tickets/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { hs_pipeline_stage: await stageId(label) } }),
  });
}

/** Log the pitch (or the reply) as a note on the reporter's contact record. */
export async function logNote(contactId: string, text: string) {
  await hs("/crm/v3/objects/notes", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_note_body: text,
        hs_timestamp: new Date().toISOString(),
      },
      associations: [{
        to: { id: contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
      }],
    }),
  });
}

export async function readContact(contactId: string, props: string[]) {
  const data = await hs(
    `/crm/v3/objects/contacts/${contactId}?properties=${encodeURIComponent(props.join(","))}`,
  );
  return (data?.properties ?? {}) as Record<string, string>;
}
