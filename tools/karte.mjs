// Quellkarte: wo steht was? Spart das Lesen grosser Dateien.
//   node tools/karte.mjs name        → alle Deklarationen/Abschnitte, deren Name `name` enthält (Datei:Zeile)
//   node tools/karte.mjs --schreibe  → docs/cad/KARTE.md neu erzeugen (zum Durchsuchen mit grep, nicht ganz lesen)
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const dateien = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? (f === "node_modules" || f === "cad" && d === "kern" && false ? [] : dateien(p)) : p.endsWith(".js") ? [p] : []; });
const alle = [...dateien("src"), ...dateien("kern")].filter((p) => !p.includes("node_modules"));
const eintraege = [];
for (const p of alle) readFileSync(p, "utf8").split("\n").forEach((z, i) => {
  let m;
  if ((m = z.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/))) eintraege.push({ p, n: i + 1, name: m[1], art: "fn" });
  else if ((m = z.match(/^(?:export\s+)?(?:const|let)\s+(\w+)\s*=/))) eintraege.push({ p, n: i + 1, name: m[1], art: "wert" });
  else if ((m = z.match(/^\s{4,}(?:\} else )?if \(f\.typ === "(\w+)"\)/))) eintraege.push({ p, n: i + 1, name: `regen-Zweig ${m[1]}`, art: "zweig" });
  else if ((m = z.match(/^\/\/ -{4,}\s*(.+)$/))) eintraege.push({ p, n: i + 1, name: m[1].trim(), art: "abschnitt" });
});
if (process.argv.includes("--schreibe")) {
  let t = "# Quellkarte (erzeugt mit `node tools/karte.mjs --schreibe`) – mit grep durchsuchen, nicht ganz lesen\n\nFormat: `Zeile name` (fn = Funktion, § = Abschnitt)\n";
  for (const p of alle) { const e = eintraege.filter((x) => x.p === p); if (!e.length) continue; t += `\n## ${p}\n` + e.map((x) => `${x.n} ${x.art === "abschnitt" ? "§ " : x.art === "fn" ? "fn " : ""}${x.name}`).join("\n") + "\n"; }
  writeFileSync("docs/cad/KARTE.md", t); console.log(`docs/cad/KARTE.md: ${eintraege.length} Einträge`);
} else {
  const q = (process.argv[2] || "").toLowerCase(); if (!q) { console.log("Aufruf: node tools/karte.mjs <name> | --schreibe"); process.exit(0); }
  const t = eintraege.filter((x) => x.name.toLowerCase().includes(q)).slice(0, 40);
  console.log(t.length ? t.map((x) => `${x.p}:${x.n} ${x.art === "abschnitt" ? "§ " : ""}${x.name}`).join("\n") : "nichts gefunden");
}
