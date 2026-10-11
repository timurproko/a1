use std::path::PathBuf;

fn main() {
    let output = std::env::args_os()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("native/terminal-host/protocol/fixtures.json"));
    let manifest =
        a1_session_lock::protocol::fixture_manifest_json().expect("generate protocol fixtures");
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent).expect("create fixture directory");
    }
    std::fs::write(&output, manifest).expect("write protocol fixture manifest");
    println!("wrote {}", output.display());
}
