

# Plan: Store Future Ideas + Create Recommendations Document

## Overview

Two deliverables:
1. Update `.lovable/plan.md` with the two future feature ideas (HubSpot integration and client enrichment table)
2. Generate a polished `.docx` recommendations document for sharing with the team

## What goes in the document

**"Uproar Command Hub — Platform Roadmap Recommendations"**

Three sections:

### 1. HubSpot CRM Integration
- Connect Clients to HubSpot Companies (deal stage, revenue, activity history)
- Connect Reporters to HubSpot Contacts (engagement history, email opens, relationship context)
- Matching strategy (name-based or explicit HubSpot IDs)
- What it unlocks: CRM context alongside media performance data

### 2. Client Enrichment Table
- New persistent database table storing client context beyond what Airtable provides
- Fields: description/boilerplate, key products, target verticals, messaging priorities, pitch angles, industry tags
- Editable from within the client detail panel
- Foundation for AI-powered features

### 3. AI-Powered Pitch Intelligence (enabled by #2)
- Smart pitch generation: combine client messaging pillars with reporter beat history
- Reporter matching: cross-reference client focus areas with samples/briefings/placement history to recommend best reporters
- Narrative reporting: auto-generate executive summaries tailored to client goals
- Requires the enrichment table as a prerequisite

Each section will include: what it is, why it matters, what data it needs, and open questions for team feedback.

## Technical steps

1. **Update `.lovable/plan.md`** — append a "Future Ideas" section documenting both concepts
2. **Generate `.docx`** using `docx-js` with professional styling, written in a team-friendly tone (not technical), saved to `/mnt/documents/uproar_platform_recommendations.docx`

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


