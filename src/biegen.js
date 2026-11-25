// Spengler Digital CAD – Oberfläche: Biegesimulation (Seitenansicht einer Schwenkbiegemaschine mit Bewegung)
// Portiert aus der Spengler-Digital-App (js/110-biegeanalyse.js, v3.442); angepasst an das CAD-Fenster. Rechnen tut kern/biegen,
// die Maschinendaten stehen in den Einstellungen (einst.maschinen). Nichts wird gespeichert – es ist eine Planungshilfe.
import * as K from "../kern/biegen/biegekern.js";
import { maschineFehlt, schenkelAusProfil } from "../kern/biegen/maschinen.js";
const BGA_MAX_BIEGUNGEN_SUCHE = 10;
const { bgaProfil, bgaMaschineFehler, bgaWerkzeuge, bgaMitWerkzeug, bgaWerkzeugWaehlen, bgaFolgeSuchen, bgaFolgeAnalysieren, bgaPose, bgaTeilLaengePruefen } = K;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let maschinenListe = () => [];
const bmListe = () => maschinenListe(), bmFinden = (id) => maschinenListe().find((m) => String(m.id) === String(id)) || null;
const bgaS={
 quellen:[],quelleNr:0,platte:150,
 offen:false,schenkel:[],profil:null,maschineId:"",t:0,laenge:0,titel:"",
 werkzeugWahl:"auto",werkzeugNr:0,   // v3.448: Oberwangen-Werkzeug (auto = das beste suchen)
 folge:[],auto:true,autoErgebnis:null,analyse:null,fehler:[],
 schritt:0,fortschritt:0,spielt:false,pauseBis:0,letzt:0,raf:0
};
function bgaMaschineBasis(){return bmFinden(bgaS.maschineId)}
// Die Maschine, mit der gerechnet wird: bei drehbarer Oberwange mit dem gewaehlten Werkzeug
function bgaMaschine(){const b=bgaMaschineBasis();return b?bgaMitWerkzeug(b,bgaS.werkzeugNr):null}

// ---- Symbole (einheitliche Linien-Symbole statt Emoji) ---------------------------------------
const BGA_IKON={
 zurueck:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9.5 12z"/></svg>',
 weiter:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5l10.5 7L4 19z"/></svg>',
 spielen:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
 pause:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
 ok:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 nein:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 warn:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5v.01"/></svg>',
 wenden:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.5-4.5M4 13a8 8 0 0 0 14.5 4.5"/><path d="M5.5 3v4h4M18.5 21v-4h-4"/></svg>'
};

// ---- Rechnen ---------------------------------------------------------------------------
function bgaVorbereiten(){
 bgaS.profil=bgaProfil(bgaS.schenkel);
 const m=bgaMaschine();
 bgaS.fehler=[];
 if(!m)bgaS.fehler.push("Keine Maschine gewählt – unter Einstellungen › Material & Lager › Biegemaschinen eintragen.");
 else bgaMaschineFehler(m).forEach(f=>bgaS.fehler.push(f));
 if(!(bgaS.t>0))bgaS.fehler.push("Die Blechstärke fehlt – bitte unten eintragen.");
 if(!bgaS.profil.biegungen.length)bgaS.fehler.push("Das Profil hat keine Biegung.");
}
function bgaNeuRechnen(neuVorschlagen){
 bgaVorbereiten();
 bgaS.analyse=null;
 if(bgaS.fehler.length){bgaS.folge=[];bgaS.schritt=0;bgaS.fortschritt=0;return}
 const m=bgaMaschine();
 if(neuVorschlagen||bgaS.auto||!bgaS.folge.length){
  const basis=bgaMaschineBasis();let r;
  if(bgaWerkzeuge(basis).length&&bgaS.werkzeugWahl==="auto"){const w=bgaWerkzeugWaehlen(bgaS.profil,basis,bgaS.t);bgaS.werkzeugNr=w.nr;r=w.ergebnis}
  else{bgaS.werkzeugNr=bgaS.werkzeugWahl==="auto"?0:Number(bgaS.werkzeugWahl)||0;r=bgaFolgeSuchen(bgaS.profil,bgaMaschine(),bgaS.t)}
  bgaS.autoErgebnis=r;
  if(r.schritte&&r.schritte.length)bgaS.folge=r.schritte.map(s=>({k:s.k,klemm:s.cfg.klemm,flip:s.cfg.flip}));
  else bgaS.folge=bgaS.profil.biegungen.map(k=>({k,klemm:"links",flip:false}));
  bgaS.auto=true;
 }
 bgaS.analyse=bgaFolgeAnalysieren(bgaS.profil,bgaMaschine(),bgaS.t,bgaS.folge);
 if(bgaS.schritt>=bgaS.folge.length)bgaS.schritt=Math.max(0,bgaS.folge.length-1);
}
function bgaZ(n){return String(Math.round(n*10)/10).replace(".",",")}

