// Supabase-Zugang der Spengler-Digital-App (Konto, Berechtigung, cad_daten). `abruf` ist fetch (für Tests austauschbar).
// Nur das Sitzungs-Token wird gehalten, nie das Passwort. Der Schlüssel ist der öffentliche Schlüssel (RLS regelt den Zugriff).
export const URL_STANDARD = "https://nfgryuzkpwjfmdlmevuy.supabase.co";
export const SCHLUESSEL_STANDARD = "sb_publishable_U1YsWEdl4X9U94JO4sL5Lg_7_dU0erM";
export class CloudFehler extends Error { constructor(m, status = 0, art = "netz", code = null) { super(m); this.status = status; this.art = art; this.code = code; } }

export class CloudClient {
  constructor({ url = URL_STANDARD, schluessel = SCHLUESSEL_STANDARD, abruf = (...a) => globalThis.fetch(...a), sitzung = null } = {}) {
    Object.assign(this, { url: url.replace(/\/$/, ""), schluessel, abruf, sitzung });
  }
  async _roh(pfad, { methode = "GET", body, token, kopf = {} } = {}) {
    let r;
    try {
      r = await this.abruf(this.url + pfad, { method: methode, headers: { apikey: this.schluessel, Authorization: `Bearer ${token || this.schluessel}`, "Content-Type": "application/json", ...kopf }, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) { throw new CloudFehler("Keine Verbindung zum Server (offline?).", 0, "netz"); }
    const text = await r.text(); let daten = null; try { daten = text ? JSON.parse(text) : null; } catch { daten = text; }
    if (!r.ok) throw new CloudFehler(daten?.msg || daten?.message || daten?.error_description || `Serverfehler ${r.status}`, r.status, r.status === 401 || r.status === 403 ? "recht" : "server", daten?.code ?? null);
    return daten;
  }
  // Anmeldung: «Vorname.Nachname» oder E-Mail; Rückfall auf die Edge Function, die den Namen auflöst
  async anmelden(name, passwort) {
    name = String(name).trim();
    const mail = name.includes("@") ? name : `${name.toLowerCase()}@nfgryuzkpwjfmdlmevuy.supabase.co`;
    let d;
    try { d = await this._roh("/auth/v1/token?grant_type=password", { methode: "POST", body: { email: mail, password: passwort } }); }
    catch (e) {
      if (e.art !== "recht" && e.status !== 400) throw e;
      if (name.includes("@")) throw new CloudFehler("Name oder Passwort falsch.", e.status, "recht");
      let aufg; try { aufg = await this._roh("/functions/v1/resolve-login-email", { methode: "POST", body: { username: name } }); } catch { throw new CloudFehler("Name oder Passwort falsch.", e.status, "recht"); }
      if (!aufg?.email) throw new CloudFehler("Name oder Passwort falsch.", e.status, "recht");
      try { d = await this._roh("/auth/v1/token?grant_type=password", { methode: "POST", body: { email: aufg.email, password: passwort } }); } catch { throw new CloudFehler("Name oder Passwort falsch.", 400, "recht"); }
    }
    this.sitzung = this._sitzung(d);
    try { await this._profil(); } catch (e) { this.sitzung = null; throw e; }
    return this.sitzungOeffentlich();
  }
  _sitzung(d) { return { zugriff: d.access_token, erneuern: d.refresh_token, ablauf: Date.now() + (d.expires_in || 3600) * 1000, benutzerId: d.user?.id, email: d.user?.email, firma: null, name: null }; }
  async _profil() {
    // Tabelle profiles: id, first_name, last_name, company_id, … (kein full_name)
    const p = await this._roh(`/rest/v1/profiles?select=id,company_id,first_name,last_name&id=eq.${this.sitzung.benutzerId}`, { token: this.sitzung.zugriff });
    const z = Array.isArray(p) ? p[0] : null; if (!z?.company_id) throw new CloudFehler("Dem Konto ist keine Firma zugeordnet.", 0, "recht");
    this.sitzung.firma = z.company_id; this.sitzung.name = [z.first_name, z.last_name].filter(Boolean).join(" ") || this.sitzung.email;
    try { const c = await this._roh(`/rest/v1/companies?select=name&id=eq.${z.company_id}`, { token: this.sitzung.zugriff }); this.sitzung.firmaName = c?.[0]?.name || ""; } catch { this.sitzung.firmaName = ""; }
  }
  // gespeicherte Sitzung (nur Token) wiederherstellen; bei Ablauf erneuern
  async wiederherstellen(s) {
    this.sitzung = s; if (!s) return null;
    if (Date.now() > s.ablauf - 60000) { try { const d = await this._roh("/auth/v1/token?grant_type=refresh_token", { methode: "POST", body: { refresh_token: s.erneuern } }); this.sitzung = { ...s, ...this._sitzung(d), firma: s.firma, name: s.name, firmaName: s.firmaName }; } catch (e) { if (e.art === "netz") throw e; this.sitzung = null; return null; } }
    return this.sitzungOeffentlich();
  }
  abmelden() { this.sitzung = null; }
  sitzungOeffentlich() { const s = this.sitzung; return s && { zugriff: s.zugriff, erneuern: s.erneuern, ablauf: s.ablauf, benutzerId: s.benutzerId, email: s.email, firma: s.firma, firmaName: s.firmaName, name: s.name }; }
  get angemeldet() { return !!this.sitzung; }
  async _mitToken(pfad, o = {}) { if (!this.sitzung) throw new CloudFehler("Nicht angemeldet.", 401, "recht"); if (!this.sitzung.firma && /company_id|cad_/.test(pfad)) throw new CloudFehler("Dem Konto ist keine Firma zugeordnet – bitte neu anmelden.", 401, "recht"); return this._roh(pfad, { ...o, token: this.sitzung.zugriff }); }
  async darfBearbeiten(ressource = "vorlagen") { try { return (await this._mitToken("/rest/v1/rpc/has_permission", { methode: "POST", body: { p_resource: ressource, p_action: "edit" } })) === true; } catch (e) { if (e.art === "netz") throw e; return false; } }
  // cad_daten
  async liste(typen) { const t = typen ? `&typ=in.(${typen.join(",")})` : ""; return this._mitToken(`/rest/v1/cad_daten?select=typ,record_id,daten,version,schema_version,geloescht,updated_at&company_id=eq.${this.sitzung.firma}${t}`); }
  async anlegen(typ, id, daten, schemaVersion) { const r = await this._mitToken("/rest/v1/cad_daten", { methode: "POST", kopf: { Prefer: "return=representation" }, body: { company_id: this.sitzung.firma, typ, record_id: id, daten, version: 1, schema_version: schemaVersion, geloescht: false } }); return r?.[0]; }
  // optimistische Sperre: nur wenn die Cloud noch die erwartete Version hat; [] = Konflikt
  async aendern(typ, id, erwartet, daten, schemaVersion, geloescht = false) { const r = await this._mitToken(`/rest/v1/cad_daten?company_id=eq.${this.sitzung.firma}&typ=eq.${typ}&record_id=eq.${encodeURIComponent(id)}&version=eq.${erwartet}`, { methode: "PATCH", kopf: { Prefer: "return=representation" }, body: { daten, version: erwartet + 1, schema_version: schemaVersion, geloescht } }); return r?.[0] || null; }
  // ---- Cloud-Projekte (cad_projekte) ----
  async projekte({ auftrag = null, nurMeine = false } = {}) {
    const f = [`company_id=eq.${this.sitzung.firma}`, "geloescht=eq.false"]; if (auftrag) f.push(`auftrag=eq.${encodeURIComponent(auftrag)}`); if (nurMeine) f.push(`besitzer=eq.${this.sitzung.benutzerId}`);
    return this._mitToken(`/rest/v1/cad_projekte?select=id,auftrag,name,version,besitzer,erstellt,geaendert,geaendert_von&${f.join("&")}&order=geaendert.desc`);
  }
  async projektLaden(id) { const r = await this._mitToken(`/rest/v1/cad_projekte?select=*&id=eq.${id}`); if (!r?.[0]) throw new CloudFehler("Projekt nicht gefunden.", 404, "server"); return r[0]; }
  async projektAnlegen({ name, auftrag = null, daten }) { const r = await this._mitToken("/rest/v1/cad_projekte", { methode: "POST", kopf: { Prefer: "return=representation" }, body: { company_id: this.sitzung.firma, name, auftrag, daten, version: 1, schema_version: 1, geloescht: false } }); return r?.[0]; }
  // Speichern nur auf der erwarteten Version; null = jemand anderes war schneller (Konflikt)
  async projektSpeichern(id, erwartet, { name, auftrag, daten, geloescht = false }) { const r = await this._mitToken(`/rest/v1/cad_projekte?id=eq.${id}&version=eq.${erwartet}`, { methode: "PATCH", kopf: { Prefer: "return=representation" }, body: { name, auftrag, daten, version: erwartet + 1, geloescht } }); return r?.[0] || null; }
  // ---- Verbindung zur Spengler-Digital-App ----
  // Projekte der App (Tabelle projects): Auftragsnummer = order_no
  async appProjekte({ archiviert = false } = {}) { return this._mitToken(`/rest/v1/projects?select=id,name,order_no,customer,object,hinweis,status,archived,updated_at${archiviert ? "" : "&archived=eq.false"}&order=name.asc&limit=1000`); }
  async appProjekt(id) { const r = await this._mitToken(`/rest/v1/projects?select=id,name,order_no,customer,object,hinweis,status,archived,updated_at&id=eq.${encodeURIComponent(id)}`); return r?.[0] || null; }
  // Anlegen/Ändern direkt in der Tabelle der App (created_by, updated_by, updated_at setzt die Datenbank); Auftrags-Nr. ist je Firma einmalig
  async appProjektNeu(f) { try { const r = await this._mitToken("/rest/v1/projects", { methode: "POST", kopf: { Prefer: "return=representation" }, body: this._projektFelder(f) }); return r?.[0]; } catch (e) { throw this._projektFehler(e); } }
  // Nur wenn das Projekt seit dem Laden unverändert ist (updated_at); null = in der App inzwischen geändert
  async appProjektAendern(id, erwartetUpdatedAt, f) { try { const r = await this._mitToken(`/rest/v1/projects?id=eq.${encodeURIComponent(id)}&updated_at=eq.${encodeURIComponent(erwartetUpdatedAt)}`, { methode: "PATCH", kopf: { Prefer: "return=representation" }, body: { ...this._projektFelder(f), ...(f.archived !== undefined ? { archived: !!f.archived } : {}) } }); return r?.[0] || null; } catch (e) { throw this._projektFehler(e); } }
  _projektFelder(f) { const o = { name: String(f.name).trim(), order_no: String(f.order_no).trim(), customer: String(f.customer ?? "").trim(), object: String(f.object).trim() }; if (f.hinweis !== undefined) o.hinweis = f.hinweis || null; if (f.status) o.status = f.status; return o; }
  _projektFehler(e) { return e.code === "23505" || /duplicate|projects_firma_auftragsnr/i.test(e.message) ? new CloudFehler("Diese Auftrags-Nr. gibt es in der App schon.", e.status, "doppelt", e.code) : e; }
  // CAD → App: Zuschnittteile (Tabelle cad_teile); die App übernimmt sie in die Aufmasse des Projekts (Auftrag)
  async teileSenden(auftrag, teile) {
    // Spalten laut Tabelle cad_teile: Textspalten sind NOT NULL (leer statt null), Längen begrenzt, company_id kommt vom Server (my_company_id())
    const text = (v, n) => String(v ?? "").slice(0, n);
    if (!String(auftrag || "").trim()) throw new CloudFehler("Die Auftragsnummer fehlt.", 0, "eingabe");
    const zeilen = teile.map((t, i) => ({ auftrag: text(auftrag, 40), teil_nr: t.nr ?? i + 1, teil_label: text(t.label, 60), name: text(t.name, 200), material_name: text(t.material, 200), staerke_mm: t.staerke ?? null,
      zuschnitt_breite_mm: t.breite ?? null, zuschnitt_laenge_mm: t.laenge ?? null, flaeche_mm2: t.flaeche ?? null, stueck: Math.max(0, Math.round(t.stueck ?? 1)), vorlage_name: text(t.vorlage, 200), dokument: text(t.dokument, 200),
      project_id: t.projectId ?? null, operationen: t.operationen ?? [], app_data: t.appData ?? {}, addin_version: text(t.version ?? "Spengler Digital CAD", 40) }));
    return this._mitToken("/rest/v1/cad_teile", { methode: "POST", kopf: { Prefer: "return=representation" }, body: zeilen });
  }
  // App → CAD: offene Profilaufträge (z. B. Aufmass-Profile, die im CAD gebaut werden sollen)
  async profilAuftraege(projektId = null) { return this._mitToken(`/rest/v1/cad_profil_auftraege?select=*&status=eq.offen${projektId ? `&project_id=eq.${projektId}` : ""}&order=created_at.desc`); }
  async profilAuftragGebaut(id) { const r = await this._mitToken(`/rest/v1/cad_profil_auftraege?id=eq.${id}&status=eq.offen`, { methode: "PATCH", kopf: { Prefer: "return=representation" }, body: { status: "gebaut", gebaut_am: new Date().toISOString() } }); return r?.[0] || null; }
}
