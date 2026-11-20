// Supabase-Zugang der Spengler-Digital-App (Konto, Berechtigung, cad_daten). `abruf` ist fetch (für Tests austauschbar).
// Nur das Sitzungs-Token wird gehalten, nie das Passwort. Der Schlüssel ist der öffentliche Schlüssel (RLS regelt den Zugriff).
export const URL_STANDARD = "https://nfgryuzkpwjfmdlmevuy.supabase.co";
export const SCHLUESSEL_STANDARD = "sb_publishable_U1YsWEdl4X9U94JO4sL5Lg_7_dU0erM";
export class CloudFehler extends Error { constructor(m, status = 0, art = "netz") { super(m); this.status = status; this.art = art; } }

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
    if (!r.ok) throw new CloudFehler(daten?.msg || daten?.message || daten?.error_description || `Serverfehler ${r.status}`, r.status, r.status === 401 || r.status === 403 ? "recht" : "server");
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
    this.sitzung = this._sitzung(d); await this._profil(); return this.sitzungOeffentlich();
  }
  _sitzung(d) { return { zugriff: d.access_token, erneuern: d.refresh_token, ablauf: Date.now() + (d.expires_in || 3600) * 1000, benutzerId: d.user?.id, email: d.user?.email, firma: null, name: null }; }
  async _profil() {
    const p = await this._roh(`/rest/v1/profiles?select=id,company_id,full_name&id=eq.${this.sitzung.benutzerId}`, { token: this.sitzung.zugriff });
    const z = Array.isArray(p) ? p[0] : null; if (!z?.company_id) throw new CloudFehler("Dem Konto ist keine Firma zugeordnet.", 0, "recht");
    this.sitzung.firma = z.company_id; this.sitzung.name = z.full_name || this.sitzung.email;
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
  async _mitToken(pfad, o = {}) { if (!this.sitzung) throw new CloudFehler("Nicht angemeldet.", 401, "recht"); return this._roh(pfad, { ...o, token: this.sitzung.zugriff }); }
  async darfBearbeiten(ressource = "vorlagen") { try { return (await this._mitToken("/rest/v1/rpc/has_permission", { methode: "POST", body: { p_resource: ressource, p_action: "edit" } })) === true; } catch (e) { if (e.art === "netz") throw e; return false; } }
  // cad_daten
  async liste(typen) { const t = typen ? `&typ=in.(${typen.join(",")})` : ""; return this._mitToken(`/rest/v1/cad_daten?select=typ,record_id,daten,version,schema_version,geloescht,updated_at&company_id=eq.${this.sitzung.firma}${t}`); }
  async anlegen(typ, id, daten, schemaVersion) { const r = await this._mitToken("/rest/v1/cad_daten", { methode: "POST", kopf: { Prefer: "return=representation" }, body: { company_id: this.sitzung.firma, typ, record_id: id, daten, version: 1, schema_version: schemaVersion, geloescht: false } }); return r?.[0]; }
  // optimistische Sperre: nur wenn die Cloud noch die erwartete Version hat; [] = Konflikt
  async aendern(typ, id, erwartet, daten, schemaVersion, geloescht = false) { const r = await this._mitToken(`/rest/v1/cad_daten?company_id=eq.${this.sitzung.firma}&typ=eq.${typ}&record_id=eq.${encodeURIComponent(id)}&version=eq.${erwartet}`, { methode: "PATCH", kopf: { Prefer: "return=representation" }, body: { daten, version: erwartet + 1, schema_version: schemaVersion, geloescht } }); return r?.[0] || null; }
}
