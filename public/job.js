import { getJob, setStatus, el, date, ago, ring, bandTag, sourceLinks } from "./api.js";

const STATUSES = ["saved", "applied", "interview", "offer", "rejected", "archived"];
const REMOTE_LABEL = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site", unknown: "Remote: unknown" };
const id = new URLSearchParams(location.search).get("id");
const article = document.getElementById("job");
const error = document.getElementById("error");

// "← All jobs" goes back to the list with its filters when we came from it.
document.querySelector(".back").addEventListener("click", (e) => {
  if (document.referrer.startsWith(location.origin + "/") && history.length > 1) {
    e.preventDefault();
    history.back();
  }
});

function showError(message) {
  error.textContent = message;
  error.hidden = !message;
}

const panel = (title, ...children) => el("section", { class: "panel" }, el("h2", {}, title), ...children);

function skillChips(title, kind, skills) {
  if (!skills?.length) return null;
  return [
    el("h3", {}, `${title} (${skills.length})`),
    el("div", { class: "skills" }, ...skills.map((s) =>
      el("span", { class: `skill ${kind}`, title: s.via ? `you have ${s.via}` : s.requirement ?? "" },
        s.via ? `${s.name} ← ${s.via}` : s.name))),
  ];
}

function dimensions(dims) {
  if (!dims?.length) return null;
  return el("div", { class: "dims" }, ...dims.map((d) => {
    const fill = el("i");
    fill.style.setProperty("--v", d.score == null ? "0" : String(Math.round(d.score * 100)));
    return el("div", {},
      el("div", { class: "dim-head" },
        el("span", {}, d.name.replace("_", " ")),
        el("span", {}, d.score == null ? "n/a" : `${Math.round(d.score * 100)}%`, ` · weight ${Math.round(d.weight * 100)}%`)),
      el("div", { class: "bar" }, fill),
      d.evidence?.length ? el("div", { class: "dim-evidence" }, d.evidence[0]) : null);
  }));
}

function matchPanel(m) {
  if (!m) return panel("Match", el("p", { class: "dim-evidence" }, "Not scored yet: the matcher picks it up within a minute."));
  return panel("Why it matches",
    el("p", { class: "dim-evidence" },
      `Confidence ${m.confidence} · ${Math.round(m.completeness * 100)}% of the posting understood · ` +
      `hard constraints ${m.hard_constraints} · model ${m.model_version}${m.stale ? " · stale" : ""}`),
    dimensions(m.dimensions),
    m.explanations?.length ? el("h3", {}, "Summary") : null,
    m.explanations?.length ? el("ul", { class: "why" }, ...m.explanations.map((t) => el("li", {}, t))) : null,
    ...(skillChips("Missing", "missing", m.skills?.missing) ?? []),
    ...(skillChips("Transferable", "transferable", m.skills?.transferable) ?? []),
    ...(skillChips("Matched", "matched", m.skills?.matched) ?? []));
}

function applicationPanel(job) {
  const app = job.application;
  const note = el("input", { type: "text", placeholder: "Note (optional)", maxlength: "5000", "aria-label": "Note" });
  const force = el("input", { type: "checkbox" });
  const buttons = STATUSES.map((s) => {
    const b = el("button", { type: "button", class: `btn${s === app.status ? " current" : ""}` }, s);
    if (s === app.status) b.disabled = true;
    b.addEventListener("click", async () => {
      showError("");
      const body = { status: s };
      if (note.value) body.note = note.value;
      if (force.checked) body.force = true;
      for (const other of buttons) other.disabled = true;
      try {
        await setStatus(job.id, body);
        await render();
      } catch (e) {
        // 409: a backward move needs force (jobradar ADR 0008).
        showError(e.status === 409 ? `${e.message}. Tick "force" to move back.` : e.message);
        for (const other of buttons) other.disabled = other.classList.contains("current");
      }
    });
    return b;
  });
  const events = [...app.events].reverse().map((ev) =>
    el("li", {},
      el("time", { datetime: ev.occurred_at }, date(ev.occurred_at)),
      `${ev.from_status ?? "discovered"} → ${ev.to_status}`, ev.forced ? " (forced)" : "",
      ev.note ? el("div", { class: "dim-evidence" }, ev.note) : null));
  return el("section", { class: "panel" },
    el("h2", {}, "Your application", el("span", { class: `status-pill s-${app.status}` }, app.status)),
    el("div", { class: "statuses" }, ...buttons),
    el("div", { class: "note-row" }, note, el("label", { class: "force" }, force, "Force (undo a step)")),
    events.length ? el("h3", {}, "History") : null,
    events.length ? el("ol", { class: "timeline" }, ...events) : null);
}

function descriptionPanel(text) {
  const body = el("div", { class: "description" }, text || "No description from this board.");
  const toggle = el("button", { type: "button", class: "btn small", hidden: "" }, "Show all");
  toggle.addEventListener("click", () => {
    body.classList.toggle("open");
    toggle.textContent = body.classList.contains("open") ? "Show less" : "Show all";
  });
  // Only offer "Show all" when the text is actually cut off.
  requestAnimationFrame(() => {
    if (body.scrollHeight > body.clientHeight + 4) {
      body.classList.add("clipped");
      toggle.hidden = false;
    }
  });
  return panel("Description", body, toggle);
}

async function render() {
  if (!id) return showError("No job id in the URL.");
  try {
    const job = await getJob(id);
    document.title = `${job.title} · jobradar`;
    // "Remote: Germany, Poland" next to a "Remote" tag says it twice: keep the places.
    const where = (job.location_text || "").replace(/^Remote:\s*/i, "");
    article.replaceChildren(
      el("section", { class: "hero" },
        ring(job.match, true),
        el("div", {},
          el("h1", {}, job.title),
          el("div", { class: "company" }, job.company_name),
          el("div", { class: "meta" },
            job.match ? bandTag(job.match.band) : null,
            el("span", { class: `tag${job.remote_policy === "unknown" ? " warn" : ""}` }, REMOTE_LABEL[job.remote_policy] ?? job.remote_policy),
            where ? el("span", { class: "tag", title: where }, where) : null,
            job.posted_at ? el("span", { class: "tag", title: date(job.posted_at) }, `posted ${ago(job.posted_at)}`) : null,
            job.closed_at ? el("span", { class: "tag warn" }, `closed ${date(job.closed_at)}`) : null),
          el("div", { class: "apply" }, ...sourceLinks(job.sources)))),
      el("div", { class: "layout" },
        el("div", {}, matchPanel(job.match), descriptionPanel(job.description_text)),
        el("aside", { class: "sticky" }, applicationPanel(job))));
  } catch (e) {
    article.replaceChildren();
    showError(e.message);
  }
}

render();