// ---- Bild ------------------------------------------------------------------------------
function bgaSzene(){
 const m=bgaMaschine(),a=bgaS.analyse;
 if(!m||!a||!a.schritte.length)return null;
 const s=a.schritte[Math.min(bgaS.schritt,a.schritte.length-1)];
 if(!s||!s.lage)return null;
 const winkel=s.theta*bgaS.fortschritt;
 return {m,s,pose:bgaPose(s.lage,m,bgaS.t,winkel),ende:bgaPose(s.lage,m,bgaS.t,s.theta),start:bgaPose(s.lage,m,bgaS.t,0),winkel};
}
function bgaBildHtml(){
 if(bgaS.fehler&&bgaS.fehler.length)return `<div class="bga-leer">${bgaS.fehler.map(esc).join("<br>")}</div>`;
 const sz=bgaSzene();
 if(!sz)return '<div class="bga-leer">Keine Biegung zu zeigen.</div>';
 const {pose,ende,start,s,winkel}=sz;
 // Ausschnitt: Biegekante und Blech (Anfang und Ende), im festen Seitenverhaeltnis 3:2
 const xs=[-170,130],ys=[-100,140];
 [pose,ende,start].forEach(p=>p.punkte.forEach(q=>{xs.push(q[0]);ys.push(q[1])}));
 let x0=Math.min(...xs)-12,x1=Math.max(...xs)+12,y0=Math.min(...ys)-12,y1=Math.max(...ys)+12;
 let W=x1-x0,H=y1-y0;const ziel=3/2;
 if(W/H<ziel){const w2=H*ziel;x0-=(w2-W)/2;W=w2}else{const h2=W/ziel;y0-=(h2-H)/2;H=h2}
 const pxW=360,sc=pxW/W,sicht=Math.max(bgaS.t,3.4/sc),px=v=>(v/sc).toFixed(2);
 const P=q=>q[0].toFixed(2)+","+q[1].toFixed(2);
 const poly=(p,fill,stroke)=>`<polygon points="${p.map(P).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${px(1)}" stroke-linejoin="round"/>`;
 const koll=pose.kollisionen,hat=n=>koll.some(k=>k.teil===n);
 // Gitter: alle 10 mm fein, alle 50 mm kraeftiger (nur wenn die Linien nicht zu dicht stehen)
 let gitter="";
 const gs=sc>=1.1?10:50,gx0=Math.floor(x0/gs)*gs,gy0=Math.floor(y0/gs)*gs;
 for(let x=gx0;x<=x1;x+=gs)gitter+=`<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0+H}" stroke="${x%50===0?"#d7dde4":"#e9edf1"}" stroke-width="${px(x%50===0?.8:.5)}"/>`;
 for(let y=gy0;y<=y0+H;y+=gs)gitter+=`<line x1="${x0}" y1="${y}" x2="${x0+W}" y2="${y}" stroke="${y%50===0?"#d7dde4":"#e9edf1"}" stroke-width="${px(y%50===0?.8:.5)}"/>`;
 const tischlinie=`<line x1="${x0}" y1="0" x2="${x0+W}" y2="0" stroke="#aab4be" stroke-width="${px(.9)}" stroke-dasharray="${px(5)} ${px(4)}"/>`;
 const tools=pose.unter.map(p=>poly(p,hat("Unterwange")?"url(#bgaRot)":"url(#bgaUnter)","#4d5a66")).join("")
  +pose.klemm.map(p=>poly(p,hat("Oberwange")?"url(#bgaRot)":"url(#bgaKlemm)","#46525d")).join("")
  +pose.beam.map(p=>poly(p,hat("Biegewange")?"url(#bgaRot)":(s.theta>0?"url(#bgaAuf)":"url(#bgaAb)"),s.theta>0?"#255d92":"#1f7a57")).join("");
 const pts=pose.punkte;
 const linie=pts.map(P).join(" ");
 const geister=`<polyline points="${ende.punkte.map(P).join(" ")}" fill="none" stroke="#16845c" stroke-width="${(sicht*.55).toFixed(2)}" stroke-dasharray="${px(6)} ${px(4)}" opacity=".6" stroke-linejoin="round"/>`;
 const rotSeg=[...new Set(pose.kollisionen.map(k=>k.schenkel))].map(j=>j<pts.length-1?`<line x1="${pts[j][0].toFixed(2)}" y1="${pts[j][1].toFixed(2)}" x2="${pts[j+1][0].toFixed(2)}" y2="${pts[j+1][1].toFixed(2)}" stroke="#d92d20" stroke-width="${(sicht*1.7).toFixed(2)}" opacity=".9"/>`:"").join("");
 // Winkelbogen an der Biegekante
 const piv=pose.piv,R=34/sc,w=Math.abs(winkel);
 let bogen="";
 if(w>0.5){
  const sg=s.theta>0?1:-1,n=Math.max(2,Math.ceil(w/6)),arc=[];
  for(let i=0;i<=n;i++){const a=sg*w*i/n*Math.PI/180;arc.push([piv[0]+R*Math.cos(a),piv[1]+R*Math.sin(a)])}
  const mid=sg*w/2*Math.PI/180,tx=piv[0]+(R+13/sc)*Math.cos(mid),ty=piv[1]+(R+13/sc)*Math.sin(mid);
  bogen=`<polyline points="${arc.map(P).join(" ")}" fill="none" stroke="#d97706" stroke-width="${px(1.6)}"/>`
   +`<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(1,-1)"><text text-anchor="middle" dominant-baseline="middle" font-size="${px(12)}" font-weight="700" fill="#a85a00" font-family="system-ui,sans-serif">${Math.round(w)}°</text></g>`;
 }
 // Beschriftungen in Maschinenkoordinaten (Text nicht gespiegelt) und Massstab
 const beschr=(txt,x,y,farbe,ende)=>`<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(1,-1)"><text${ende?' text-anchor="end"':""} font-size="${px(10.5)}" fill="${farbe}" font-family="system-ui,sans-serif" font-weight="600">${txt}</text></g>`;
 const labels=beschr("Unterwange",Math.max(x0+10/sc,-312),-62,"#4d5a66")+beschr("Oberwange",-126,Math.min(y0+H-18/sc,130),"#4d5a66",true)
  +beschr(s.theta>0?"Biegewange (auf)":"Biegewange (ab)",8,s.theta>0?-76:84,s.theta>0?"#255d92":"#1f7a57");
 const mm=W>420?100:50;
 const mx=x0+W-12/sc-mm,my=y0+16/sc;
 const massstab=`<line x1="${mx}" y1="${my}" x2="${mx+mm}" y2="${my}" stroke="#5a6772" stroke-width="${px(2)}"/><line x1="${mx}" y1="${my-4/sc}" x2="${mx}" y2="${my+4/sc}" stroke="#5a6772" stroke-width="${px(1.5)}"/><line x1="${mx+mm}" y1="${my-4/sc}" x2="${mx+mm}" y2="${my+4/sc}" stroke="#5a6772" stroke-width="${px(1.5)}"/>`
  +`<g transform="translate(${(mx+mm/2).toFixed(1)},${(my+9/sc).toFixed(1)}) scale(1,-1)"><text text-anchor="middle" font-size="${px(10)}" fill="#5a6772" font-family="system-ui,sans-serif">${mm} mm</text></g>`;
 const kollText=koll.length?`<div class="bga-koll">${BGA_IKON.warn}<span>Kollision: ${esc(koll.map(k=>k.teil+(k.nr?" (Schenkel "+k.nr+")":"")).join(", "))}</span></div>`:"";
 return `<div class="bga-bild-rahmen"><svg viewBox="${x0.toFixed(1)} ${(-(y0+H)).toFixed(1)} ${W.toFixed(1)} ${H.toFixed(1)}" width="100%" role="img" aria-label="Seitenansicht der Biegemaschine">
<defs>
 <linearGradient id="bgaUnter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d0d7"/><stop offset="1" stop-color="#9aa5b0"/></linearGradient>
 <linearGradient id="bgaKlemm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9c2cb"/><stop offset="1" stop-color="#8795a2"/></linearGradient>
 <linearGradient id="bgaAuf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b5d1ea"/><stop offset="1" stop-color="#7ea6cb"/></linearGradient>
 <linearGradient id="bgaAb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6e0cc"/><stop offset="1" stop-color="#7ec0a2"/></linearGradient>
 <linearGradient id="bgaRot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8c6c0"/><stop offset="1" stop-color="#ee9a92"/></linearGradient>
</defs>
<rect x="${x0}" y="${-(y0+H)}" width="${W}" height="${H}" fill="#f7f9fb"/>
<g transform="scale(1,-1)">${gitter}${tischlinie}${tools}${geister}
<polyline points="${linie}" fill="none" stroke="#2f3a44" stroke-width="${(sicht+1.7/sc).toFixed(2)}" stroke-linejoin="round" stroke-linecap="butt"/>
<polyline points="${linie}" fill="none" stroke="#e8ecf0" stroke-width="${sicht.toFixed(2)}" stroke-linejoin="round" stroke-linecap="butt"/>
${rotSeg}${bogen}
<circle cx="${piv[0]}" cy="${piv[1]}" r="${px(3.4)}" fill="#d97706" stroke="#fff" stroke-width="${px(1)}"/>
${labels}${massstab}</g>
</svg>${kollText}</div>`;
}
function bgaSteuerungHtml(){
 const a=bgaS.analyse;
 if(!a||!a.schritte.length)return "";
 const n=a.schritte.length,s=a.schritte[bgaS.schritt],gr=Math.round(Math.abs(s.theta)*bgaS.fortschritt);
 const chips=a.schritte.map((r,i)=>`<button type="button" class="bga-chip${i===bgaS.schritt?" ist-auf":""}${r.moeglich?"":" ist-fehler"}" data-bga-waehle="${i}" aria-label="Schritt ${i+1}">${i+1}</button>`).join("");
 return `<div class="bga-player">
 <button type="button" class="bga-knopf" data-bga-akt="zurueck" title="Voriger Schritt" aria-label="Voriger Schritt">${BGA_IKON.zurueck}</button>
 <button type="button" class="bga-knopf bga-gross" data-bga-akt="spielen" aria-label="${bgaS.spielt?"Pause":"Abspielen"}">${bgaS.spielt?BGA_IKON.pause:BGA_IKON.spielen}</button>
 <button type="button" class="bga-knopf" data-bga-akt="weiter" title="Nächster Schritt" aria-label="Nächster Schritt">${BGA_IKON.weiter}</button>
 <div class="bga-regler-box"><input type="range" id="bgaRegler" min="0" max="1000" value="${Math.round(bgaS.fortschritt*1000)}" aria-label="Biegewinkel des aktuellen Schritts">
  <div class="bga-regler-text"><span>Schritt ${bgaS.schritt+1} / ${n}</span><span>${gr}° / ${Math.round(Math.abs(s.theta))}° ${s.theta>0?"auf":"ab"}</span></div></div></div>
 <div class="bga-chips">${chips}</div>`;
}
function bgaKopfHtml(){
 const m=bgaMaschine(),a=bgaS.analyse;
 const lang=m?bgaTeilLaengePruefen(m,bgaS.laenge):"";
 let pille="";
 if(a&&a.schritte.length){
  const probleme=a.schritte.reduce((x,r)=>x+r.probleme.length,0);
  if(a.ok&&!lang)pille=`<span class="bga-pille ok">${BGA_IKON.ok} Machbar</span>`;
  else if(a.ok)pille=`<span class="bga-pille warn">${BGA_IKON.warn} Teil zu lang</span>`;
  else pille=`<span class="bga-pille fehler">${BGA_IKON.nein} ${probleme} Problem${probleme===1?"":"e"}</span>`;
 }
 return `<div class="bga-kopfzeile"><div><b>${esc(m?m.name||"Maschine":"Keine Maschine")}</b><div class="bga-klein">${esc(bgaS.titel||"Profil")} · ${bgaS.profil?bgaS.profil.biegungen.length:0} Biegung(en)${bgaS.t>0?" · "+bgaZ(bgaS.t)+" mm":""}</div></div>${pille}</div>`;
}
function bgaErgebnisHtml(){
 const m=bgaMaschine(),a=bgaS.analyse;
 let h="";
 if(m&&!m.geprueft)h+='<div class="bga-hinweis warn">Die Werkzeugwerte dieser Maschine sind nicht als «mit der Herstellerzeichnung geprüft» markiert (Einstellungen › Biegemaschinen) – das Ergebnis ist mit Vorsicht zu lesen.</div>';
 if(!a||!a.schritte.length)return h;
 const lang=bgaTeilLaengePruefen(m,bgaS.laenge);
 const probleme=a.schritte.reduce((x,r)=>x+r.probleme.length,0);
 const auto=bgaS.autoErgebnis;
 if(a.ok&&!lang){
  h+=`<div class="bga-hinweis ok"><b>Machbar</b> – ${a.schritte.length} Biegung(en), ${a.wenden===0?"kein Wenden":a.wenden+" × Wenden"}.${bgaS.auto?" Die Reihenfolge ist ein Vorschlag mit möglichst wenig Wenden; der längste Schenkel wird möglichst geklemmt.":""}</div>`;
 }else if(a.ok){
  h+=`<div class="bga-hinweis fehler"><b>Im Querschnitt machbar, aber:</b> ${esc(lang)}</div>`;
 }else{
  const beste=bgaS.auto&&auto&&auto.beste;
  h+=`<div class="bga-hinweis fehler"><b>So nicht machbar</b> (${probleme} Problem${probleme===1?"":"e"}).${beste?" Auch mit anderer Reihenfolge, Klemmseite oder Wenden gibt es auf dieser Maschine keine machbare Folge – gezeigt ist die <b>beste gefundene Folge</b> mit den wenigsten Problemen.":""}${lang?"<br>"+esc(lang):""}</div>`;
 }
 if(auto&&auto.zuViele)h+=`<div class="bga-klein">Mehr als ${BGA_MAX_BIEGUNGEN_SUCHE} Biegungen: keine automatische Suche, die Folge wird so geprüft, wie sie unten steht.</div>`;
 if(auto&&auto.abgebrochen)h+='<div class="bga-klein">Die Suche wurde wegen ihres Umfangs begrenzt – die Folge kann unten von Hand angepasst werden.</div>';
  h+='<div class="bga-klein">Nicht gerechnet: Innenradius, Rückfederung, Falzdicke bei Umschlägen. Die Biegewange dreht bündig am Flansch um die Biegekante; das Blech ist zur Sichtbarkeit verstärkt gezeichnet. Planungshilfe, keine zertifizierte Simulation.</div>';
 return h;
}
function bgaEmpfehlungHtml(){
 const a=bgaS.analyse;
 if(!a||!a.schritte.length)return "";
 const bn=k=>bgaS.profil.biegungen.indexOf(k)+1;
 const teile=a.schritte.map((r,i)=>`<span class="bga-schrittchip">${i+1}</span> Biegung ${bn(bgaS.folge[i].k)}`).join('<span class="bga-pfeil">→</span>');
 const seiten=[...new Set(bgaS.folge.map(f=>f.klemm))];
 return `<div class="bga-empf"><div class="bga-klein">${bgaS.auto?"Empfohlene Reihenfolge":"Eigene Reihenfolge"}</div><div class="bga-folge-zeile">${teile}</div>`
  +`<div class="bga-klein">${a.wenden===0?"Kein Wenden":a.wenden+" × Wenden"} · Klemmen ${seiten.length===1?seiten[0]+" der Biegung":"links bzw. rechts der Biegung"}${(()=>{const m=bgaMaschine();return m&&m.werkzeugName?` · Oberwange: <b data-bga-werkzeug-name>${esc(m.werkzeugName)}</b>`:""})()}</div></div>`;
}
function bgaFolgeHtml(){
 const a=bgaS.analyse;
 if(!a||!a.schritte.length)return '<div class="bga-klein">Noch keine Folge.</div>';
 const n=a.schritte.length;
 return a.schritte.map((r,i)=>{
  const f=bgaS.folge[i];
  const gr=Math.round(Math.abs(r.theta));
  const ist=i===bgaS.schritt;
  return `<div class="bga-schritt${ist?" ist-auf":""}${r.moeglich?"":" ist-fehler"}">
  <div class="bga-schritt-kopf">
   <button type="button" class="bga-nr" data-bga-waehle="${i}" aria-label="Schritt ${i+1} zeigen">${i+1}</button>
   <div class="bga-schritt-titel"><b>Biegung ${bgaS.profil.biegungen.indexOf(f.k)+1}</b> · ${gr}° ${r.theta>0?"nach oben":"nach unten"}<div class="bga-klein">zwischen Schenkel ${f.k} und ${f.k+1}</div></div>
   <span class="bga-status ${r.moeglich?"ok":"fehler"}">${r.moeglich?BGA_IKON.ok:BGA_IKON.nein}</span>
   <span class="bga-schieber"><button type="button" class="bga-mini" data-bga-hoch="${i}"${i===0?" disabled":""} aria-label="Früher">↑</button><button type="button" class="bga-mini" data-bga-runter="${i}"${i===n-1?" disabled":""} aria-label="Später">↓</button></span></div>
  <div class="bga-schritt-zeile">
   <label class="bga-feld">Klemmen<select data-bga-klemm="${i}"><option value="links"${f.klemm==="links"?" selected":""}>links der Biegung</option><option value="rechts"${f.klemm==="rechts"?" selected":""}>rechts der Biegung</option></select></label>
   <label class="bga-pruef"><input type="checkbox" data-bga-flip="${i}"${f.flip?" checked":""}> Blech gedreht eingelegt</label>
   ${r.wendet?`<span class="bga-wenden">${BGA_IKON.wenden} Blech wenden</span>`:""}</div>
  ${r.probleme.map(p=>`<div class="bga-problem">${BGA_IKON.warn}<span>${esc(p.text)}</span></div>`).join("")}
  ${r.hinweise.map(p=>`<div class="bga-klein">${esc(p)}</div>`).join("")}</div>`;
 }).join("")+`<div class="bar"><button type="button" class="gray" data-bga-akt="vorschlag">Neu vorschlagen</button></div>`;
}
function bgaEingabeHtml(){
 const l=bmListe();
 const opt=l.map(m=>`<option value="${esc(m.id)}"${String(m.id)===String(bgaS.maschineId)?" selected":""}>${esc(m.name||"(ohne Name)")}</option>`).join("");
 const wz=bgaWerkzeuge(bgaMaschineBasis());
 const q=bgaS.quellen||[],quellFeld=q.length?`<div class="wide"><label>${q.length>1?"Kante mit Baustein":"Kante"}</label><select id="bgaQuelle">${q.map((x,i)=>`<option value="${i}"${i===bgaS.quelleNr?" selected":""}>${esc(x.name)}</option>`).join("")}</select></div>${q[bgaS.quelleNr]&&q[bgaS.quelleNr].mitPlatte?`<div class="wide"><label>Blech vor der Kante (mm) – geklemmter Teil</label><input id="bgaPlatte" type="number" step="10" min="1" value="${esc(bgaS.platte)}"></div>`:""}`:"";
 const wzFeld=wz.length?`<div><label>Oberwangen-Werkzeug</label><select id="bgaWerkzeug"><option value="auto"${bgaS.werkzeugWahl==="auto"?" selected":""}>Automatisch</option>${wz.map((w,i)=>`<option value="${i}"${String(bgaS.werkzeugWahl)===String(i)?" selected":""}>${esc(w.name||("Werkzeug "+(i+1)))}</option>`).join("")}</select></div>`:"";
 return `<div class="grid">
  <div><label>Maschine</label><select id="bgaMaschine">${opt||'<option value="">– keine Maschine eingetragen –</option>'}</select></div>${wzFeld}
  ${quellFeld}<div><label>Blechstärke (mm)</label><input id="bgaStaerke" type="number" step="0.1" min="0" value="${esc(bgaS.t||"")}"></div>
  <div><label>Teillänge (mm, optional)</label><input id="bgaLaenge" type="number" step="10" min="0" value="${esc(bgaS.laenge||"")}"></div>
 </div>
 <div class="bga-klein" style="margin-top:6px"><button type="button" class="knopf klein" data-bga-einst>Maschinen bearbeiten …</button></div>`;
}
function bgaZeichnen(nurBild){
 const bild=$("bgaBild");if(!bild)return;
 bild.innerHTML=bgaBildHtml();
 const st=$("bgaSteuerung");if(st&&!nurBild)st.innerHTML=bgaSteuerungHtml();
 else if(st)bgaSteuerungAktualisieren();
 if(nurBild)return;
 $("bgaKopfZeile").innerHTML=bgaKopfHtml();
 $("bgaErgebnis").innerHTML=bgaErgebnisHtml();
 $("bgaEmpfehlung").innerHTML=bgaEmpfehlungHtml();
 $("bgaFolge").innerHTML=bgaFolgeHtml();
 $("bgaEingabe").innerHTML=bgaEingabeHtml();
}
// Waehrend der Bewegung nur Regler, Text und Wiedergabe-Knopf nachfuehren (das Bedienelement behaelt seinen Fokus)
function bgaSteuerungAktualisieren(){
 const a=bgaS.analyse;if(!a||!a.schritte.length)return;
 const r=$("bgaRegler");
 if(!r){const st=$("bgaSteuerung");if(st)st.innerHTML=bgaSteuerungHtml();return}
 const s=a.schritte[bgaS.schritt],gr=Math.round(Math.abs(s.theta)*bgaS.fortschritt);
 if(document.activeElement!==r)r.value=Math.round(bgaS.fortschritt*1000);
 const t=document.querySelector("#bgaSteuerung .bga-regler-text");
 if(t)t.innerHTML=`<span>Schritt ${bgaS.schritt+1} / ${a.schritte.length}</span><span>${gr}° / ${Math.round(Math.abs(s.theta))}° ${s.theta>0?"auf":"ab"}</span>`;
 const pk=document.querySelector('#bgaSteuerung [data-bga-akt="spielen"]');
 if(pk){const soll=bgaS.spielt?"pause":"spielen";if(pk.getAttribute("data-ikon")!==soll){pk.innerHTML=BGA_IKON[soll];pk.setAttribute("data-ikon",soll);pk.setAttribute("aria-label",bgaS.spielt?"Pause":"Abspielen")}}
}

