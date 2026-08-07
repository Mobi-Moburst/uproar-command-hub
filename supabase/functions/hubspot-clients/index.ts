import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/hubspot";

const COMPANY_PROPS = [
  "name",
  "domain",
  "lifecyclestage",
  "industry",
  "city",
  "state",
  "hubspot_owner_id",
  "notes_last_updated",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hs(path: string, init: RequestInit = {}) {
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

let ownerCache: Map<string, string> | null = null;
async function getOwners(): Promise<Map<string, string>> {
  if (ownerCache) return ownerCache;
  const map = new Map<string, string>();
  try {
    const data = await hs("/crm/v3/owners?limit=500");
    for (const o of data?.results ?? []) {
      map.set(
        String(o.id),
        [o.firstName, o.lastName].filter(Boolean).join(" ") || o.email || "",
      );
    }
  } catch (_e) { /* owners are optional */ }
  ownerCache = map;
  return map;
}

let stageCache: Map<string, string> | null = null;
async function getDealStages(): Promise<Map<string, string>> {
  if (stageCache) return stageCache;
  const map = new Map<string, string>();
  try {
    const data = await hs("/crm/v3/pipelines/deals");
    for (const pipeline of data?.results ?? []) {
      for (const stage of pipeline?.stages ?? []) {
        map.set(String(stage.id), stage.label ?? "");
      }
    }
  } catch (_e) { /* stage labels are optional */ }
  stageCache = map;
  return map;
}



const norm = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const STOP = new Set(["inc", "llc", "ltd", "corp", "corporation", "co", "the", "group", "usa", "company"]);
const tokens = (s: string) => norm(s).split(" ").filter((t) => t && !STOP.has(t));

async function searchCompanies(term: string, limit = 8) {
  const data = await hs("/crm/v3/objects/companies/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [
        { filters: [{ propertyName: "name", operator: "CONTAINS_TOKEN", value: term }] },
      ],
      properties: COMPANY_PROPS,
      limit,
    }),
  });
  return data?.results ?? [];
}

async function toSuggestion(c: Record<string, any>, owners: Map<string, string>, portalId: string | null) {
  const p = c.properties ?? {};
  return {
    id: String(c.id),
    name: p.name ?? "",
    domain: p.domain ?? "",
    city: p.city ?? "",
    lifecycle_stage: p.lifecyclestage ?? "",
    industry: p.industry ?? "",
    owner_name: owners.get(String(p.hubspot_owner_id ?? "")) ?? "",
    hubspot_url: portalId ? `https://app.hubspot.com/contacts/${portalId}/company/${c.id}` : "",
  };
}

async function fetchAssociated(companyId: string, objectType: "contacts" | "deals", props: string[]) {
  const assoc = await hs(`/crm/v4/objects/companies/${companyId}/associations/${objectType}?limit=50`);
  const ids = (assoc?.results ?? []).map((r: any) => String(r.toObjectId)).slice(0, 25);
  if (!ids.length) return [];
  const batch = await hs(`/crm/v3/objects/${objectType}/batch/read`, {
    method: "POST",
    body: JSON.stringify({ properties: props, inputs: ids.map((id: string) => ({ id })) }),
  });
  return batch?.results ?? [];
}

