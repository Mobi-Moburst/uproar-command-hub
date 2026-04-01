/**
 * Field-mapping helpers that normalise Airtable field names into
 * the app's TypeScript interfaces.
 */

import type { MediaPlacement, AwardSubmission, Sample, Briefing } from "@/data/types";
import type { AirtableRecord } from "./airtable";

/** Safely extract first element from array or return the value as-is */
function first(val: unknown): string {
  if (Array.isArray(val)) return String(val[0] ?? "");
  if (val == null) return "";
  return String(val);
}

function firstNum(val: unknown): number {
  if (Array.isArray(val)) return Number(val[0] ?? 0);
  return Number(val ?? 0);
}

// ── Media Placements ───────────────────────────────────────────────────────────

/** Maps raw Airtable Clips record → MediaPlacement */
export function mapPlacement(record: AirtableRecord): MediaPlacement {
  const f = record.fields as Record<string, any>;
  return {
    id: record.id,
    date: first(f["Date"] ?? f["date"]),
    client_name: first(f["Client"] ?? f["client"]),
    team_name: first(f["Team"] ?? f["team"]),
    outlet: first(f["Outlet (Linked)"] ?? f["Outlet"] ?? f["outlet"]),
    reporter_name: first(f["Reporter Name"] ?? f["reporter_name"]),
    headline: first(f["Headline"] ?? f["headline"]),
    link: first(f["Link"] ?? f["link"]),
    type: first(f["Type"] ?? f["type"]) || "Online",
    vertical: first(f["Vertical"] ?? f["vertical"]),
    readership_viewership: firstNum(f["Readership/Viewership"] ?? f["Readership / Viewership"] ?? f["readership_viewership"]),
    ad_value: firstNum(f["Ad Value"] ?? f["ad_value"] ?? f["AVE"]),
    secured_by: first(f["Secured by?"] ?? f["Secured By"] ?? f["secured_by"]),
    topic_product: first(f["Topic/Product"] ?? f["Topic / Product"] ?? f["topic_product"]),
    notes: first(f["Notes"] ?? f["notes"]),
    weekly_wins_trigger: Boolean(f["Weekly Wins"] ?? f["Weekly Wins Trigger"] ?? f["weekly_wins_trigger"] ?? false),
  };
}

// ── Awards Submissions ─────────────────────────────────────────────────────────

/** Maps raw Airtable Submissions record → AwardSubmission */
export function mapAward(
  record: AirtableRecord,
  clientLookup?: Map<string, string>,
): AwardSubmission {
  const f = record.fields as Record<string, any>;

  // 1. Resolve client name via lookup table (highest priority)
  const clientRecId = first(f["Client"]);
  let clientName = (clientLookup && clientRecId ? clientLookup.get(clientRecId) : undefined) || "";

  // 2. Fallback: lookup fields from Airtable
  if (!clientName) {
    clientName = first(f["Client Name (from Client)"] ?? f["Client Name"]);
  }

  let awardName = first(f["Award Name (from Award)"] ?? f["Award Name"]);
  let awardEdition = first(f["Award Edition Name (from Award Edition)"] ?? f["Edition Name"]);

  // 3. Fallback: parse from "Submission" or "Unique Key" field
  if (!clientName || clientName.startsWith("rec")) {
    const submission = first(f["Submission"]);
    const uniqueKey = first(f["Unique Key"]);
    const parseSource = submission || uniqueKey;
    if (parseSource) {
      const parts = parseSource.split("×").map((s: string) => s.trim());
      if (parts.length >= 1 && !parts[0].startsWith("rec")) {
        if (!clientName || clientName.startsWith("rec")) clientName = parts[0];
      }
      if (parts.length >= 2) {
        const rest = parts.slice(1).join("×");
        const dashParts = rest.split("—").map((s: string) => s.trim());
        if (!awardName || awardName.startsWith("rec")) awardName = dashParts[0] || "";
        if (dashParts.length >= 2 && (!awardEdition || awardEdition.startsWith("rec"))) awardEdition = dashParts[1] || "";
      }
    }
  }

  // Last resort: raw linked field
  if (clientName.startsWith("rec")) clientName = "";
  if (awardName.startsWith("rec")) awardName = first(f["Award"]);
  if (awardEdition.startsWith("rec")) awardEdition = first(f["Award Edition"]);

  return {
    id: record.id,
    client_name: clientName,
    award_name: awardName,
    award_edition: awardEdition,
    status: first(f["Status"] ?? f["status"]) || "Drafting",
    team_name: first(f["Team (from Client)"] ?? f["Team"] ?? f["team"]),
    submission_title: first(f["Submission"] ?? f["submission"]),
    due_date: first(f["Due Date"] ?? f["due_date"]),
    submitted_date: f["Submitted Date"] ?? f["submitted_date"] ?? null,
    result: f["Result"] ?? f["result"] ?? null,
    notes: first(f["Internal Notes"] ?? f["Notes"] ?? f["notes"]),
  };
}

// ── Samples ────────────────────────────────────────────────────────────────────

/** Maps raw Airtable Samples record → Sample (excludes PII) */
export function mapSample(record: AirtableRecord): Sample {
  const f = record.fields as Record<string, any>;
  return {
    id: record.id,
    date_requested: first(f["Date Requested"] ?? f["date_requested"]),
    team: first(f["Team"] ?? f["team"]),
    client: first(f["Client"] ?? f["client"]),
    products: first(f["Products"] ?? f["products"]),
    outlet: first(f["Outlet"] ?? f["outlet"]),
    reporter_name: first(f["Reporter Name"] ?? f["reporter_name"]),
    date_shipped: first(f["Date Shipped"] ?? f["date_shipped"]),
    delivery_date: first(f["Delivery Date"] ?? f["delivery_date"]),
    status: first(f["Status"] ?? f["status"]),
    publication_date: first(f["Publication Date"] ?? f["publication_date"]),
    coverage_link: first(f["Coverage Link"] ?? f["coverage_link"]),
    notes: first(f["Notes"] ?? f["notes"]),
  };
}

// ── Briefings ──────────────────────────────────────────────────────────────────

/** Maps raw Airtable Briefings record → Briefing */
export function mapBriefing(record: AirtableRecord): Briefing {
  const f = record.fields as Record<string, any>;
  return {
    id: record.id,
    date_met: first(f["Date Met"] ?? f["date_met"]),
    team: first(f["Team"] ?? f["team"]),
    client: first(f["Client"] ?? f["client"]),
    outlet: first(f["Outlet"] ?? f["outlet"]),
    reporter_name: first(f["Reporter Name"] ?? f["reporter_name"]),
    spokesperson: first(f["Company Spokesperson"] ?? f["spokesperson"]),
    uproar_contact: first(f["Uproar Point of Contact"] ?? f["uproar_contact"]),
    topic: first(f["Topic"] ?? f["topic"]),
    interview_type: first(f["Interview Type"] ?? f["interview_type"]),
    briefing_sheet_url: first(f["Briefing Sheet"] ?? f["briefing_sheet_url"]),
    status: first(f["Status"] ?? f["status"]),
    publication_date: first(f["Publication Date"] ?? f["publication_date"]),
    coverage_link: first(f["Coverage Link"] ?? f["coverage_link"]),
    notes: first(f["Notes"] ?? f["notes"]),
  };
}