// ---- Bewegung --------------------------------------------------------------------------
function bgaStopp(){bgaS.spielt=false;if(bgaS.raf)cancelAnimationFrame(bgaS.raf);bgaS.raf=0}
function bgaWeich(x){return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2}   // sanfter Anfang und sanftes Ende
function bgaSchleife(zeit){
 if(!bgaS.spielt||!bgaS.offen){bgaS.raf=0;return}
 const a=bgaS.analyse;
 if(!a||!a.schritte.length){bgaStopp();return}
 const dt=bgaS.letzt?Math.min(80,zeit-bgaS.letzt):16;bgaS.letzt=zeit;
 if(zeit<bgaS.pauseBis){bgaS.raf=requestAnimationFrame(bgaSchleife);return}
 const s=a.schritte[bgaS.schritt],dauer=Math.max(1100,Math.abs(s.theta)/50*1000);
 bgaS.lin=(bgaS.lin||0)+dt/dauer;
 if(bgaS.lin>=1){
  bgaS.lin=0;bgaS.fortschritt=1;bgaZeichnen(true);
  if(bgaS.schritt<a.schritte.length-1){bgaS.schritt++;bgaS.fortschritt=0;bgaS.pauseBis=zeit+500;bgaZeichnen()}
  else{bgaS.spielt=false;bgaS.raf=0;bgaZeichnen();return}
 }else{bgaS.fortschritt=bgaWeich(bgaS.lin);bgaZeichnen(true)}
 bgaS.raf=requestAnimationFrame(bgaSchleife);
}
function bgaSpielen(){
 const a=bgaS.analyse;if(!a||!a.schritte.length)return;
 if(bgaS.spielt){bgaStopp();bgaZeichnen(true);return}
 if(bgaS.schritt>=a.schritte.length-1&&bgaS.fortschritt>=1){bgaS.schritt=0;bgaS.fortschritt=0}
 bgaS.lin=bgaS.fortschritt;   // ab der aktuellen Stellung weiterfahren
 bgaS.spielt=true;bgaS.letzt=0;bgaS.pauseBis=0;bgaS.raf=requestAnimationFrame(bgaSchleife);bgaZeichnen(true);
}


