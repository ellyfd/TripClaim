# TripClaim legacy and hard-coded rule inventory

This inventory distinguishes immutable company master data from transitional implementation shortcuts. Company claim items, reporting currencies, countries, cities, and airports are intentionally fixed and must not be made editable.

## P0 — resolved before multi-user production

| Area | Current source | Risk | Target |
| --- | --- | --- | --- |
| Login-user administration | Resolved: roles are server-owned and returned by `/api/me` | The server-owned list gates every authenticated API; Header only shows management to administrators | Keep role changes authenticated, audited and protected against removing the final administrator |

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

1. Re-run Golden Dataset, privacy, export, role-visibility, and device-matrix tests before release.
