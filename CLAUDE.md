# jobradar-web

A simple web UI for jobradar (`../jobradar`): browse matched jobs and track applications
through its REST API (`/api/v1/...`).

## Commands
<none yet: stack decided in jobradar ADR 0012>

## Layout
- `README.md`, `CHANGELOG.md`

## Conventions
- The design lives in `../jobradar/docs/adr/` (cross-service ADRs); no code before its
  ADR is approved.
- Talks only to the jobradar backend, localhost only; it has no auth, so never expose this UI
  beyond 127.0.0.1.
- Candidate data is personal: never log it, never send it anywhere but the backend.