// ---- Öffnen / Schliessen --------------------------------------------------------------
let status = () => {};
function bgaQuelleAnwenden() {
  const q = bgaS.quellen[bgaS.quelleNr]; if (!q) return;
  bgaS.schenkel = JSON.parse(JSON.stringify(q.schenkel)); if (q.mitPlatte && bgaS.schenkel.length) bgaS.schenkel[0].laenge = Math.max(1, Number(bgaS.platte) || 150); bgaS.hinweise = q.hinweise || [];
}
function bgaOeffnen(schenkel, o) {
  bgaS.schenkel = JSON.parse(JSON.stringify(schenkel || [])); bgaS.t = Number(o.staerke) > 0 ? Number(o.staerke) : 0; bgaS.laenge = Number(o.laenge) > 0 ? Number(o.laenge) : 0; bgaS.titel = o.titel || ""; bgaS.hinweise = o.hinweise || []; bgaS.quellen = o.quellen || []; bgaS.quelleNr = 0; bgaS.platte = Number(o.platte) > 0 ? Number(o.platte) : 150; if (bgaS.quellen.length) bgaQuelleAnwenden();
  const l = bmListe(); if (!l.some((x) => String(x.id) === String(bgaS.maschineId))) bgaS.maschineId = (l.find((m) => !maschineFehlt(m).length) || l[0])?.id ?? "";
  bgaS.werkzeugWahl = "auto"; bgaS.auto = true; bgaS.schritt = 0; bgaS.fortschritt = 0; bgaStopp(); bgaS.offen = true; bgaNeuRechnen(true);
  $("bgFenster").hidden = false; $("bgFenster").classList.remove("klein"); document.querySelector(".mitte")?.classList.add("bgOffen"); bgaZeichnen(); $("bgInhalt").scrollTop = 0;
}
function bgaSchliessen() { bgaStopp(); bgaS.offen = false; $("bgFenster").hidden = true; document.querySelector(".mitte")?.classList.remove("bgOffen"); }
function bgaFolgeVerschieben(i, d) { const j = i + d; if (j < 0 || j >= bgaS.folge.length) return; const f = bgaS.folge; [f[i], f[j]] = [f[j], f[i]]; bgaS.auto = false; bgaS.schritt = j; bgaS.fortschritt = 0; bgaNeuRechnen(false); bgaZeichnen(); }
const neu = () => { bgaS.auto = true; bgaS.schritt = 0; bgaS.fortschritt = 0; bgaNeuRechnen(true); bgaZeichnen(); };

