// Baut eine einzige HTML-Datei, die ohne Internet läuft (Doppelklick, PC-Programm, Handy): node build.mjs
// three.js, Spengler-Kern, Oberfläche und Schriften werden eingebettet.
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { build } from "esbuild";

const url = (p) => new URL(p, import.meta.url);
const lies = (p) => readFileSync(url(p), "utf8");

const { outputFiles } = await build({
  entryPoints: [url("./src/cad.js").pathname],
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2020",
  write: false,
  legalComments: "none",
});
const js = outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const SCHRIFTEN = [
  ["Barlow", 400, "barlow/files/barlow-latin-400-normal"],
  ["Barlow", 500, "barlow/files/barlow-latin-500-normal"],
  ["Barlow", 600, "barlow/files/barlow-latin-600-normal"],
  ["Barlow Condensed", 500, "barlow-condensed/files/barlow-condensed-latin-500-normal"],
  ["Barlow Condensed", 600, "barlow-condensed/files/barlow-condensed-latin-600-normal"],
  ["JetBrains Mono", 400, "jetbrains-mono/files/jetbrains-mono-latin-400-normal"],
  ["JetBrains Mono", 600, "jetbrains-mono/files/jetbrains-mono-latin-600-normal"],
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
console.log("index.html gebaut,", (html.length / 1024).toFixed(0), "KB");
