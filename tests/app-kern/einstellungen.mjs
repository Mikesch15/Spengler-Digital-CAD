// App-Test Einstellungen: Seite «Allgemein» (Voreinstellungen), Stiftpalette ein/aus, Einstellungen nicht mehr im Reiter Werkstatt
import { createServer } from "node:http"; import { readFileSync } from "node:fs"; import { createRequire } from "node:module"; import { extname, join, resolve } from "node:path";
const dist = resolve("dist"), { chromium } = createRequire(import.meta.url)("playwright");
const typ = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const srv = createServer((q, a) => { let p, d; try { p = q.url === "/" ? "index.html" : decodeURIComponent(q.url.slice(1).split("?")[0]); d = readFileSync(join(dist, p)); } catch { a.writeHead(404); a.end(); return; } a.writeHead(200, { "content-type": typ[extname(p)] || "application/octet-stream" }); a.end(d); }).listen(+(process.env.PORT || 8797));
let fehler = 0; const ok = (c, t) => { console.log(`${c ? "✓" : "✗"} ${t}`); if (!c) fehler++; };
const b = await chromium.launch(), pr = [], url = "http://localhost:" + (process.env.PORT || 8797) + "/index.html?test";
const sichtbar = (s) => s.evaluate(() => { const e = document.getElementById("stiftleiste"); return getComputedStyle(e).display !== "none" && e.querySelectorAll("button[data-for]").length > 0; });
// Maus: Palette automatisch aus
let c = await b.newContext({ viewport: { width: 1280, height: 800 } }), s = await c.newPage(); s.on("pageerror", (e) => pr.push(e.message));
await s.goto(url); await s.waitForTimeout(1500);
ok(await s.evaluate(() => !document.querySelector('[data-klapp="werkstatt"]')), "Reiter «Werkstatt» gibt es nicht mehr");
ok(await s.evaluate(() => { const e = document.getElementById("wEinst"); return !!e && !e.closest("[data-klapp]") && e.getBoundingClientRect().width > 0; }), "Einstellungen liegen oben in der Leiste (immer sichtbar)");
ok(!(await sichtbar(s)), "Mit Maus: Stiftpalette automatisch aus");
await s.click("#wEinst"); await s.waitForTimeout(400);
ok(await s.evaluate(() => document.querySelector('[data-ereg="allgemein"]')?.getAttribute("aria-selected") === "true" && !!document.getElementById("e_allgemein_stiftpalette")), "Einstellungen öffnen auf der Seite «Allgemein» mit Stiftpalette");
await s.selectOption("#e_allgemein_stiftpalette", "ein"); await s.click("#eOk"); await s.waitForTimeout(500);
ok(await sichtbar(s), "Stiftpalette «Immer anzeigen» ist sichtbar");
await s.evaluate(() => document.querySelector('#stiftleiste [data-for="zurueck"]') && 0);
ok(await s.evaluate(() => [...document.querySelectorAll("#stiftleiste button[data-for]")].filter((x) => getComputedStyle(x).display !== "none").map((x) => x.dataset.for).join().includes("wSkizze")), "Ausserhalb der Skizze: Skizze/Extrusion/Rückgängig in der Palette");
await s.click("#stiftleiste [data-for=wSkizze]"); await s.waitForTimeout(400);
ok(await s.evaluate(() => document.getElementById("dTitel").textContent === "Skizze erstellen"), "Palettenknopf löst die Aktion aus");
await s.click("#dAbbrechen"); await s.waitForTimeout(200);
await s.click("#wEinst"); await s.waitForTimeout(300); await s.selectOption("#e_allgemein_stiftpalette", "aus"); await s.click("#eOk"); await s.waitForTimeout(400);
ok(!(await sichtbar(s)), "Stiftpalette «Nie anzeigen» ist weg");
// Palette anpassen und verschieben
await s.click("#wEinst"); await s.waitForTimeout(300); await s.selectOption("#e_allgemein_stiftpalette", "ein");
await s.evaluate(() => { const c = document.getElementById("e_stift_wDrehung"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); const d = document.getElementById("e_stift_wExtrusion"); d.checked = false; d.dispatchEvent(new Event("change", { bubbles: true })); });
await s.click("#eOk"); await s.waitForTimeout(500);
const ids = await s.evaluate(() => [...document.querySelectorAll("#stiftleiste button[data-for]")].map((x) => x.dataset.for));
ok(ids.includes("wDrehung") && !ids.includes("wExtrusion"), `Knöpfe der Palette sind einstellbar (${ids.join(",")})`);
const p0 = await s.evaluate(() => { const r = document.getElementById("stiftleiste").getBoundingClientRect(), g = document.querySelector(".stiftgriff").getBoundingClientRect(); return { x: r.x, y: r.y, gx: g.x + g.width / 2, gy: g.y + g.height / 2 }; });
await s.mouse.move(p0.gx, p0.gy); await s.mouse.down(); await s.mouse.move(p0.gx - 200, p0.gy + 40, { steps: 6 }); await s.mouse.up(); await s.waitForTimeout(200);
const p1 = await s.evaluate(() => { const r = document.getElementById("stiftleiste").getBoundingClientRect(); return { x: r.x, y: r.y }; });
ok(Math.abs((p0.x - p1.x) - 200) < 4 && Math.abs((p1.y - p0.y) - 40) < 4, `Palette lässt sich am Griff verschieben (${p0.x | 0},${p0.y | 0} → ${p1.x | 0},${p1.y | 0})`);
await s.reload(); await s.waitForTimeout(1500);
const p2 = await s.evaluate(() => { const r = document.getElementById("stiftleiste").getBoundingClientRect(); return { x: r.x, y: r.y }; });
ok(Math.abs(p2.x - p1.x) < 4 && Math.abs(p2.y - p1.y) < 4, "Lage der Palette bleibt nach dem Neuladen erhalten");
await s.dblclick(".stiftgriff"); await s.waitForTimeout(200);
ok(Math.abs(await s.evaluate(() => document.getElementById("stiftleiste").getBoundingClientRect().x) - p0.x) < 4, "Doppelklick auf den Griff stellt die Ausgangslage her");
// Datei ganz links, Suchen/Einstellungen/Hilfe ganz rechts; Skizze im Blech-Reiter
const lage = () => s.evaluate(() => { const x = (q) => document.querySelector(q)?.getBoundingClientRect().left ?? -1, tabs = [...document.querySelectorAll("#leiste .klappknopf")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getBoundingClientRect().left); return { datei: x('[data-klapp="datei"] > .klappknopf'), min: Math.min(...tabs), such: x("#wSuche"), einst: x("#wEinst"), hilfe: x("#wHilfe"), marke: x("#leiste .marke") }; });
let L = await lage(); ok(L.datei === L.min && L.datei < L.such && L.such < L.einst && L.einst < L.hilfe && L.marke < L.such, `Desktop: Datei ganz links, Suchen/Einstellungen/Hilfe ganz rechts (${JSON.stringify(L)})`);
await s.setViewportSize({ width: 900, height: 700 }); await s.waitForTimeout(400); L = await lage();
ok(L.datei === L.min && L.datei < L.such && L.such < L.einst && L.einst < L.hilfe, `Schmal: Datei ganz links, Suchen/Einstellungen/Hilfe rechts (${JSON.stringify(L)})`);
await s.setViewportSize({ width: 1280, height: 800 }); await s.waitForTimeout(300);
await s.click('.klappknopf:visible:has-text("Blech")'); await s.waitForTimeout(300);
await s.click("#wSkizzeBlech"); await s.waitForTimeout(500);
ok(await s.evaluate(() => document.getElementById("dTitel").textContent === "Skizze erstellen"), "Blech-Reiter: Skizze lässt sich direkt erstellen");
await s.click("#dAbbrechen"); await s.waitForTimeout(200);
// Eingabe-Diagnose zählt Stift-Schweben
await s.click("#wEinst"); await s.waitForTimeout(300); await s.evaluate(() => window.sdcadTest.einstSeite("programm")); await s.waitForTimeout(200);
await s.evaluate(() => { const f = document.querySelector(".diagfeld"), r = f.getBoundingClientRect(); for (let i = 0; i < 3; i++) f.dispatchEvent(new PointerEvent("pointermove", { pointerType: "pen", pointerId: 5, isPrimary: true, buttons: 0, pressure: 0, clientX: r.x + 20 + i, clientY: r.y + 20, bubbles: true })); });
const dg = await s.evaluate(() => document.getElementById("diagAus").textContent);
ok(/letztes: pointermove · Typ pen · Tasten 0/.test(dg) && /pointermove\s+3/.test(dg) && /davon Schweben\s+3/.test(dg), "Eingabe-Diagnose zählt das Schweben des Stifts");
await s.evaluate(() => { const r = document.querySelector(".diagfeld").getBoundingClientRect(); window.sdcadHover(r.x + 30, r.y + 30, "move"); window.sdcadHover(r.x + 40, r.y + 30, "move"); });
ok(/Nativ-Schweben\s+2/.test(await s.evaluate(() => document.getElementById("diagAus").textContent)), "Android-Hover (window.sdcadHover) wird gezählt und als Stiftbewegung weitergereicht");
await s.click("#eAbbrechen"); await s.waitForTimeout(200);
// Firmenlogo hochladen, Vorname, Startseite/Druck
await s.click("#wEinst"); await s.waitForTimeout(300);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPhfz0AEYBxVSF+FAP5FDvcfRYWgAAAAAElFTkSuQmCC", "base64");
await s.evaluate(() => window.sdcadTest.einstSeite("firma")); await s.waitForTimeout(200);
await s.setInputFiles("#eLogoDatei", { name: "logo.png", mimeType: "image/png", buffer: png }); await s.waitForTimeout(600);
ok(await s.evaluate(() => !!document.querySelector(".logovorschau img")), "Logo hochgeladen: Vorschau in den Einstellungen");
await s.fill("#e_firma_vorname", "Mike"); await s.click("#eOk"); await s.waitForTimeout(500);
ok(await s.evaluate(() => JSON.parse(localStorage.getItem("sdcad-einstellungen")).firma.logo.startsWith("data:image/") && JSON.parse(localStorage.getItem("sdcad-einstellungen")).firma.vorname === "Mike"), "Logo und Vorname sind gespeichert");
await s.evaluate(() => window.sdcadTest.startseite()); await s.waitForTimeout(600);
ok(await s.evaluate(() => !!document.querySelector("#startseite .sblogo img[src^='data:']") && /^Guten (Morgen|Tag|Abend)|^Gute Nacht/.test(document.querySelector(".sbgruss").textContent) && document.querySelector(".sbgruss").textContent.includes("Mike")), "Startseite zeigt Logo und Begrüssung mit Vornamen");
await s.evaluate(() => document.getElementById("startseite").remove());
await s.evaluate(() => document.getElementById("wDrucken").click()); await s.waitForTimeout(500);
ok(await s.evaluate(() => document.getElementById("druck").innerHTML.includes('class="firmenlogo"')), "Werkstattblatt und Stückliste tragen das Logo");
await c.close();
// Tablet: automatisch an
c = await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true }); s = await c.newPage(); s.on("pageerror", (e) => pr.push(e.message));
await s.goto(url); await s.waitForTimeout(1500); ok(await sichtbar(s), "Auf dem Tablet: Stiftpalette automatisch an");
await c.close();
ok(pr.length === 0, "keine Seitenfehler " + pr.join(" | "));
await b.close(); srv.close();
console.log(fehler ? `${fehler} Fehler` : "Einstellungen (App): alle Prüfungen bestanden"); process.exit(fehler ? 1 : 0);
