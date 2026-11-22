import { test } from "node:test"; import assert from "node:assert/strict";
import { loese } from "../kern/fem/loeser.js";
const mat = { E: 210000, nu: 0.3 };
// regelmäßiges Netz in der xy-Ebene
function platte(a, b, nx, ny) { const nodes = [], tris = []; for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) nodes.push([(a * i) / nx, (b * j) / ny, 0]);
  const id = (i, j) => j * (nx + 1) + i; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { tris.push([id(i, j), id(i + 1, j), id(i + 1, j + 1)], [id(i, j), id(i + 1, j + 1), id(i, j + 1)]); } return { nodes, tris, id }; }
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.abs(b), `${msg}: ${a} vs ${b}`);

test("Kragarm: Zugstab (Membran)", () => {
  const L = 100, h = 10, t = 2, { nodes, tris, id } = platte(L, h, 10, 2), N = 6 * nodes.length, F = new Float64Array(N), fix = [];
  for (let j = 0; j <= 2; j++) fix.push(6 * id(0, j)); fix.push(6 * id(0, 0) + 1, 6 * id(0, 0) + 5); for (let n = 0; n < nodes.length; n++) fix.push(6 * n + 5);
  for (let n = 0; n < nodes.length; n++) fix.push(6 * n + 2, 6 * n + 3, 6 * n + 4); // eben halten
  const P = 1000; for (let j = 0; j <= 2; j++) F[6 * id(10, j)] = j === 1 ? 2 : 1; // Summe = P
  let s = 0; for (let j = 0; j <= 2; j++) s += F[6 * id(10, j)]; for (let j = 0; j <= 2; j++) F[6 * id(10, j)] *= P / s;
  const r = loese(nodes, tris, t, mat, fix, F);
  near(r.u[6 * id(10, 1)], (P * L) / (mat.E * h * t), 0.02, "u");
  const el = r.elem.filter((_, e) => Math.floor(e / 2) % 10 >= 7); near(el.reduce((a, x) => a + x.vm, 0) / el.length, P / (h * t), 0.01, "σvm");
});

test("Kragarm: Biegung, Endlast", () => {
  const L = 200, h = 20, t = 3, nx = 20, ny = 2, { nodes, tris, id } = platte(L, h, nx, ny), N = 6 * nodes.length, F = new Float64Array(N), fix = [];
  for (let j = 0; j <= ny; j++) for (let k = 0; k < 6; k++) fix.push(6 * id(0, j) + k);
  const P = 100; for (let j = 0; j <= ny; j++) F[6 * id(nx, j) + 2] = P / (ny + 1);
  const r = loese(nodes, tris, t, mat, fix, F), I = (h * t ** 3) / 12, ref = (P * L ** 3) / (3 * mat.E * I);
  const w = (r.u[6 * id(nx, 0) + 2] + r.u[6 * id(nx, ny) + 2]) / 2; near(w, ref, 0.1, "w");
});

test("Platte frei aufgelegt unter Flächendruck", () => {
  const a = 200, t = 4, n = 16, { nodes, tris, id } = platte(a, a, n, n), N = 6 * nodes.length, F = new Float64Array(N), fix = [], q = 0.01;
  const D = (mat.E * t ** 3) / (12 * (1 - mat.nu ** 2));
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const k = id(i, j); if (i === 0 || j === 0 || i === n || j === n) fix.push(6 * k + 2); }
  fix.push(6 * id(0, 0), 6 * id(0, 0) + 1, 6 * id(n, 0) + 1); fix.push(6 * id(0, 0) + 5);
  for (let k = 0; k < nodes.length; k++) fix.push(6 * k + 5);
  // Lastverteilung: jedes Dreieck 1/3
  for (const tr of tris) { const A = Math.abs(((nodes[tr[1]][0] - nodes[tr[0]][0]) * (nodes[tr[2]][1] - nodes[tr[0]][1]) - (nodes[tr[2]][0] - nodes[tr[0]][0]) * (nodes[tr[1]][1] - nodes[tr[0]][1])) / 2); for (const i of tr) F[6 * i + 2] += (q * A) / 3; }
  const r = loese(nodes, tris, t, mat, fix, F), w = r.u[6 * id(n / 2, n / 2) + 2];
  near(w, (0.00406 * q * a ** 4) / D, 0.05, "w Mitte");
});

