// Vorschau bündeln: node vorschau/bauen.mjs → vorschau/dist/ (esbuild aus dem Hauptprojekt)
import { build } from "../../../node_modules/esbuild/lib/main.js";
import { cpSync, mkdirSync } from "node:fs";
const d = new URL("./dist/", import.meta.url), nm = new URL("../node_modules/", import.meta.url);
mkdirSync(d, { recursive: true });
await build({ entryPoints: [new URL("./vorschau.mjs", import.meta.url).pathname], bundle: true, format: "esm", platform: "browser", outfile: new URL("./vorschau.js", d).pathname, external: ["node:*", "fs", "path", "module", "url", "crypto", "worker_threads", "perf_hooks"], logLevel: "warning" });
cpSync(new URL("./index.html", import.meta.url), new URL("./index.html", d));
cpSync(new URL("replicad-opencascadejs/dist/replicad_single.wasm", nm), new URL("./replicad_single.wasm", d));
cpSync(new URL("opengeometry/opengeometry_bg.wasm", nm), new URL("./opengeometry_bg.wasm", d));
console.log("vorschau/dist gebaut");
