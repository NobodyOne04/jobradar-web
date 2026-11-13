// fetch wrappers for the jobradar API (same origin: nginx proxies /api, ADR 0012).

export class ApiError extends Error {
  constructor(problem) {
    super(problem.detail ? `${problem.title}: ${problem.detail}` : problem.title);
    this.status = problem.status;
  }
}

async function call(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({ title: res.statusText, status: res.status }));
  if (!res.ok) throw new ApiError(body); // problem+json: show its title, never more
  return body;
}

export const listJobs = (params) => call(`/api/v1/jobs?${params}`);
export const getJob = (id) => call(`/api/v1/jobs/${encodeURIComponent(id)}`);
export const setStatus = (id, body) =>
  call(`/api/v1/applications/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// el("a", {href: url}, "text", child): builds DOM with textContent only. Job text comes from
// external boards, so nothing here ever goes through innerHTML.
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "href" && !/^https?:\/\//i.test(v) && !v.startsWith("job.html")) continue;
    node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : String(c));
  }
  return node;
}

export const date = (s) => (s ? new Date(s).toLocaleDateString() : "");

// Himalayas terms: its jobs keep their link and say "via Himalayas" (jobradar §113).
export function sourceLinks(sources) {
  const seen = new Set();
  return sources
    .filter((s) => !seen.has(s.url) && seen.add(s.url))
    .map((s) =>
      el("span", { class: "source" },
        el("a", { href: s.url, target: "_blank", rel: "noopener noreferrer" }, s.kind),
        s.attribution ? ` (${s.attribution})` : "",
        s.closed ? " (closed)" : ""));
}
