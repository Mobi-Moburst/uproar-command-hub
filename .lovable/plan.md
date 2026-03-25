

# Integrating Samples and Briefings Tables

## Data Review

### Samples (~1,000 records)
**Fields:** Date Requested, Team, Client, Products, Outlet, Reporter Name, Address, Phone Number, Date Shipped, Tracking Number, Delivery Date, Status, Publication Date, Coverage Link, Notes

**Key observations:**
- Status values include: "Sample delivered, pending coverage", "Coverage live", "Fell through", and blank
- Many records have no Date Requested (sparse dates)
- Address and Phone Number are PII — should NOT be surfaced in the dashboard
- Coverage Link ties a sample directly to the resulting placement
- Products field is free-text and often contains multiple products in one cell

### Briefings (~295 records)
**Fields:** Date Met, Team, Client, Outlet, Reporter Name, Company Spokesperson, Uproar Point of Contact, Topic, Interview Type, Briefing Sheet, Status, Publication Date, Coverage Link, Notes

**Key observations:**
- Interview Type values: Recorded Interview, Live Interview, Written Q&A, Podcast, and blank
- Status values: "Coverage live", "Interview occurred, pending coverage", blank
- Briefing Sheet is always a Google Docs link — useful for reference but not for analytics
- Company Spokesperson and Uproar Point of Contact are unique to this table and valuable for attribution

---

## How to Connect via API

Both tables live in existing Airtable bases. The architecture is already set up — the `airtable-proxy` edge function supports any base/table combo.

### Steps required:

1. **Identify which Airtable base** these tables live in. If they're in the Placements base, the existing `AIRTABLE_BASE_PLACEMENTS` secret works. If they're in a separate base, a new secret (e.g. `AIRTABLE_BASE_SAMPLES`) would need to be added and the proxy updated to support a third base key.

2. **Add table IDs** to `TABLE_IDS` in `src/services/airtable.ts` (e.g. `samples: "tblXXXXX"`, `briefings: "tblYYYYY"`).

3. **Create TypeScript interfaces** in `src/data/types.ts` for `Sample` and `Briefing`, excluding PII fields (address, phone).

4. **Create mapper functions** in `src/services/mappers.ts` to normalize Airtable field names, similar to `mapPlacement` and `mapAward`.

5. **Create service files** (`samplesService.ts`, `briefingsService.ts`) and hooks (`useSamples.ts`, `useBriefings.ts`).

6. **Build UI pages** — a Samples page and a Briefings page with filtering by client, team, status, and date range.

---

## How to Maximize the Data

### Analytics you can derive

**Sample Conversion Rate** — the most valuable metric. For each client (or team), calculate:
- Total samples sent
- Samples that resulted in coverage ("Coverage live")
- Conversion rate = coverage / total

This directly measures ROI of product seeding efforts.

**Briefing-to-Coverage Rate** — same concept:
- Total briefings conducted
- Briefings that resulted in coverage
- Conversion rate by client, team, interview type, and topic

**Reporter Engagement Funnel** — by joining samples + briefings + placements on Reporter Name and Outlet, you can show:
- Which reporters received samples AND briefings AND produced coverage
- Which reporters received outreach but never converted
- Average time from sample/briefing to publication

**Client-Level Enrichment** — the Clients page can be enhanced with:
- Total samples sent per client
- Total briefings conducted per client
- Sample and briefing conversion rates as KPI cards on the client detail panel

**Team Performance** — the Teams page can add:
- Samples sent and briefing count per team
- Conversion rates by team to compare effectiveness

**Interview Type Breakdown** — for briefings specifically:
- Which interview types (Podcast, Live, Recorded, Written Q&A) have the highest conversion rate
- Trend over time

### Recommendations for the Uproar team before connecting

1. **Standardize the Status field** in both tables. Currently there are blanks, free-text statuses, and inconsistent casing. A clean enum (e.g. "Pending", "Delivered", "Coverage Live", "Fell Through", "No Response") would make filtering and conversion tracking reliable.

