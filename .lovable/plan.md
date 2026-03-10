

# Airtable-Ready Data Layer Refactor

## What Changes

### 1. New service layer (`src/services/`)

- **`airtable.ts`** — Core Airtable client with placeholder config (API key, base IDs, table names). Includes a generic `fetchTable()` helper with comments showing exactly where credentials go. Falls back to mock data when no API key is configured.
- **`mappers.ts`** — Field-mapping functions that normalize Airtable's field names (e.g., `"Readership / Viewership"` → `readership_viewership`) into the app's TypeScript interfaces. One mapper per entity.
- **`placementsService.ts`** — `getPlacements()`, `getWeeklyWins()` using react-query keys
- **`awardsService.ts`** — `getAwards()`
- **`clientsService.ts`** — `getClients()` (derived/aggregated from placements + awards data, or direct if a Clients table exists)
- **`teamsService.ts`** — `getTeamSummary()` (aggregated from placements + awards)

Each service exports an async function that either fetches from Airtable or returns mock data.

### 2. React Query hooks (`src/hooks/`)

- **`useClients.ts`** — wraps `getClients()` in `useQuery`
- **`usePlacements.ts`** — wraps `getPlacements()` and `getWeeklyWins()`
- **`useAwards.ts`** — wraps `getAwards()`
- **`useTeams.ts`** — wraps `getTeamSummary()`

Each hook returns `{ data, isLoading, isError }`.

### 3. Loading & error UI components

- **`TableSkeleton`** — animated skeleton rows matching the table layout
- **`KpiCardSkeleton`** — skeleton version of KpiCard
- **`ErrorState`** — simple error message with retry button
- Existing `EmptyState` already exists and will be used for no-data scenarios

### 4. Update all 6 pages

Replace direct `import { clients, placements, awards, teams } from "@/data/mockData"` with the new hooks. Add conditional rendering for loading/error/empty states. Filter logic and UI structure stay identical.

### 5. Keep mock data

`src/data/mockData.ts` stays as-is — the services import it as the fallback data source.

## File Summary

| Action | Path |
|--------|------|
| Create | `src/services/airtable.ts` |
| Create | `src/services/mappers.ts` |
| Create | `src/services/placementsService.ts` |
| Create | `src/services/awardsService.ts` |
| Create | `src/services/clientsService.ts` |
| Create | `src/services/teamsService.ts` |
| Create | `src/hooks/useClients.ts` |
| Create | `src/hooks/usePlacements.ts` |
| Create | `src/hooks/useAwards.ts` |
| Create | `src/hooks/useTeams.ts` |
| Create | `src/components/TableSkeleton.tsx` |
| Create | `src/components/KpiCardSkeleton.tsx` |
| Create | `src/components/ErrorState.tsx` |
| Edit | `src/pages/OverviewPage.tsx` |
| Edit | `src/pages/ClientsPage.tsx` |
| Edit | `src/pages/PlacementsPage.tsx` |
| Edit | `src/pages/AwardsPage.tsx` |
| Edit | `src/pages/WeeklyWinsPage.tsx` |
| Edit | `src/pages/TeamsPage.tsx` |

No changes to routing, navigation, design system, or existing component APIs. The mock data continues to power the app until Airtable credentials are configured.

