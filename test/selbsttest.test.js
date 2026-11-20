import { selbsttest } from "../kern/selbsttest.js";
const r = selbsttest(); let f = 0;
for (const x of r) { console.log(`${x.ok ? "✓" : "✗"} ${x.name} ${x.detail}`); if (!x.ok) f++; }
if (r.length !== 6) { f++; console.error("Anzahl Prüfungen erwartet 6"); }
if (f) { console.error(f + " Fehler"); process.exit(1); } else console.log("Selbsttest: alle Tests bestanden");
