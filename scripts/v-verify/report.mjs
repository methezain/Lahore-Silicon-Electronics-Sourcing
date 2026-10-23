import { readFileSync, writeFileSync } from "node:fs";
import { loadResults } from "./harness.mjs";

const target = "docs/reports/v-verify.md";
const results = loadResults();
const order = ["N1", "N2", "N3", "A1", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "K1", "K2", "K3", "K4", "K5", "S1", "S2", "S3", "H1", "H2", "H3"];
const cell = (run) => (run ? run.status.toUpperCase() : "-");
const keyShot = (run) => (run && run.shots.length ? run.shots[run.shots.length > 2 ? 1 : 0] : null);
const esc = (text) => text.replace(/\|/g, "\\|");

const rows = [];
let pass = 0;
let fail = 0;
for (const id of order) {
  const r = results[id];
  if (!r) continue;
  const runs = r.runs;
  const statuses = Object.values(runs).map((x) => x.status);
  const failed = statuses.includes("fail");
  if (failed) fail += 1;
  else pass += 1;
  const shots = ["1440", "390", "1440-rm", "390-rm"]
    .map((k) => keyShot(runs[k]))
    .filter(Boolean)
    .map((p) => `[${p.split("/").pop()}](v-verify/${p.split("/").pop()})`)
    .join("<br>");
  const detail = Object.entries(runs)
    .filter(([, v]) => v.status === "fail")
    .map(([k, v]) => `${k}: ${v.fails.join("; ")}`)
    .join("<br>");
  rows.push(`| ${id} | ${esc(r.item)} (${r.ref}) | ${cell(runs["390"])} | ${cell(runs["1440"])} | ${cell(runs["390-rm"])} | ${cell(runs["1440-rm"])} | ${shots}${detail ? `<br>**${esc(detail)}**` : ""} |`);
}

const table = [
  `Result: ${pass} items pass, ${fail} fail (${pass + fail} items; run \`node scripts/v-verify/run.mjs\`).`,
  "",
  "| ID | Item (roadmap) | 390 | 1440 | 390 reduced | 1440 reduced | Screenshots |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...rows,
].join("\n");

const notes = order
  .filter((id) => results[id])
  .map((id) => {
    const lines = Object.entries(results[id].runs).flatMap(([k, v]) => v.notes.slice(0, 6).map((n) => `  - \`${k}\` ${esc(n).slice(0, 360)}`));
    return `- **${id}**\n${lines.join("\n")}`;
  })
  .join("\n");

const start = "<!-- results:start -->";
const end = "<!-- results:end -->";
const notesStart = "<!-- notes:start -->";
const notesEnd = "<!-- notes:end -->";
let md = readFileSync(target, "utf8");
const swap = (text, a, b, body) => text.slice(0, text.indexOf(a) + a.length) + "\n" + body + "\n" + text.slice(text.indexOf(b));
md = swap(md, start, end, table);
md = swap(md, notesStart, notesEnd, notes);
writeFileSync(target, md);
console.log(`${pass} pass, ${fail} fail`);
