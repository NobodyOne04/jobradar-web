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

// ago("2026-11-10T...") -> "4d ago": recency matters more than the exact date in a list.
export function ago(s) {
  if (!s) return "";
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const BAND_COLOR = { strong: "--strong", good: "--good", weak: "--weak", excluded: "--excluded" };

// ring(match, big): a conic-gradient score ring. Custom properties are set through the CSSOM,
// which the CSP (no inline style attributes) allows.
export function ring(match, big = false) {
  if (!match) {
    return el("div", { class: `ring pending${big ? " big" : ""}`, role: "img", "aria-label": "not scored yet" },
      el("b", {}, "pending"));
  }
  const node = el("div", { class: `ring${big ? " big" : ""}`, role: "img",
    "aria-label": `score ${match.score}, ${match.band}` }, el("b", {}, match.score));
  node.style.setProperty("--score", String(match.score));
  node.style.setProperty("--c", `var(${BAND_COLOR[match.band] ?? "--muted"})`);
  return node;
}

export const bandTag = (band) => el("span", { class: `tag band c-${band}` }, band);

// places(location_text, limit): one chip per place. Adapters join places with "; " and a long
// country list with ", "; a "(UTC-5 to UTC+3)" range gets its own chip. "San Francisco, CA"
// stays whole: a segment is split on commas only when it is a list (3+ commas).
export function places(text, limit = Infinity) {
  let rest = (text || "").replace(/^Remote:\s*/i, "").trim();
  const zone = rest.match(/\((UTC[^)]*)\)\s*$/);
  if (zone) rest = rest.slice(0, zone.index).trim();
  const items = rest.split(";").flatMap((seg) => {
    seg = seg.trim().replace(/^remote(,\s*|$)/i, ""); // the remote tag already says it
    return (seg.match(/,/g) ?? []).length >= 3 ? seg.split(",") : [seg];
  }).map((p) => p.trim()).filter(Boolean);
  const chips = items.slice(0, limit).map((p) => el("span", { class: "tag place", title: p }, p));
  if (items.length > limit) {
    const hidden = items.slice(limit);
    chips.push(el("span", { class: "tag more", title: hidden.join(", ") }, `+${hidden.length} more`));
  }
  if (zone) chips.push(el("span", { class: "tag zone" }, zone[1]));
  return chips;
}

// Board credits (Himalayas §113, ADR 0013): every link keeps its board's attribution next to
// it. Dev Global Jobs' license asks for a visible "Powered by Dev Global Jobs" link to its
// site wherever its jobs are shown: it sits under the link of each of its jobs.
const CREDIT_LINK = { devglobaljobs: ["Powered by Dev Global Jobs", "https://devglobaljobs.com"] };

export function sourceLinks(sources, { small = false } = {}) {
  const seen = new Set();
  return sources
    .filter((s) => !seen.has(s.url) && seen.add(s.url))
    .map((s, i) => {
      const credit = CREDIT_LINK[s.kind];
      return el("span", { class: "source" },
        el("a", {
          href: s.url, target: "_blank", rel: "noopener noreferrer",
          class: `btn${small ? " small" : ""}${i === 0 && !s.closed ? " primary" : ""}`,
        }, `apply on ${s.kind} ↗`),
        credit
          ? el("a", { class: "attribution", href: credit[1], target: "_blank", rel: "noopener" }, credit[0])
          : s.attribution ? el("span", { class: "attribution" }, s.attribution) : null,
        s.closed ? el("span", { class: "attribution" }, "closed") : null);
    });
}
