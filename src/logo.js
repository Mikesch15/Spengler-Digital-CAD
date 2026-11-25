// Firmenlogo: Varianten für helle und dunkle Untergründe erzeugen und die passende wählen.
// Ein dunkles/blaues Logo mit transparentem Hintergrund wird für die blaue Banner-Fläche automatisch weiss eingefärbt;
// ein helles (weisses) Logo wird auf Papier automatisch dunkelblau. Logos mit deckendem Hintergrund (JPEG) bekommen eine weisse Platte.
export const HELL = 0.72; // mittlere Helligkeit ab der ein Logo als «hell» gilt

export async function logoVarianten(url) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Bild nicht lesbar")); i.src = url; });
  const k = Math.min(1, 480 / Math.max(img.width || 1, img.height || 1)), w = Math.max(1, Math.round((img.width || 1) * k)), h = Math.max(1, Math.round((img.height || 1) * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data; let n = 0, lum = 0, transp = 0;
  for (let i = 0; i < px.length; i += 4) { const a = px[i + 3]; if (a < 250) transp++; if (a > 40) { n++; lum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255; } }
  const hat = transp > w * h * 0.03, hell = n ? lum / n : 0.5;
  const faerbe = (r, gr, b) => { const o = g.createImageData(w, h); for (let i = 0; i < px.length; i += 4) { o.data[i] = r; o.data[i + 1] = gr; o.data[i + 2] = b; o.data[i + 3] = px[i + 3]; } g.clearRect(0, 0, w, h); g.putImageData(o, 0, 0); return c.toDataURL("image/png"); };
  return { logoHell: +hell.toFixed(3), logoTransp: hat, logoWeiss: hat ? faerbe(255, 255, 255) : "", logoDunkel: hat ? faerbe(15, 63, 126) : "" };
}
// Logo für die blaue Banner-Fläche: { src, platte } (platte = weisse Unterlage, weil das Logo einen deckenden Hintergrund hat)
export function logoBanner(f) {
  if (!f?.logo) return null; const m = f.logoModus || "auto";
  if (f.logoHell === undefined) return { src: f.logo, platte: false }; // noch nicht analysiert
  if (m === "original") return { src: f.logo, platte: !f.logoTransp };
  if (m === "weiss") return { src: f.logoWeiss || f.logo, platte: !f.logoTransp };
  if (!f.logoTransp) return { src: f.logo, platte: true };
  return { src: f.logoHell >= HELL ? f.logo : f.logoWeiss || f.logo, platte: false };
}
// Logo für weisses Papier (Werkstattblätter, Stückliste, Plan)
export const logoPapier = (f) => (!f?.logo ? "" : f.logoTransp !== false && f.logoHell >= HELL && f.logoDunkel ? f.logoDunkel : f.logo);
