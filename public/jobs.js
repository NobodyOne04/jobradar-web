import { listJobs, el, date, sourceLinks } from "./api.js";

const form = document.getElementById("filters");
const tbody = document.getElementById("jobs");
const more = document.getElementById("more");
const error = document.getElementById("error");
const empty = document.getElementById("empty");
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

function row(job) {
  const m = job.match;
  return el("tr", {},
    el("td", { class: m ? `band-${m.band}` : "" }, m ? m.score : "–", m?.stale ? " (stale)" : ""),
    el("td", {}, el("a", { href: `job.html?id=${job.id}` }, job.title)),
    el("td", {}, job.company_name),
    el("td", {}, job.remote_policy),
    el("td", {}, date(job.posted_at)),
    el("td", {}, job.application.status),
    el("td", {}, ...sourceLinks(job.sources)));
}

async function load(params, append) {
  error.hidden = true;
  if (cursor && append) params.set("cursor", cursor);
  try {
    const page = await listJobs(params);
    if (!append) tbody.replaceChildren();
    tbody.append(...page.jobs.map(row));
    cursor = page.next_cursor || null;
    more.hidden = !cursor;
    empty.hidden = tbody.children.length > 0;
  } catch (e) {
    error.textContent = e.message;
    error.hidden = false;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const params = formParams();
  history.pushState(null, "", `?${params}`);
  cursor = null;
  load(params, false);
});
more.addEventListener("click", () => load(formParams(), true));
addEventListener("popstate", () => location.reload());

const initial = new URLSearchParams(location.search);
fillForm(initial);
load(formParams(), false);
