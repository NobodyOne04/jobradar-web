# jobradar-web

A simple web UI for jobradar (`../jobradar`): browse matched jobs and track applications
through its REST API (`/api/v1/...`). Design: jobradar ADR 0012.

## Commands
```sh
docker build -t jobradar-web:local .     # nginx image with the static files
cd ../jobradar && docker compose up -d --build web   # run it with the stack: http://localhost:3000
```
No build step, no npm, no tests (ADR 0012): check changes in a browser against the stack.

## Layout
- `public/`: the site, served as is. `index.html` + `jobs.js` (job list, filters in the URL,
  keyset "More"), `job.html` + `job.js` (one job, status buttons), `api.js` (fetch wrappers,
  `el()` DOM builder, source links), `style.css`
- `nginx.conf`: serves `public/`, proxies `/api/v1/` to `backend:8080` keeping the Host, sets
  CSP and other headers; `Dockerfile`: `nginx:1.29-alpine` + both

## Conventions
- Same origin only: the backend refuses a foreign `Origin` or Host (`withLocalOnly`). Keep
  `proxy_set_header Host $http_host`; never add CORS.
- Job text comes from external boards: build DOM with `el()` (textContent), never
  `innerHTML`; links only for `http(s)` URLs. CSP `default-src 'self'`: no inline scripts or
  styles, no third-party assets.
- Board credits: `sourceLinks` shows each source's `attribution` ("via Himalayas", "via Remote OK"...)
  next to its link; the footer's "Powered by Dev Global Jobs" link stays on every page (its
  license); links stay followed (no `nofollow`: Remote OK). Export nothing.
- Personal data (searches, notes, profile results): no access log for `/api/`, no analytics,
  no `console.log` of responses.
- Plain ES modules; a build step or dependency needs a new ADR in `../jobradar/docs/adr/`.
- Field names follow jobradar's API (ADR 0011, 0008); check `../jobradar/internal/api/` when
  they change.
