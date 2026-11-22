// Schneller Testlauf: parallel, kompakte Ausgabe (nur Fehler + eine Summenzeile).
//   node tests/lauf.mjs                → Kern-Tests + App-Tests passend zu den geänderten Dateien (tests/karte.json), sonst Schnelltest-Satz
//   node tests/lauf.mjs alle           → alle Kern- und App-Tests
//   node tests/lauf.mjs kontext dach   → nur diese App-Tests (Namen ohne .mjs)
//   Optionen: --bauen (vorher node build.mjs), --ohnekern (Kern-Tests überspringen), --j=N (Parallelität, Standard 3)
import { spawn, execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
const arg = process.argv.slice(2), opt = (n) => arg.find((a) => a.startsWith(`--${n}`)), namen = arg.filter((a) => !a.startsWith("--"));
const J = +(opt("j=")?.split("=")[1] || 3), alleApp = readdirSync("tests/app-kern").filter((f) => f.endsWith(".mjs")).map((f) => f.slice(0, -4));
const karte = JSON.parse(readFileSync("tests/karte.json", "utf8"));
if (opt("bauen")) execSync("node build.mjs", { stdio: "ignore" });
// Kern-Tests aus package.json
const kern = (JSON.parse(readFileSync("package.json", "utf8")).scripts.test || "").split("&&").map((s) => s.trim()).filter((s) => s.startsWith("node "));
let app, grund = "";
if (namen[0] === "alle") { app = alleApp; grund = "alle"; }
else if (namen.length) { app = namen.filter((n) => alleApp.includes(n)); grund = "Auswahl"; }
else {
  const sh = (c) => { try { return execSync(c, { encoding: "utf8" }).split("\n").filter(Boolean); } catch { return []; } };
  const geaendert = [...new Set([...sh("git diff --name-only origin/main...HEAD"), ...sh("git diff --name-only HEAD"), ...sh("git ls-files -o --exclude-standard")])];
  const t = new Set();
  for (const d of geaendert) { for (const r of karte.regeln) if (d.includes(r.muster)) r.tests.forEach((x) => t.add(x)); const m = d.match(/^tests\/app-kern\/(.+)\.mjs$/); if (m) t.add(m[1]); }
  if (geaendert.some((d) => /^src\/cad\.(js|html)$/.test(d)) || !t.size) karte.schnelltest.forEach((x) => t.add(x));
  app = [...t].filter((x) => alleApp.includes(x)); grund = `geändert (${geaendert.length} Dateien)`;
}
const jobs = [...(opt("ohnekern") ? [] : kern.map((k) => ({ name: k.replace(/^node (test\/)?/, "").replace(".test.js", ""), cmd: k, kern: true }))), ...app.map((n) => ({ name: n, cmd: `node tests/app-kern/${n}.mjs` }))];
const t0 = Date.now(); let nr = 0, fehl = [];
const lauf = (job, slot) => new Promise((ok) => {
  const [c, ...a] = job.cmd.split(" "), s0 = Date.now(), p = spawn(c, a, { env: { ...process.env, PORT: String(9100 + slot) } });
  let out = ""; p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
  const zeit = setTimeout(() => p.kill("SIGKILL"), 290000);
  p.on("close", (code) => { clearTimeout(zeit); const schlecht = out.split("\n").filter((l) => /✗|Error|TimeoutError|Fehler$/.test(l) && !/keine Fehler|Fehlermeldung/.test(l)); const gut = code === 0 && !schlecht.some((l) => l.includes("✗"));
    if (!gut) fehl.push({ name: job.name, zeilen: (schlecht.length ? schlecht : out.trim().split("\n").slice(-4)).slice(0, 6) }); ok(); });
});
await Promise.all(Array.from({ length: Math.min(J, jobs.length) }, async (_, slot) => { while (nr < jobs.length) await lauf(jobs[nr++], slot); }));
// Fehlgeschlagene Tests einmal einzeln wiederholen (parallel läuft die Software-Grafik oft zu langsam → Zeitüberschreitungen)
const erst = fehl.splice(0); const wieder = []; 
for (const f of erst) { const job = jobs.find((j) => j.name === f.name); await lauf(job, 0); if (fehl.some((x) => x.name === f.name)) continue; wieder.push(f.name); }
for (const f of fehl) console.log(`✗ ${f.name}\n   ${f.zeilen.map((z) => z.slice(0, 180)).join("\n   ")}`);
console.log(`${jobs.length - fehl.length}/${jobs.length} grün · ${grund} · ${Math.round((Date.now() - t0) / 1000)} s${wieder.length ? ` · beim 2. Versuch grün: ${wieder.join(", ")}` : ""}${fehl.length ? " · FEHLER: " + fehl.map((f) => f.name).join(", ") : ""}`);
process.exit(fehl.length ? 1 : 0);
