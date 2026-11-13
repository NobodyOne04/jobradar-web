# jobradar-web

A simple web UI for jobradar: browse matched jobs and track applications
([jobradar ADR 0012](https://github.com/NobodyOne04/jobradar/blob/main/docs/adr/0012-web-ui.adr)).

## Run it

Clone it next to `jobradar`; its `docker compose up -d --build` builds and starts this UI too
(service `web`). Then open http://localhost:3000.

- **Jobs**: search and filter open jobs, best match first; "More" loads the next page.
  Filters stay in the URL.
- **Job**: description, why it matched, skills, sources, your application history, and
  buttons to set its status. Moving back (e.g. `applied` → `saved`) needs "force".

Without compose: `docker build -t jobradar-web:local . && docker run --rm --network
jobradar_default -p 127.0.0.1:3000:80 jobradar-web:local` (the backend must be up).
