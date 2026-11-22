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
