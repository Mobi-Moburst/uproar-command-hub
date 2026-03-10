/**
 * Field-mapping helpers that normalise Airtable field names into
 * the app's TypeScript interfaces.
 */

import type { MediaPlacement, AwardSubmission } from "@/data/types";
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
    outlet: first(f["Outlet"] ?? f["outlet"]),
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
export function mapAward(record: AirtableRecord): AwardSubmission {
  const f = record.fields as Record<string, any>;

  // Client, Award, Award Edition are linked record IDs — try lookup fields first
  let clientName = first(f["Client Name (from Client)"] ?? f["Client Name"]);
  let awardName = first(f["Award Name (from Award)"] ?? f["Award Name"]);
  let awardEdition = first(f["Award Edition Name (from Award Edition)"] ?? f["Edition Name"]);

  // Fallback: parse from "Unique Key" or "Submission" field (format: "Client × Award — Edition")
  if (!clientName || clientName.startsWith("rec")) {
    const uniqueKey = first(f["Unique Key"] ?? f["Submission"]);
    if (uniqueKey) {
      const parts = uniqueKey.split("×").map((s: string) => s.trim());
      if (parts.length >= 1 && !parts[0].startsWith("rec")) clientName = parts[0];
      if (parts.length >= 2) {
        const rest = parts.slice(1).join("×");
        const dashParts = rest.split("—").map((s: string) => s.trim());
        if (!awardName || awardName.startsWith("rec")) awardName = dashParts[0] || "";
        if (dashParts.length >= 2 && (!awardEdition || awardEdition.startsWith("rec"))) awardEdition = dashParts[1] || "";
      }
    }
  }

  // Last resort: if still rec IDs, just show the raw linked field
  if (clientName.startsWith("rec")) clientName = first(f["Client"]);
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
