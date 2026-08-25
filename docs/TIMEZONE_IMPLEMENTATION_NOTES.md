# Flight timezone implementation notes

This tranche implements the canonical model described in `docs/TIMEZONE_MODEL.md`.

- `travel_bookings` remains the source of truth.
- Existing `start_at` / `end_at` remain endpoint-local datetimes for UI/calendar placement.
- `departure_timezone` / `arrival_timezone` store IANA timezone IDs.
- `departure_utc_at` / `arrival_utc_at` store the corresponding absolute instants used for elapsed duration and audit.
- `agenda_items` remain derived projections and do not duplicate the four canonical endpoint fields.
- Shared itinerary enriches synced agenda rows from the matching booking ID at read time.
- Airport timezone resolution is deterministic only. Unresolved airports require user confirmation; no fixed-offset or country-wide guess is allowed for ambiguous multi-timezone cases.
- Migration `0024_flight_endpoint_timezones.sql` is additive. The legacy `travel_bookings.timezone` field remains temporarily for compatibility and receives departure timezone for new flights.

Deployment blocker: a runtime containing this tranche must not be published against a D1 database that has not applied migration 0024; missing `departure_timezone` / `arrival_timezone` columns are a release stop condition.
