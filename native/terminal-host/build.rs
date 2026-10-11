use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

const GHOSTTY_COMMIT: &str = "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3";
const LOCAL_BUILD_OVERRIDE: &str = "TERMINAL_HOST_LOCAL_BUILD";

fn main() {
    println!("cargo:rerun-if-env-changed=CI");
    println!("cargo:rerun-if-env-changed={LOCAL_BUILD_OVERRIDE}");
    refuse_local_windows_build();
    println!("cargo:rerun-if-env-changed=ZIG");
    println!("cargo:rerun-if-env-changed=TERMINAL_HOST_CONTRACTS_ONLY");
    if env::var("TERMINAL_HOST_CONTRACTS_ONLY").as_deref() == Ok("1") {
        return;
    }
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=vendor/libghostty-vt/build.zig");
    println!("cargo:rerun-if-changed=vendor/libghostty-vt/build.zig.zon");
    println!("cargo:rerun-if-changed=vendor/libghostty-vt/include");
    println!("cargo:rerun-if-changed=vendor/libghostty-vt/src");
    println!("cargo:rerun-if-changed=vendor/libghostty-vt/VERSION");

    let manifest = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
    let source = manifest.join("vendor/libghostty-vt");
    let version = fs::read_to_string(source.join("VERSION"))
        .expect("read libghostty-vt VERSION")
        .trim()
        .to_owned();

    // Platform: Zig 0.15.2 has a Windows drive-letter path failure when this repository is
    // built from D:. Build from the system temporary directory on every CI target; the source
    // copy is stamped by commit and Cargo target so unlike targets never share output.
    let target = env::var("TARGET").expect("TARGET");
    let work = env::temp_dir().join(format!("a1-libghostty-vt-{GHOSTTY_COMMIT}-{target}"));
    let stamp = work.join(".a1-source-commit");
    if fs::read_to_string(&stamp).ok().as_deref() != Some(GHOSTTY_COMMIT) {
        if work.exists() {
            fs::remove_dir_all(&work).expect("remove stale libghostty-vt build source");
        }
        copy_dir(&source, &work);
        fs::write(&stamp, GHOSTTY_COMMIT).expect("write libghostty-vt source stamp");
    }

    let zig = env::var("ZIG").unwrap_or_else(|_| "zig".to_owned());
    let status = Command::new(zig)
        .current_dir(&work)
        .arg("build")
        .arg("-Demit-lib-vt")
        .arg("-Doptimize=ReleaseFast")
        .arg("-Dsimd=true")
        .arg("-Dtarget=native")
        .arg(format!("-Dversion-string={version}"))
        .arg("-Demit-xcframework=false")
        .status()
        .expect("run Zig for libghostty-vt");
    assert!(status.success(), "libghostty-vt Zig build failed: {status}");

    let lib_dir = work.join("zig-out/lib");
    println!("cargo:rustc-link-search=native={}", lib_dir.display());
    // Rationale: the binary's FFI declaration selects the platform archive, keeping the
    // independent contract library and Node addon from loading libghostty-vt.
}

// Platform: Zig's package fetch unpacks upstream test data, including a malformed JPEG that
// workstation antivirus quarantines along with the processes above it, which on a machine
// running A1 includes the installed process guardian. The build therefore runs in CI.
fn refuse_local_windows_build() {
    let set = |name: &str| env::var(name).is_ok_and(|value| !value.is_empty());
    if !cfg!(windows) || set("CI") || env::var(LOCAL_BUILD_OVERRIDE).as_deref() == Ok("1") {
        return;
    }
    eprintln!(
        "terminal-host builds run in GitHub CI (\"Native terminal host (Windows x64)\" job).\n\
         Push the branch and read the job result, or set {LOCAL_BUILD_OVERRIDE}=1 to build locally anyway."
    );
    std::process::exit(1);
}

fn copy_dir(source: &Path, target: &Path) {
    fs::create_dir_all(target).expect("create libghostty-vt build directory");
    for entry in fs::read_dir(source).expect("read libghostty-vt source") {
        let entry = entry.expect("read libghostty-vt entry");
        let name = entry.file_name();
        if matches!(
            name.to_string_lossy().as_ref(),
            ".git" | ".zig-cache" | "zig-out"
        ) {
            continue;
        }
        let from = entry.path();
        let to = target.join(&name);
        let kind = entry.file_type().expect("read libghostty-vt entry type");
        if kind.is_dir() {
            copy_dir(&from, &to);
        } else if kind.is_file() {
            fs::copy(&from, &to).expect("copy libghostty-vt source file");
        }
    }
}
