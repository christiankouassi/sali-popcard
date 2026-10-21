// Fusionne les rapports par écran de l'audit responsive en un résumé lisible.
import { readdir, readFile, writeFile } from "node:fs/promises";
const dir = "tests/audit";
const merged = {};
for (const f of (await readdir(dir)).filter((f) => /^report-.+\.json$/.test(f)).sort()) {
  const rows = JSON.parse(await readFile(`${dir}/${f}`, "utf8"));
  const m = new Map();
  for (const r of rows) {
    for (const e of r.errors || []) m.set("ERREUR " + e, new Set());
    for (const i of r.issues || []) {
      const k = `${i.type} ${i.el}${i.by ? " ⟵ " + i.by : ""}${i.ratio ? " ratio " + i.ratio : ""}`;
      m.set(k, (m.get(k) || new Set()).add(r.width));
    }
  }
  if (m.size) merged[rows[0].screen] = [...m].map(([k, w]) => k + (w.size ? "  [" + [...w].join(",") + "]" : ""));
}
await writeFile(`${dir}/summary.json`, JSON.stringify(merged, null, 1));
const n = Object.values(merged).reduce((a, l) => a + l.length, 0);
console.log(JSON.stringify(merged, null, 1));
console.log(`\n${n} constats distincts sur ${Object.keys(merged).length} écrans concernés.`);
