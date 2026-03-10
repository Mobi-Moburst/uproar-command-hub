

## Problem

Awards have a `Client` field containing linked record IDs (e.g. `recXXX`), not names. The current mapper tries to parse names from `Unique Key`/`Submission` strings, which is fragile and failing — resulting in empty `client_name` on awards, so zero awards show up for any client.

The awards base has a dedicated **Clients table** (`tblmucN4TFZ8EmxB4`) that maps those record IDs to actual client names.

## Approach

Fetch that Clients lookup table from the awards base, build a `recordId → name` map, and use it to resolve client names when mapping award records.

### Changes

**1. `src/services/airtable.ts`** — Add the new table ID:
```ts
export const TABLE_IDS = {
  placements: "tblsFhq3a6NPalO5N",
  awards: "tblyqY5sA6j41GqYY",
  awardsClients: "tblmucN4TFZ8EmxB4",
};
```

**2. `src/services/awardsService.ts`** — Fetch the Clients table in parallel with Submissions, build a lookup map, and pass it to the mapper:
```ts
const [submissions, clientRecords] = await Promise.all([
  fetchTable("awards", TABLE_IDS.awards),
  fetchTable("awards", TABLE_IDS.awardsClients),
]);
const clientLookup = new Map(
  clientRecords.map(r => [r.id, first(r.fields["Name"])])
);
return submissions.map(r => mapAward(r, clientLookup));
```

**3. `src/services/mappers.ts`** — Update `mapAward` to accept an optional `clientLookup` map and use it as the primary resolution for the `Client` linked record field:
```ts
export function mapAward(
  record: AirtableRecord,
  clientLookup?: Map<string, string>
): AwardSubmission {
  // First try: resolve linked record ID via lookup table
  const clientRecId = first(f["Client"]);
  let clientName = clientLookup?.get(clientRecId) || "";
  // Then existing fallbacks...
}
```

**4. `src/services/clientsService.ts`** — No structural changes needed. The logic already builds the client list from placements first, then enriches with awards. Once `client_name` is correctly resolved on awards, the matching in the enrichment loop (`clientMap.get(name)`) will work — awards will correctly increment counts for placement-derived clients.

### Data flow after fix

```text
Placements table → client names → clientMap (primary source of clients)
Awards Clients table → { recId: "A. Duie Pyle", ... } (lookup)
Awards Submissions table → Client: ["recXXX"] → lookup → "A. Duie Pyle"
clientsService → match award client_name to clientMap → increment award counts
```