export function biegenInit(ctx) {
  maschinenListe = ctx.maschinen; status = ctx.status;
  $("bgZu").onclick = bgaSchliessen; $("bgZu2").onclick = bgaSchliessen;
  $("bgFenster").addEventListener("click", (e) => {
    const t = e.target.closest("[data-bga-akt],[data-bga-waehle],[data-bga-hoch],[data-bga-runter],[data-bga-einst]"); if (!t) return;
    if (t.hasAttribute("data-bga-einst")) return ctx.einstellungen();
    if (t.hasAttribute("data-bga-waehle")) { bgaStopp(); bgaS.schritt = Number(t.getAttribute("data-bga-waehle")); bgaS.fortschritt = 0; return bgaZeichnen(); }
    if (t.hasAttribute("data-bga-hoch")) return bgaFolgeVerschieben(Number(t.getAttribute("data-bga-hoch")), -1);
    if (t.hasAttribute("data-bga-runter")) return bgaFolgeVerschieben(Number(t.getAttribute("data-bga-runter")), 1);
    const akt = t.getAttribute("data-bga-akt");
    if (akt === "spielen") bgaSpielen();
    else if (akt === "weiter" || akt === "zurueck") { bgaStopp(); const n = bgaS.analyse ? bgaS.analyse.schritte.length : 0; bgaS.schritt = Math.max(0, Math.min(n - 1, bgaS.schritt + (akt === "weiter" ? 1 : -1))); bgaS.fortschritt = akt === "weiter" ? 0 : 1; bgaZeichnen(); }
    else if (akt === "vorschlag") { bgaStopp(); neu(); }
  });
  $("bgFenster").addEventListener("input", (e) => { if (e.target.id === "bgaRegler") { bgaStopp(); bgaS.fortschritt = Number(e.target.value) / 1000; bgaZeichnen(true); } });
  $("bgFenster").addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "bgaMaschine") { bgaS.maschineId = t.value; bgaS.werkzeugWahl = "auto"; return neu(); }
    if (t.id === "bgaWerkzeug") { bgaS.werkzeugWahl = t.value; return neu(); }
    if (t.id === "bgaQuelle") { bgaS.quelleNr = Number(t.value) || 0; bgaQuelleAnwenden(); return neu(); }
    if (t.id === "bgaPlatte") { bgaS.platte = Number(t.value) > 0 ? Number(t.value) : 150; bgaQuelleAnwenden(); return neu(); }
    if (t.id === "bgaStaerke") { const v = Number(String(t.value).replace(",", ".")); bgaS.t = v > 0 ? v : 0; return neu(); }
    if (t.id === "bgaLaenge") { bgaS.laenge = Number(t.value) > 0 ? Number(t.value) : 0; return bgaZeichnen(); }
    if (t.hasAttribute("data-bga-klemm")) { bgaS.folge[Number(t.getAttribute("data-bga-klemm"))].klemm = t.value; bgaS.auto = false; bgaNeuRechnen(false); return bgaZeichnen(); }
    if (t.hasAttribute("data-bga-flip")) { bgaS.folge[Number(t.getAttribute("data-bga-flip"))].flip = !!t.checked; bgaS.auto = false; bgaNeuRechnen(false); return bgaZeichnen(); }
  });
}
// Profil eines CAD-Features öffnen: res = Ergebnis von berechne() (schenkel, biegungen)
export function biegenOeffnen(res, o) { const s = schenkelAusProfil(res); if (!s.schenkel.length || s.schenkel.length < 2) return status("Das Profil hat keine Biegung."); bgaOeffnen(s.schenkel, { ...o, hinweise: s.hinweise }); }
export const biegenOffen = () => bgaS.offen;
export const biegenZustand = () => ({ s: bgaS, fehler: bgaS.fehler, analyse: bgaS.analyse, folge: bgaS.folge, maschine: bgaMaschine()?.name });
export function biegenNeuZeichnen() { if (bgaS.offen) { bgaNeuRechnen(true); bgaZeichnen(); } }

