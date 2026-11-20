// CAD-Kern für Browser/Tauri bündeln: node kern/cad/bauen.mjs <zielordner>
// Ergebnis: cad-worker.js (Worker mit replicad), replicad_single.wasm (OCCT, separat und austauschbar – LGPL),
//           LIZENZEN/ (Lizenztexte, Herkunft und Austauschanleitung)
import { build } from "esbuild";
import { cpSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ziel = resolve(process.argv[2] || "dist/cad");
const nm = (p) => fileURLToPath(new URL(`../../node_modules/${p}`, import.meta.url));
mkdirSync(`${ziel}/LIZENZEN`, { recursive: true });
await build({
  entryPoints: [fileURLToPath(new URL("./worker.js", import.meta.url))], bundle: true, format: "esm", platform: "browser", target: "es2020",
  minify: true, outfile: `${ziel}/cad-worker.js`, legalComments: "eof", logLevel: "warning",
  external: ["node:*"], // nur im Node-Zweig von occt.js benutzt
});
cpSync(nm("replicad-opencascadejs/dist/replicad_single.wasm"), `${ziel}/replicad_single.wasm`);
cpSync(nm("replicad-opencascadejs/LICENSE"), `${ziel}/LIZENZEN/OpenCascade-LGPL-2.1.txt`);
cpSync(nm("replicad/LICENSE"), `${ziel}/LIZENZEN/replicad-MIT.txt`);
const v = (p) => JSON.parse(readFileSync(nm(`${p}/package.json`), "utf8"));
const oc = v("replicad-opencascadejs");
writeFileSync(`${ziel}/LIZENZEN/HERKUNFT.txt`, `CAD-Kern von Spengler Digital CAD

OpenCascade Technology (OCCT) 8.0 – als WebAssembly in «replicad_single.wasm»
  Lizenz: GNU LGPL 2.1 (siehe OpenCascade-LGPL-2.1.txt), OCCT zusätzlich mit «Open CASCADE Exception»
  Paket:  replicad-opencascadejs ${oc.version} (npm), Build-Konfiguration im Repository https://github.com/sgenoud/replicad
          (packages/replicad-opencascadejs, Commit ${oc.gitHead ?? "siehe npm"}), gebaut mit dem Docker-Image
          ghcr.io/taucad/opencascade.js:3.1.0-single-threaded
  Quellcode OCCT: https://github.com/Open-Cascade-SAS/OCCT  ·  opencascade.js: https://github.com/donalffons/opencascade.js
  Version belegt durch den STEP-Kopf der Ausgabe: «Open CASCADE STEP processor 8.0».

Austausch (LGPL): Die WASM-Datei wird unverändert und getrennt vom Programm ausgeliefert. Sie kann durch eine selbst
gebaute, schnittstellengleiche Datei gleichen Namens ersetzt werden (im Programmordner bzw. neben cad-worker.js).

replicad ${v("replicad").version} – MIT (siehe replicad-MIT.txt), https://github.com/sgenoud/replicad
`);
console.log(`CAD-Kern gebündelt nach ${ziel}`);