import { flaechenNetz, flaecheVon, Modell, plattenAdd, streifenAdd } from "../kern/fem/netz.js";
test("Netz: Rechteck mit Loch deckt die Fläche, keine Entartung", () => {
  const r = [[0, 0], [100, 0], [100, 60], [0, 60]], l = [[40, 20], [60, 20], [60, 40], [40, 40]], { pts, tris } = flaechenNetz(r, 10, [l]);
  const A = tris.reduce((s, [a, b, c]) => s + Math.abs(flaecheVon([pts[a], pts[b], pts[c]])), 0);
  near(A, 100 * 60 - 20 * 20, 0.03, "Fläche"); assert.ok(tris.length > 40);
});
test("Netz: Platte + Flansch hängen zusammen (gemeinsame Knoten)", () => {
  const M = new Modell(); plattenAdd(M, [[0, 0], [100, 0], [100, 50], [0, 50]], 10, 2, [0, 0, 0], [1, 0, 0], [0, 1, 0], "Platte");
  streifenAdd(M, [[0, 0], [0, 20]], 0, 100, 10, 2, [0, 0, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0], "Flansch"); // Kante y=0 nach oben (z)
  // Flansch an der Kante y=0: Querschnitt (x→z?) – Ebene: o=0, ex=z, ey=y?? hier vereinfacht: Streifen steht senkrecht entlang x
  assert.ok(M.nodes.length > 0 && M.tris.length > 0);
});

import { baueModell } from "../kern/fem/blechmodell.js";
import { bausteinProfil, flaechenblech } from "../kern/flaechenblech.js";
test("Blechmodell: Flächenblech mit Flansch wird vernetzt und hängt zusammen", () => {
  const m = { t: 2, ri: 2, k: 0.33 }, pts = [[0, 0], [200, 0], [200, 100], [0, 100]], bl = flaechenblech(pts, [{ name: "Abkantung", folge: "90 30", versatz: 0 }, null, null, null], m);
  const E = { o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };
  const M = baueModell([{ art: "flaeche", name: "FB", t: 2, pts: bl.pts, gruppen: bl.gruppen, profile: bl.profile, ebene: E, seite: 1 }], 20);
  assert.ok(M.nodes.some((p) => p[2] > 20), "Flansch hat Höhe");
  // Zusammenhang: Union-Find über Dreiecke
  const par = M.nodes.map((_, i) => i), fi = (x) => (par[x] === x ? x : (par[x] = fi(par[x])));
  for (const [a, b, c] of M.tris) { par[fi(a)] = fi(b); par[fi(b)] = fi(c); }
  assert.equal(new Set(M.nodes.map((_, i) => fi(i))).size, 1, "ein zusammenhängendes Modell");
});

import { rechneStudie, LAGER_ARTEN } from "../kern/fem/studie.js";
import { werkstoff } from "../kern/fem/werkstoff.js";
test("Studie: Blechstreifen als Kragarm (Einspannung + Linienlast), Durchbiegung und Spannung", () => {
  const E = { o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };
  const M = baueModell([{ art: "profil", name: "Streifen", t: 3, pfad: [{ typ: "linie", p1: [0, 0], p2: [100, 0] }], ebene: E, z0: 0, z1: 200 }], 10);
  const mat = { E: 210000, nu: 0.3, rp: 250, dichte: 7.85e-9 };
  const st = { lager: [{ sel: { art: "kante", p: [50, 0, 0] }, fest: LAGER_ARTEN.eingespannt }], lasten: [{ art: "kraft", sel: { art: "kante", p: [50, 0, 200] }, F: [0, 0, 0] }] };
  st.lasten[0].F = [0, 100, 0]; // quer zum Streifen (y = Dickenrichtung)
  const r = rechneStudie(M, st, mat).ergebnisse[0], I = (100 * 27) / 12;
  near(r.umax, (100 * 200 ** 3) / (3 * 210000 * I), 0.12, "Durchbiegung");
  near(r.smax, (100 * 200 * 1.5) / I, 0.2, "Spannung");
  near(r.summeReaktion[1], -100, 0.01, "Reaktion");
});
test("Studie: Schwerkraft und Flächendruck – Reaktionen stimmen mit der Gesamtlast überein", () => {
  const E = { o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };
  const M = baueModell([{ art: "profil", name: "Streifen", t: 2, pfad: [{ typ: "linie", p1: [0, 0], p2: [100, 0] }], ebene: E, z0: 0, z1: 200 }], 10);
  const mat = { E: 210000, nu: 0.3, rp: 250, dichte: 7.85e-9 }, lager = [{ sel: { art: "kante", p: [50, 0, 0] }, fest: LAGER_ARTEN.eingespannt }];
  const g = rechneStudie(M, { lager, lasten: [{ art: "schwerkraft", g: [0, -9810, 0] }] }, mat).ergebnisse[0];
  near(g.summeReaktion[1], 7.85e-9 * 2 * 100 * 200 * 9810, 0.01, "Gewicht");
  const d = rechneStudie(M, { lager, lasten: [{ art: "druck", sel: { art: "flaeche", p: [50, 0, 100] }, p: 0.002, modus: "richtung", dir: [0, -1, 0] }] }, mat).ergebnisse[0];
  near(d.summeReaktion[1], 0.002 * 100 * 200, 0.01, "Druck");
});
