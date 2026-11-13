import { getJob, setStatus, el, date, sourceLinks } from "./api.js";

const STATUSES = ["saved", "applied", "interview", "offer", "rejected", "archived"];
const id = new URLSearchParams(location.search).get("id");
const article = document.getElementById("job");
const error = document.getElementById("error");

function showError(message) {
  error.textContent = message;
  error.hidden = !message;
}

function list(title, items) {
  if (!items?.length) return null;
  return el("section", {}, el("h3", {}, title), el("ul", {}, ...items.map((t) => el("li", {}, t))));
}

function skillName(s) {
  return s.via ? `${s.name} (you have ${s.via})` : s.name;
}

function matchSection(m) {
  if (!m) return el("section", {}, el("h2", {}, "Match"), el("p", {}, "Not scored yet."));
  return el("section", {},
    el("h2", {}, "Match: ", el("span", { class: `band-${m.band}` }, `${m.score} ${m.band}`),
      m.stale ? " (stale)" : ""),
    el("p", { class: "muted" },
      `confidence ${m.confidence}, completeness ${Math.round(m.completeness * 100)}%, ` +
      `hard constraints ${m.hard_constraints}, model ${m.model_version}`),
    list("Why", m.explanations),
    list("Missing skills", m.skills?.missing?.map(skillName)),
    list("Transferable skills", m.skills?.transferable?.map(skillName)),
    list("Matched skills", m.skills?.matched?.map(skillName)));
}

function applicationSection(job) {
  const app = job.application;
  const note = el("input", { type: "text", placeholder: "note (optional)", maxlength: "5000" });
  const force = el("input", { type: "checkbox" });
  const buttons = STATUSES.map((s) => {
    const b = el("button", { type: "button" }, s);
    if (s === app.status) b.disabled = true;
    b.addEventListener("click", async () => {
      showError("");
      const body = { status: s };
      if (note.value) body.note = note.value;
      if (force.checked) body.force = true;
      try {
        await setStatus(job.id, body);
        await render();
      } catch (e) {
        // 409: a backward move needs force (jobradar ADR 0008).
        showError(e.status === 409 ? `${e.message}. Tick "force" to move back.` : e.message);
      }
    });
    return b;
  });
  const events = app.events.map((ev) =>
    `${date(ev.occurred_at)}: ${ev.from_status ?? "discovered"} → ${ev.to_status}` +
    (ev.forced ? " (forced)" : "") + (ev.note ? ` — ${ev.note}` : ""));
  return el("section", {},
    el("h2", {}, `Application: ${app.status}`),
    el("div", { class: "actions" }, ...buttons),
    el("div", { class: "actions" }, note, el("label", {}, force, " force")),
    list("History", events));
}

async function render() {
  if (!id) return showError("No job id in the URL.");
  try {
    const job = await getJob(id);
    document.title = `${job.title} · jobradar`;
    article.replaceChildren(
      el("h1", {}, job.title),
      el("p", {}, job.company_name, " · ", job.remote_policy, " · ", job.location_text),
      el("p", { class: "muted" },
        `posted ${date(job.posted_at)}`, job.closed_at ? ` · closed ${date(job.closed_at)}` : ""),
      el("p", {}, ...sourceLinks(job.sources)),
      applicationSection(job),
      matchSection(job.match),
      el("section", {}, el("h2", {}, "Description"),
        el("div", { class: "description" }, job.description_text)));
  } catch (e) {
    showError(e.message);
  }
}

render();
