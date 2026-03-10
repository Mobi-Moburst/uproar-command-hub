/**
 * Field-mapping helpers that normalise Airtable field names into
 * the app's TypeScript interfaces.
 *
 * When you connect Airtable, adjust the left-hand keys in each mapper
 * to match the exact field names in your base.
 */

import type { MediaPlacement, AwardSubmission } from "@/data/types";
import type { AirtableRecord } from "./airtable";

// ── Media Placements ───────────────────────────────────────────────────────────

/** Maps raw Airtable Clips record → MediaPlacement */
export function mapPlacement(record: AirtableRecord): MediaPlacement {
  const f = record.fields as Record<string, any>;
  return {
    id: record.id,
    date: String(f["Date"] ?? f["date"] ?? ""),
    client_name: String(f["Client"] ?? f["client"] ?? ""),
    team_name: String(f["Team"] ?? f["team"] ?? ""),
    outlet: String(f["Outlet"] ?? f["outlet"] ?? ""),
    reporter_name: String(f["Reporter Name"] ?? f["reporter_name"] ?? ""),
    headline: String(f["Headline"] ?? f["headline"] ?? ""),
    link: String(f["Link"] ?? f["link"] ?? ""),
    type: (f["Type"] ?? f["type"] ?? "Online") as MediaPlacement["type"],
    vertical: String(f["Vertical"] ?? f["vertical"] ?? ""),
    readership_viewership: Number(f["Readership / Viewership"] ?? f["readership_viewership"] ?? 0),
    ad_value: Number(f["Ad Value"] ?? f["ad_value"] ?? 0),
    secured_by: String(f["Secured By"] ?? f["secured_by"] ?? ""),
    topic_product: String(f["Topic / Product"] ?? f["topic_product"] ?? ""),
    notes: String(f["Notes"] ?? f["notes"] ?? ""),
    weekly_wins_trigger: Boolean(f["Weekly Wins Trigger"] ?? f["weekly_wins_trigger"] ?? false),
  };
}

// ── Awards Submissions ─────────────────────────────────────────────────────────

/** Maps raw Airtable Submissions record → AwardSubmission */
export function mapAward(record: AirtableRecord): AwardSubmission {
  const f = record.fields as Record<string, any>;
  return {
    id: record.id,
    client_name: String(f["Client"] ?? f["client"] ?? ""),
    award_name: String(f["Award"] ?? f["award"] ?? ""),
    award_edition: String(f["Award Edition"] ?? f["award_edition"] ?? ""),
    status: (f["Status"] ?? f["status"] ?? "Drafting") as AwardSubmission["status"],
    team_name: String(f["Team"] ?? f["team"] ?? ""),
    submission_title: String(f["Submission"] ?? f["submission"] ?? ""),
    due_date: String(f["Due Date"] ?? f["due_date"] ?? ""),
    submitted_date: f["Submitted Date"] ?? f["submitted_date"] ?? null,
    result: f["Result"] ?? f["result"] ?? null,
    notes: String(f["Notes"] ?? f["notes"] ?? ""),
  };
}
