import { listJobs, el, ago, ring, bandTag, sourceLinks } from "./api.js";

const form = document.getElementById("filters");
const list = document.getElementById("jobs");
const more = document.getElementById("more");
const error = document.getElementById("error");
const empty = document.getElementById("empty");
const count = document.getElementById("count");
let cursor = null;

// Filters live in the page URL, so reload and back keep them.
function fillForm(params) {
  for (const input of form.elements) {
    if (!input.name) continue;
    if (input.type === "checkbox") {
      if (params.has("band")) input.checked = params.getAll("band").includes(input.value);
    } else if (params.has(input.name)) {
      input.value = params.get(input.name);
    }
  }
}

function formParams() {
  const params = new URLSearchParams();
  for (const [k, v] of new FormData(form)) if (v !== "") params.append(k, v);
  return params;
}

const REMOTE_LABEL = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site", unknown: "Remote: unknown" };

function card(job) {
  const m = job.match;
  // "Remote: Germany, Poland" next to a "Remote" tag says it twice: keep the places.
  const where = (job.location_text || "").replace(/^Remote:\s*/i, "");
  return el("article", { class: "card" },
    ring(m),
    el("div", {},
      el("a", { class: "card-title", href: `job.html?id=${job.id}` }, job.title),
      el("div", { class: "card-company" }, job.company_name),
      el("div", { class: "meta" },
        m ? bandTag(m.band) : null,
        el("span", { class: `tag${job.remote_policy === "unknown" ? " warn" : ""}` }, REMOTE_LABEL[job.remote_policy] ?? job.remote_policy),
        where ? el("span", { class: "tag", title: where }, where) : null,
        job.posted_at ? el("span", { class: "tag" }, ago(job.posted_at)) : null,
        m?.stale ? el("span", { class: "tag warn", title: "scored by an older model or profile" }, "stale") : null)),
    el("div", { class: "card-side" },
      el("span", { class: `status-pill s-${job.application.status}` }, job.application.status),
      ...sourceLinks(job.sources.slice(0, 1), { small: true })));
}

function skeletons(n) {
  return Array.from({ length: n }, () => el("div", { class: "skeleton", "aria-hidden": "true" }));
}

async function load(params, append) {
  error.hidden = true;
  if (cursor && append) params.set("cursor", cursor);
  if (!append) list.replaceChildren(...skeletons(5));
  more.disabled = true;
  try {
    const page = await listJobs(params);
    if (!append) list.replaceChildren();
    list.append(...page.jobs.map(card));
    cursor = page.next_cursor || null;
    more.hidden = !cursor;
    empty.hidden = list.children.length > 0;
    count.textContent = `${list.children.length}${cursor ? "+" : ""} jobs`;
  } catch (e) {
    if (!append) list.replaceChildren();
    error.textContent = e.message;
    error.hidden = false;
  } finally {
    more.disabled = false;
  }
}

function search() {
  const params = formParams();
  history.pushState(null, "", `?${params}`);
  cursor = null;
  load(params, false);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  search();
});
// Chips and selects apply at once; the text box waits for Enter or the button.
form.addEventListener("change", (e) => {
  if (e.target.name !== "q" && e.target.name !== "min_score") search();
});
more.addEventListener("click", () => load(formParams(), true));
addEventListener("popstate", () => location.reload());

fillForm(new URLSearchParams(location.search));
load(formParams(), false);
