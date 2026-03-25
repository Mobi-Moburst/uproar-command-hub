

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

