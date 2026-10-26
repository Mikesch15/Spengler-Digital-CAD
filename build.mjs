// Baut eine einzige HTML-Datei, die per Doppelklick läuft: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";

const lies = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const modul = (name, pfad) => {
  let code = lies(pfad).replace(/^import .*$/gm, "");
  const namen = [...code.matchAll(/^export (?:async )?(?:function|const|class|let) (\w+)/gm)].map((m) => m[1]);
  code = code.replace(/^export /gm, "");
  return `const { ${namen.join(", ")} } = (() => {\n${code}\nreturn { ${namen.join(", ")} };\n})();\n`;
};
const kern = [
  modul("geometrie", "./kern/geometrie.js"),
  modul("profile", "./kern/profile.js"),
  modul("materialien", "./kern/materialien.js"),
  modul("dxf", "./kern/dxf.js"),
].join("\n");
const app = lies("./src/cad.js").replace(/^import .* from "\.\.\/kern\/.*$/gm, "");
const [kopf, ...rest] = app.split("\n").reduce((acc, z) => { (z.startsWith("import ") ? acc[0] : acc[1]).push(z); return acc; }, [[], []]);
const html = lies("./src/cad.html").replace("/*APP*/", () => `${kopf.join("\n")}\n// ---- Spengler-Kern ----\n${kern}\n// ---- Anwendung ----\n${rest[0].join("\n")}`);
writeFileSync(new URL("./index.html", import.meta.url), html);
mkdirSync(new URL("./dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("./dist/index.html", import.meta.url), html); // für das PC-Programm (Tauri) und die Web-Version
cpSync(new URL("./web/", import.meta.url), new URL("./dist/", import.meta.url), { recursive: true }); // Manifest und Icons fürs Handy
console.log("index.html gebaut,", (html.length / 1024).toFixed(0), "KB");
