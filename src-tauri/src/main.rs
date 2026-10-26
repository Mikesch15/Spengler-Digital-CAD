// Kein Konsolenfenster im Release-Build unter Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    spengler_digital_cad_lib::run()
}
