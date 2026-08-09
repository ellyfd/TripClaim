# TripClaim legacy and hard-coded rule inventory

This inventory distinguishes immutable company master data from transitional implementation shortcuts. Company claim items, reporting currencies, countries, cities, and airports are intentionally fixed and must not be made editable.

## P0 — replace before multi-user production

| Area | Current source | Risk | Target |
| --- | --- | --- | --- |
| Login-user administration | `SystemManagement.tsx` stores the user list and roles in `localStorage` | Device-local state is neither authoritative nor shared and cannot enforce API authorization | Server-owned membership/role table, authenticated admin mutations, audit log |

## P1 — remove after route migration

| Area | Current source | Risk | Target |
| --- | --- | --- | --- |
| Active-trip navigation | Resolved: `trip` and `stage` are canonical URL query parameters | Direct links, browser Back/Forward, and multiple tabs now retain their own trip context | Keep component data requests scoped to the URL-selected trip |
| Legacy personal-travel endpoint | Resolved: the fixed `france-poland-2026` endpoint and unused prototype were removed | No production request can silently fall back to the old demonstration trip | Continue using `/api/trips/:id/*` routes only |

## Intentional fixed master data — do not replace with free text

| Master | Authoritative source | Rule |
| --- | --- | --- |
| Claim items and codes | `app/managed-config.ts` | Fixed company order; no add/edit/delete |
| Reporting currencies | `app/managed-config.ts` | Fixed allowlist; unsupported originals are retained and reported in TWD |
| Countries and cities | `app/managed-config.ts` | Fixed company system values; country drives city selection |
| Airports and aliases | `db/managed-airports.json` | Managed IATA/name/alias matching; no ad-hoc airport becomes formal data |

## Test-only duplication

The Golden Dataset and performance tests repeat a small set of labels only to detect accidental changes to immutable order and grouping behavior. They do not feed production records.

## Removal order

1. Add server-owned users and roles with authorization and audit.
2. Re-run Golden Dataset, privacy, export, and device-matrix tests before release.