// Querschnitt einer Maschine als Bild (Einstellungen): Unter-/Oberwange grau, Biegewange blau, weitere Oberwangen-Werkzeuge orange
export function maschinenVorschau(m, breite) {
  const polys = [], add = (teile, farbe) => (teile || []).forEach((p) => { if (Array.isArray(p) && p.length >= 3) polys.push({ p, farbe }); });
  add(m?.unterwange, "#8a97a3"); add(m?.klemmwange, "#6b7a88");
  (Array.isArray(m?.oberwange_werkzeuge) ? m.oberwange_werkzeuge : []).forEach((w, i) => add(w?.teile, i === 0 ? "#6b7a88" : "#b06a00"));
  if (m?.biegewange_auf) add(m.biegewange_auf.teile, "#1769aa");
  if (!polys.length) return '<div class="hinweis">Noch keine Werkzeug-Querschnitte eingetragen.</div>';
  const xs = [], ys = []; polys.forEach((o) => o.p.forEach((q) => { xs.push(+q[0] || 0); ys.push(+q[1] || 0); }));
  const x0 = Math.min(...xs, -20), x1 = Math.max(...xs, 40), y0 = Math.min(...ys, -20), y1 = Math.max(...ys, 40), w = breite || 340, sc = Math.min((w - 20) / (x1 - x0), 240 / (y1 - y0)), h = (y1 - y0) * sc + 20, X = (x) => 10 + (x - x0) * sc, Y = (y) => 10 + (y1 - y) * sc;
  const pg = polys.map((o) => `<polygon points="${o.p.map((q) => X(+q[0] || 0).toFixed(1) + "," + Y(+q[1] || 0).toFixed(1)).join(" ")}" fill="${o.farbe}" fill-opacity=".55" stroke="${o.farbe}" stroke-width="1"/>`).join("");
  return `<svg viewBox="0 0 ${w} ${h.toFixed(0)}" width="100%" style="max-width:${w}px;background:#fff;border:1px solid #cfd6dd;border-radius:8px" role="img" aria-label="Querschnitt der Maschine"><line x1="${X(x0)}" y1="${Y(0)}" x2="${X(x1)}" y2="${Y(0)}" stroke="#c4ccd4" stroke-dasharray="3 3"/><line x1="${X(0)}" y1="${Y(y0)}" x2="${X(0)}" y2="${Y(y1)}" stroke="#c4ccd4" stroke-dasharray="3 3"/>${pg}</svg><div class="hinweis">Grau: Unter- und Oberwange · Blau: Biegewange nach oben · gestrichelt: Biegekante (x 0) und Tischoberkante (y 0)</div>`;
}

// Kantenbausteine eines Flächenblechs: quellen = [{ name, schenkel: [{laenge, winkel}], mitPlatte: true, hinweise }] (erster Schenkel = Blechfläche vor der Kante)
export function biegenOeffnenQuellen(quellen, o) { if (!quellen.length) return status("Das Flächenblech hat noch keine Kante mit Baustein (Flansch, Umschlag …)."); bgaOeffnen(quellen[0].schenkel, { ...o, quellen }); }
