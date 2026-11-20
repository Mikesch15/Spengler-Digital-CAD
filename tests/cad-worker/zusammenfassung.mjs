// Ergebnisdateien der Prüfseite als Markdown in die GitHub-Zusammenfassung schreiben: node zusammenfassung.mjs <dist>
import { readdirSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
const dist = process.argv[2], ziel = process.env.GITHUB_STEP_SUMMARY;
for (const n of readdirSync(dist).filter((f) => /^ergebnis-.*\.json$/.test(f))) {
  const e = JSON.parse(readFileSync(join(dist, n), "utf8"));
  let s = `### ${n} – ${e.fehler === 0 ? "bestanden" : `FEHLER (${e.fehler})`}\n${e.umgebung?.ua ?? ""}${e.webview2 ? ` · WebView2 ${e.webview2}` : ""}\n\n`;
  for (const z of e.zeilen ?? []) s += `- ${z.ok ? "✓" : "✗"} ${z.text}${z.wert !== undefined ? " `" + JSON.stringify(z.wert) + "`" : ""}\n`;
  if (ziel) appendFileSync(ziel, s + "\n"); else console.log(s);
}
