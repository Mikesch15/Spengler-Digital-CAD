// Tests: Richtung umkehren und Bausteine/Flansche anhängen (Abkantfolgen)
import { folgeUmkehren, folgeAnhaengen, werkzeugAuf, flanschStandard } from "../kern/flansch.js";
import { flaechenblech } from "../kern/flaechenblech.js";
let fehler = 0; const ok = (b, t) => { console.log(`${b ? "✓" : "✗"} ${t}`); if (!b) fehler++; };
ok(folgeUmkehren("90 25 U+ 7") === "-90 25 U- 7", "Umkehren: 90 25 U+ 7 → -90 25 U- 7");
ok(folgeUmkehren("-90 30 45 10") === "90 30 -45 10", "Umkehren: Vorzeichen beider Winkel");
ok(folgeUmkehren("90 25.7 U-r1.75 10.5") === "-90 25.7 U+r1.75 10.5", "Umkehren: Radien bleiben (U-r1.75)");
ok(folgeUmkehren(folgeUmkehren("90r5 20 U+ 8")) === "90r5 20 U+ 8", "Zweimal umkehren = Original");
const m = { id: "z", name: "Z", t: 0.7, ri: 1, k: 0.4 };
const fl = werkzeugAuf({ werkzeug: flanschStandard("flansch") }, m).folge, um = werkzeugAuf({ werkzeug: flanschStandard("umschlag") }, m).folge;
ok(folgeAnhaengen(fl, um) === `${fl} ${um}`, `Anhängen: Flansch «${fl}» + Umschlag «${um}»`);
// Das Blech rechnet die angehängte Folge: zwei Biegungen an der Kante, Zugabe grösser als beim einfachen Flansch
const rechteck = [[0, 0], [200, 0], [200, 100], [0, 100]];
const einfach = flaechenblech(rechteck, [{ folge: fl, versatz: 0 }, null, null, null], m).profile[0], kette = flaechenblech(rechteck, [{ folge: folgeAnhaengen(fl, "90 15"), versatz: 0 }, null, null, null], m).profile[0];
ok(kette.biegungen.length === 2 && einfach.biegungen.length === 1 && kette.zugabe > einfach.zugabe + 10, `Flansch an Flansch: 2 Biegungen, Zugabe ${einfach.zugabe.toFixed(1)} → ${kette.zugabe.toFixed(1)}`);
const rev = flaechenblech(rechteck, [{ folge: folgeUmkehren(fl), versatz: 0 }, null, null, null], m).profile[0];
ok(Math.abs(rev.zugabe - einfach.zugabe) < 1e-6 && rev.biegungen[0].richtung !== einfach.biegungen[0].richtung, "Umgekehrter Flansch: gleiche Zugabe, Biegerichtung wechselt");
console.log(fehler ? `${fehler} Fehler` : "Kanten-Werkzeuge: alle Tests bestanden"); process.exit(fehler ? 1 : 0);
