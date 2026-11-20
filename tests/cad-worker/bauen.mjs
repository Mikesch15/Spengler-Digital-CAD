// Prüfseite bauen: node tests/cad-worker/bauen.mjs <ziel>  (CAD-Kern-Bündel + Seite)
import { build } from "esbuild";
import { cpSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const ziel = resolve(process.argv[2] || "tests/cad-worker/dist"), hier = (p) => fileURLToPath(new URL(p, import.meta.url));
execFileSync(process.execPath, [hier("../../kern/cad/bauen.mjs"), ziel], { stdio: "inherit" });
await build({ entryPoints: [hier("./probe.js")], bundle: true, format: "esm", platform: "browser", target: "es2020", outfile: `${ziel}/probe.js`, logLevel: "warning", external: ["node:*"] });
cpSync(hier("./index.html"), `${ziel}/index.html`);
console.log("Prüfseite gebaut:", ziel);