2. **Always fill Date Requested / Date Met** — many Samples records have no date, which makes time-based analysis impossible.

3. **Fill Reporter Name consistently** — this is the join key to link samples/briefings back to placements and the Reporter Analytics page.

4. **Decide on the Airtable base structure** — let me know which base(s) these tables live in and the table IDs, and I can wire them up.

---

## Technical Details

### New types (src/data/types.ts)
```text
Sample {
  id, date_requested, team, client, products, outlet,
  reporter_name, date_shipped, delivery_date, status,
  publication_date, coverage_link, notes
}

Briefing {
  id, date_met, team, client, outlet, reporter_name,
  spokesperson, uproar_contact, topic, interview_type,
  briefing_sheet_url, status, publication_date,
  coverage_link, notes
}
```

### New pages
- `/samples` — table with filters (client, team, status, date range), KPI cards (total sent, conversion rate, pending)
- `/briefings` — table with filters (client, team, interview type, status, date range), KPI cards (total conducted, conversion rate, by type)

### Client detail panel additions
- "Samples" tab showing count + conversion rate
- "Briefings" tab showing count + conversion rate

### Overview page additions
- Sample conversion rate KPI card
- Briefing conversion rate KPI card

---

## Future Ideas

### 1. HubSpot CRM Integration

**Concept:** Connect the Command Hub to HubSpot to enrich client and reporter data with CRM context.

**Clients → HubSpot Companies:**
- Match clients by company name or a stored HubSpot Company ID
- Pull in deal stage, revenue, activity history, and account owner
- Surface CRM context in the client detail panel alongside media performance data

**Reporters → HubSpot Contacts:**
- Match reporters by name/email or a stored HubSpot Contact ID
- Surface engagement history (email opens, meeting activity, relationship context)
- Enrich the Reporter Analytics page with outreach history

**Implementation approach:**
- HubSpot REST API via a backend proxy function (same pattern as the Airtable proxy)
- Name-based fuzzy matching initially, with optional explicit HubSpot ID fields for reliable linking
- Read-only initially; two-way sync could come later

**What it unlocks:**
- Full-funnel visibility: CRM pipeline + media performance in one view
- Identify which reporters have existing relationships in HubSpot before outreach
- Correlate media wins with sales pipeline movement

---

### 2. Client Enrichment Table

**Concept:** Create a persistent database table to store client-specific context that doesn't exist in Airtable — things like messaging priorities, key products, target verticals, and pitch angles.

**Proposed fields:**
- `description` / boilerplate — what the company does
- `key_products` — flagship products or services
- `target_verticals` — which media verticals matter most
- `messaging_priorities` — current strategic messaging themes
- `pitch_angles` — active pitch angles the team is pushing
- `industry_tags` — for cross-client analysis

**How it works:**
- Editable directly from within the client detail panel in the Command Hub
- Sits alongside the existing Airtable-derived placement/award/sample/briefing data
- Provides the foundation for AI-powered features (see below)

---

### 3. AI-Powered Pitch Intelligence (requires #2)

**Concept:** Use the enrichment data from the client table, combined with placement history and reporter analytics, to power intelligent pitch generation and reporter matching.

**Smart pitch generation:**
- Combine client messaging pillars + recent news hooks + reporter beat history
- Generate tailored pitch drafts for specific reporter/client combinations

**Reporter matching:**
- Cross-reference client focus areas with reporter coverage history, samples sent, and briefing outcomes
- Recommend the best reporters for a given pitch angle based on historical conversion data

**Narrative reporting:**
- Auto-generate executive summaries for client reports
- Tailor the narrative to the client's specific goals and messaging themes rather than generic metrics

**Prerequisites:**
- Client enrichment table must be populated first
- Works best with clean, consistent data in samples and briefings tables


