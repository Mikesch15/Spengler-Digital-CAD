// Baut eine einzige HTML-Datei, die ohne Internet läuft (Doppelklick, PC-Programm, Handy): node build.mjs
// three.js, Spengler-Kern, Oberfläche und Schriften werden eingebettet.
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const url = (p) => new URL(p, import.meta.url);
const lies = (p) => readFileSync(url(p), "utf8");

const { outputFiles } = await build({
  entryPoints: [fileURLToPath(url("./src/cad.js"))],
  bundle: true,
  format: "esm",
  minify: !process.env.SDCAD_DEBUG,
  target: "es2020",
  write: false,
  legalComments: "none",
  // Schrift für Skizzentext: nur Latein inkl. Umlaute, Akzente, Satzzeichen, €, ° (spart ~⅔ der Datei)
  plugins: [{ name: "schrift", setup(b) { b.onLoad({ filter: /typeface\.json$/ }, (a) => {
    const f = JSON.parse(readFileSync(a.path, "utf8"));
    f.glyphs = Object.fromEntries(Object.entries(f.glyphs).filter(([c]) => { const n = c.codePointAt(0); return n < 0x250 || (n >= 0x2000 && n < 0x20d0) || n === 0x2300; }));
    return { contents: JSON.stringify(f), loader: "json" };
  }); } }],
  define: { __VERSION__: JSON.stringify(process.env.SDCAD_VERSION || JSON.parse(lies("./package.json")).version) },
});
const js = outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const SCHRIFTEN = [
  ["Barlow", 400, "barlow/files/barlow-latin-400-normal"],
  ["Barlow", 500, "barlow/files/barlow-latin-500-normal"],
  ["Barlow", 600, "barlow/files/barlow-latin-600-normal"],
  ["Barlow Condensed", 500, "barlow-condensed/files/barlow-condensed-latin-500-normal"],
  ["Barlow Condensed", 600, "barlow-condensed/files/barlow-condensed-latin-600-normal"],
];
const schriften = SCHRIFTEN.map(([familie, gewicht, datei]) => {
  const b64 = readFileSync(url(`./node_modules/@fontsource/${datei}.woff2`)).toString("base64");
  return `@font-face { font-family: "${familie}"; font-weight: ${gewicht}; font-display: swap; src: url(data:font/woff2;base64,${b64}) format("woff2"); }`;
}).join("\n");

const html = lies("./src/cad.html")
  .replace("/*SCHRIFTEN*/", () => schriften)
  .replace("/*APP*/", () => js);

writeFileSync(url("./index.html"), html);
mkdirSync(url("./dist/"), { recursive: true });
writeFileSync(url("./dist/index.html"), html); // für das PC-Programm (Tauri) und die Web-Version
cpSync(url("./web/"), url("./dist/"), { recursive: true }); // Manifest, Icons, Service Worker fürs Handy
// STEP-Leser (OpenCascade als WebAssembly) – wird erst beim ersten STEP-Import geladen
mkdirSync(url("./dist/occt/"), { recursive: true });
for (const d of ["occt-import-js.js", "occt-import-js.wasm", "license.occt-import-js.txt", "license.occt.txt"]) cpSync(url(`./node_modules/occt-import-js/dist/${d}`), url(`./dist/occt/${d}`));
// PDF-Leser (pdf.js) – erst beim ersten PDF-Hintergrund geladen
mkdirSync(url("./dist/pdfjs/"), { recursive: true });
for (const d of ["pdf.min.mjs", "pdf.worker.min.mjs"]) cpSync(url(`./node_modules/pdfjs-dist/build/${d}`), url(`./dist/pdfjs/${d}`));
cpSync(url("./node_modules/pdfjs-dist/LICENSE"), url("./dist/pdfjs/LICENSE"));
console.log("index.html gebaut,", (html.length / 1024).toFixed(0), "KB");