async function syncClient(supabase: any, clientName: string, companyId: string) {
  const owners = await getOwners();
  const portalId = await getPortalId();

  const company = await hs(
    `/crm/v3/objects/companies/${companyId}?properties=${COMPANY_PROPS.join(",")}`,
  );
  const p = company?.properties ?? {};

  const contactRecords = await fetchAssociated(companyId, "contacts", [
    "firstname", "lastname", "email", "jobtitle", "phone",
  ]);
  const dealRecords = await fetchAssociated(companyId, "deals", [
    "dealname", "dealstage", "amount", "closedate", "pipeline",
  ]);

  const contacts = contactRecords.map((c: any) => ({
    id: String(c.id),
    name: [c.properties?.firstname, c.properties?.lastname].filter(Boolean).join(" "),
    title: c.properties?.jobtitle ?? "",
    email: c.properties?.email ?? "",
    hubspot_url: portalId ? `https://app.hubspot.com/contacts/${portalId}/contact/${c.id}` : "",
  }));

  const stageLabels = await getDealStages();
  const deals = dealRecords.map((d: any) => ({
    id: String(d.id),
    name: d.properties?.dealname ?? "",
    stage: stageLabels.get(String(d.properties?.dealstage ?? "")) ?? (d.properties?.dealstage ?? ""),
    amount: d.properties?.amount ? Number(d.properties.amount) : null,
    close_date: d.properties?.closedate ?? null,
    hubspot_url: portalId ? `https://app.hubspot.com/contacts/${portalId}/deal/${d.id}` : "",
  }));

  const row = {
    client_name: clientName,
    hubspot_company_id: String(companyId),
    company_name: p.name ?? null,
    domain: p.domain ?? null,
    lifecycle_stage: p.lifecyclestage ?? null,
    industry: p.industry ?? null,
    owner_name: owners.get(String(p.hubspot_owner_id ?? "")) ?? null,
    city: p.city ?? null,
    contacts,
    deals,
    last_activity_date: p.notes_last_updated ?? null,
    synced_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("client_hubspot_snapshot")
    .upsert(row, { onConflict: "client_name" });
  if (error) throw new Error(error.message);
  return row;
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
    const action = body.action as string;

    if (action === "portal") {
      return json({ portal_id: await getPortalId() });
    }

    if (action === "search") {
      const term = String(body.term ?? "").trim();
      if (!term) return json({ results: [] });
      const owners = await getOwners();
      const portalId = await getPortalId();
      const results = await Promise.all(
        (await searchCompanies(term, 8)).map((c: any) => toSuggestion(c, owners, portalId)),
      );
      return json({ results });
    }

    if (action === "link") {
      const clientName = String(body.client_name ?? "").trim();
      if (!clientName) return json({ error: "client_name required" }, 400);
      const companyId = body.hubspot_company_id ? String(body.hubspot_company_id) : null;

      const { error } = await supabase.from("client_hubspot_links").upsert({
        client_name: clientName,
        hubspot_company_id: companyId,
        match_confidence: companyId ? "manual" : "none",
        matched_by: companyId ? "manual" : "none",
        linked_at: new Date().toISOString(),
      }, { onConflict: "client_name" });
      if (error) throw new Error(error.message);

      if (!companyId) {
        await supabase.from("client_hubspot_snapshot").delete().eq("client_name", clientName);
        return json({ ok: true, linked: false });
      }

      const snapshot = await syncClient(supabase, clientName, companyId);
      return json({ ok: true, linked: true, snapshot });
    }

    if (action === "match") {
      const clients: string[] = Array.isArray(body.clients) ? body.clients : [];
      if (!clients.length) return json({ error: "clients required" }, 400);

      const owners = await getOwners();
      const portalId = await getPortalId();

      const { data: existing } = await supabase
        .from("client_hubspot_links")
        .select("client_name, matched_by");
      const decided = new Set(
        (existing ?? [])
          .filter((r: any) => r.matched_by === "manual" || r.matched_by === "none")
          .map((r: any) => r.client_name),
      );

      let autoLinked = 0;
      let needsPick = 0;

      for (const clientName of clients) {
        if (decided.has(clientName)) continue;
        let results: any[] = [];
        try {
          results = await searchCompanies(clientName, 8);
        } catch (e) {
          console.error(`search failed for ${clientName}: ${e}`);
          continue;
        }

        const suggestions = await Promise.all(
          results.map((c: any) => toSuggestion(c, owners, portalId)),
        );

        const exact = suggestions.filter((s) => norm(s.name) === norm(clientName));
        const clientTokens = tokens(clientName);
        const scored = suggestions
          .map((s) => {
            const st = new Set(tokens(s.name));
            const overlap = clientTokens.filter((t) => st.has(t)).length;
            return { s, score: clientTokens.length ? overlap / clientTokens.length : 0 };
          })
          .sort((a, b) => b.score - a.score);

        const ranked = scored.map((x) => x.s).slice(0, 5);

        if (exact.length === 1) {
          await supabase.from("client_hubspot_links").upsert({
            client_name: clientName,
            hubspot_company_id: exact[0].id,
            match_confidence: "high",
            matched_by: "auto",
            suggestions: ranked,
            linked_at: new Date().toISOString(),
          }, { onConflict: "client_name" });
          autoLinked++;
          try {
            await syncClient(supabase, clientName, exact[0].id);
          } catch (e) {
            console.error(`sync failed for ${clientName}: ${e}`);
          }
        } else {
          await supabase.from("client_hubspot_links").upsert({
            client_name: clientName,
            hubspot_company_id: null,
            match_confidence: ranked.length ? "ambiguous" : "none_found",
            matched_by: "auto",
            suggestions: ranked,
            linked_at: null,
          }, { onConflict: "client_name" });
          needsPick++;
        }
      }

      return json({ ok: true, auto_linked: autoLinked, needs_pick: needsPick });
    }

    if (action === "sync") {
      const clientName = body.client_name ? String(body.client_name) : null;
      let query = supabase
        .from("client_hubspot_links")
        .select("client_name, hubspot_company_id")
        .not("hubspot_company_id", "is", null);
      if (clientName) query = query.eq("client_name", clientName);
      const { data: links, error } = await query;
      if (error) throw new Error(error.message);

      let synced = 0;
      for (const l of links ?? []) {
        try {
          await syncClient(supabase, l.client_name, l.hubspot_company_id as string);
          synced++;
        } catch (e) {
          console.error(`sync failed for ${l.client_name}: ${e}`);
        }
      }
      return json({ ok: true, synced });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("hubspot-clients error:", message);
    return json({ error: message }, 500);
  }
});
