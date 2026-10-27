use std::path::PathBuf;

use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;

// Sucht nach einer neuen Version (GitHub-Release) und fragt, ob sie installiert werden soll.
// Die Oberfläche ruft das beim Start auf (abschaltbar in den Einstellungen) oder auf Knopfdruck.
// Ergebnis: "aktuell", "spaeter" oder (nach der Installation) Neustart.
async fn update_pruefen(app: &AppHandle) -> tauri_plugin_updater::Result<&'static str> {
    let Some(update) = app.updater()?.check().await? else {
        return Ok("aktuell");
    };
    let frage = format!(
        "Version {} ist verfügbar (installiert: {}).\n\nJetzt herunterladen und installieren? Das Programm startet danach neu.",
        update.version, update.current_version
    );
    let ja = app
        .dialog()
        .message(frage)
        .title("Update verfügbar")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom("Installieren".into(), "Später".into()))
        .blocking_show();
    if !ja {
        return Ok("spaeter");
    }
    update.download_and_install(|_, _| {}, || {}).await?;
    app.restart();
}

#[tauri::command]
async fn nach_update_suchen(app: AppHandle) -> Result<String, String> {
    update_pruefen(&app).await.map(String::from).map_err(|e| e.to_string())
}

#[derive(Serialize)]
struct Datei {
    pfad: String,
    name: String,
    inhalt: String,
}

fn lies(pfad: PathBuf) -> Result<Datei, String> {
    let inhalt = std::fs::read_to_string(&pfad).map_err(|e| format!("{}: {e}", pfad.display()))?;
    let name = pfad.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
    Ok(Datei { pfad: pfad.to_string_lossy().into_owned(), name, inhalt })
}

// Speichert Text. Ohne pfad fragt ein Speichern-Dialog nach dem Ort.
// Gibt den Pfad zurück, oder None, wenn abgebrochen wurde.
#[tauri::command]
async fn datei_speichern(
    app: AppHandle,
    name: String,
    inhalt: String,
    filter: String,
    endungen: Vec<String>,
    pfad: Option<String>,
) -> Result<Option<String>, String> {
    let ziel = match pfad {
        Some(p) => PathBuf::from(p),
        None => {
            let endungen: Vec<&str> = endungen.iter().map(String::as_str).collect();
            let Some(gewaehlt) = app.dialog().file().set_file_name(&name).add_filter(&filter, &endungen).blocking_save_file() else {
                return Ok(None);
            };
            gewaehlt.into_path().map_err(|e| e.to_string())?
        }
    };
    std::fs::write(&ziel, inhalt).map_err(|e| format!("{}: {e}", ziel.display()))?;
    Ok(Some(ziel.to_string_lossy().into_owned()))
}

#[tauri::command]
async fn datei_oeffnen(app: AppHandle, filter: String, endungen: Vec<String>) -> Result<Option<Datei>, String> {
    let endungen: Vec<&str> = endungen.iter().map(String::as_str).collect();
    let Some(gewaehlt) = app.dialog().file().add_filter(&filter, &endungen).blocking_pick_file() else {
        return Ok(None);
    };
    lies(gewaehlt.into_path().map_err(|e| e.to_string())?).map(Some)
}

// Zuletzt verwendetes Projekt direkt öffnen (nur Projekt-/Einstellungsdateien)
#[tauri::command]
fn datei_lesen(pfad: String) -> Result<Datei, String> {
    let p = PathBuf::from(&pfad);
    let endung = p.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
    if endung != "sdcad" && endung != "json" {
        return Err(format!("{pfad}: keine Projektdatei"));
    }
    lies(p)
}

// Datei, mit der das Programm gestartet wurde (Doppelklick auf eine .sdcad-Datei)
#[tauri::command]
fn startdatei() -> Result<Option<Datei>, String> {
    match std::env::args_os().nth(1).map(PathBuf::from) {
        Some(p) if p.is_file() => lies(p).map(Some),
        _ => Ok(None),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![datei_speichern, datei_oeffnen, datei_lesen, startdatei, nach_update_suchen])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten von Spengler Digital CAD");
}
