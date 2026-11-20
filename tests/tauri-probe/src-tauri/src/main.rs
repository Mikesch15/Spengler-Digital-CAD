// Probe-App: lädt die Prüfseite des CAD-Kerns (tests/cad-worker) in WebView2, nimmt das Ergebnis entgegen,
// schreibt es nach SDCAD_PROBE_OUT (oder ergebnis-tauri.json neben dem Programm) und beendet sich.
// Nach 240 s ohne Ergebnis: Zeitüberschreitung, Exitcode 3.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{env, fs, path::PathBuf, thread, time::Duration};

fn ziel() -> PathBuf {
    env::var("SDCAD_PROBE_OUT").map(PathBuf::from).unwrap_or_else(|_| {
        env::current_exe().ok().and_then(|p| p.parent().map(|d| d.join("ergebnis-tauri.json"))).unwrap_or_else(|| "ergebnis-tauri.json".into())
    })
}

#[tauri::command]
fn ergebnis(app: tauri::AppHandle, json: String) {
    let fehler = serde_json::from_str::<serde_json::Value>(&json).ok().and_then(|v| v["fehler"].as_i64()).unwrap_or(-1);
    let _ = fs::write(ziel(), &json);
    app.exit(if fehler == 0 { 0 } else { 1 });
}

fn main() {
    thread::spawn(|| {
        thread::sleep(Duration::from_secs(240));
        let _ = fs::write(ziel(), "{\"fehler\":-1,\"grund\":\"Zeitüberschreitung: Prüfseite hat kein Ergebnis geliefert\"}");
        std::process::exit(3);
    });
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ergebnis])
        .run(tauri::generate_context!())
        .expect("Tauri-Probe konnte nicht starten");
}
