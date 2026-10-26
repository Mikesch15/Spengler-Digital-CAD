use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;

// Sucht beim Start nach einer neuen Version (GitHub-Release) und fragt, ob sie installiert werden soll.
async fn nach_update_suchen(app: AppHandle) -> tauri_plugin_updater::Result<()> {
    let Some(update) = app.updater()?.check().await? else {
        return Ok(());
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
    if ja {
        update.download_and_install(|_, _| {}, || {}).await?;
        app.restart();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = nach_update_suchen(handle).await {
                    eprintln!("Update-Prüfung fehlgeschlagen: {e}");
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten von Spengler Digital CAD");
}
