// Eine Funktion/Konstante anzeigen, ohne die ganze Datei zu lesen.
//   node tools/fn.mjs name [datei] [--max=60]   (Standard: src/cad.js, dann übrige src/ und kern/)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const [name, datei] = process.argv.slice(2).filter((a) => !a.startsWith("--")), max = +(process.argv.find((a) => a.startsWith("--max="))?.split("=")[1] || 60);
if (!name) { console.log("Aufruf: node tools/fn.mjs <name> [datei] [--max=60]"); process.exit(0); }
const liste = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? (f === "node_modules" ? [] : liste(p)) : p.endsWith(".js") ? [p] : []; });
const kandidaten = datei ? [datei] : ["src/cad.js", ...liste("src").filter((p) => p !== "src/cad.js"), ...liste("kern")];
const re = new RegExp(`^(?:export\\s+)?(?:async\\s+)?(?:function\\s+${name}\\b|(?:const|let)\\s+${name}\\s*=)`);
for (const p of kandidaten) {
  const z = readFileSync(p, "utf8").split("\n"), i = z.findIndex((l) => re.test(l)); if (i < 0) continue;
  let e = i; if (/^(?:export\s+)?(?:async\s+)?function/.test(z[i])) { while (e < z.length - 1 && !/^}/.test(z[e]) || e === i && /\}\s*$/.test(z[i]) && false) e++; if (e === i) e = i; } else { while (e < z.length - 1 && !/;\s*$/.test(z[e])) e++; }
  const ende = Math.min(e, i + max - 1);
  console.log(`${p}:${i + 1}-${e + 1}${ende < e ? ` (gekürzt auf ${max} Zeilen, --max=N für mehr)` : ""}`);
  console.log(z.slice(i, ende + 1).map((l) => (l.length > 240 ? l.slice(0, 240) + " …" : l)).join("\n")); process.exit(0);
}
console.log("nicht gefunden");
