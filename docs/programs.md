# Programs administration

## Scope

Programs are the Admin WebApp representation of FastAPI `Show` + `Schedule` resources nested under a Station.

The Admin does not own a second program data model and never writes directly to Firestore.

```text
Programs UI
  -> Firebase Auth + App Check
  -> PUT /api/v1/admin/stations/{station_id}
  -> Draft revision
  -> Preview / Publish
  -> Immutable Release
  -> Mobile GET /api/v1/stations/{station_id}/shows
     + GET /api/v1/stations/{station_id}/schedule
```

## Why Station is the write aggregate

A program and its schedule must remain consistent. Saving a Show and then saving Schedule entries through multiple independent requests can leave a partially updated Draft if a later request fails.

The Programs feature therefore treats Station as the editorial aggregate for this workflow:

1. Read the current Draft and its ETag.
2. Build the complete next Station value in memory.
3. Validate program fields and active schedule overlap locally for fast feedback.
4. Send one `PUT /api/v1/admin/stations/{station_id}` with the current `If-Match` value.
5. Replace the React Query Draft cache with the returned Draft and ETag.
6. On `409 Conflict`, stop and require an explicit reload/reconciliation.

FastAPI remains authoritative and revalidates all Station invariants.

## Security boundaries

- Firebase Auth proves operator identity.
- Firebase App Check is sent by the shared API client.
- FastAPI roles (`editor` / `admin`) remain authoritative.
- The browser never writes directly to Firestore or Cloud Storage.
- Program artwork accepts only HTTPS URLs in this first slice. Media Library integration should later replace manual URL entry without changing the Show contract.
- API errors surface `X-Request-ID` when available.
- A missing Draft ETag disables writes.
- Concurrency conflicts are never auto-overwritten.

## Data contract

Program fields currently exposed by FastAPI:

- `id`
- `slug`
- `name`
- `description`
- `hostName`
- `imageUrl`
- `isActive`

Schedule fields:

- `id`
- `showId`
- `weekday` (`0 = Monday`, `6 = Sunday`)
- `startsAt`
- `endsAt`
- `isActive`

Schedules use the Station IANA timezone and support overnight ranges.

## UX behavior

The Programs workspace includes:

- station selector;
- active and scheduled program metrics;
- search by program name, host, or slug;
- active/inactive filtering;
- visual program cards;
- program metadata editor;
- arbitrary weekly schedule rows;
- mobile-style preview;
- create, update, and delete operations against Draft only.

Deleting a program also removes all schedule entries referencing it in the same Station mutation.

## Testing

Pure model tests cover:

- upsert of program + schedule;
- cascading schedule removal;
- active schedule overlap rejection;
- overnight schedule acceptance;
- HTTPS artwork validation;
- safe defaults for new programs.

CI remains responsible for generated OpenAPI contract, TypeScript typecheck, ESLint, Vitest, and production build.
