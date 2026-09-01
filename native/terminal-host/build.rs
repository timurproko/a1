use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

const GHOSTTY_COMMIT: &str = "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3";

fn main() {
    println!("cargo:rerun-if-env-changed=ZIG");
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
    // built from D:. Build from the system temporary directory instead; the
    // source copy is stamped with the pinned source commit.
    let work = env::temp_dir().join(format!("a1-libghostty-vt-{GHOSTTY_COMMIT}"));
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
        .arg("-Dtarget=x86_64-windows-msvc")
        .arg(format!("-Dversion-string={version}"))
        .arg("-Demit-xcframework=false")
        .status()
        .expect("run Zig for libghostty-vt");
    assert!(status.success(), "libghostty-vt Zig build failed: {status}");

    let lib_dir = work.join("zig-out/lib");
    println!("cargo:rustc-link-search=native={}", lib_dir.display());
    println!("cargo:rustc-link-lib=static=ghostty-vt-static");
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
