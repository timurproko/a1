mod build_target;

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
    let target = env::var("TARGET").expect("TARGET");
    let zig_target = build_target::resolve(&target)
        .unwrap_or_else(|| panic!("unsupported terminal-host Cargo target: {target}"));
    println!(
        "cargo:rustc-env=TERMINAL_HOST_ZIG_TARGET={}",
        zig_target.triple
    );
    println!("cargo:rustc-env=TERMINAL_HOST_ZIG_CPU={}", zig_target.cpu);
    if env::var("TERMINAL_HOST_CONTRACTS_ONLY").as_deref() == Ok("1") {
        return;
    }
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=build_target.rs");
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
    // copy is stamped by commit, exact target, and CPU policy so stale native output is removed.
    let work = env::temp_dir().join(format!("a1-libghostty-vt-{GHOSTTY_COMMIT}-{target}"));
    let stamp = work.join(".a1-source-commit");
    let build_identity = format!(
        "{GHOSTTY_COMMIT}:{target}:{}:{}",
        zig_target.triple, zig_target.cpu
    );
    if fs::read_to_string(&stamp).ok().as_deref() != Some(build_identity.as_str()) {
        if work.exists() {
            fs::remove_dir_all(&work).expect("remove stale libghostty-vt build source");
        }
        copy_dir(&source, &work);
        fs::write(&stamp, build_identity).expect("write libghostty-vt source stamp");
    }

    let zig = env::var("ZIG").unwrap_or_else(|_| "zig".to_owned());
    let status = Command::new(zig)
        .current_dir(&work)
        .arg("build")
        .arg("-Demit-lib-vt")
        .arg("-Doptimize=ReleaseFast")
        .arg("-Dsimd=true")
        .arg(format!("-Dtarget={}", zig_target.triple))
        .arg(format!("-Dcpu={}", zig_target.cpu))
        .arg(format!("-Dversion-string={version}"))
        .arg("-Demit-xcframework=false")
        .status()
        .expect("run Zig for libghostty-vt");
    assert!(status.success(), "libghostty-vt Zig build failed: {status}");

    let lib_dir = work.join("zig-out/lib");
    println!("cargo:rustc-link-search=native={}", lib_dir.display());
    if target.contains("windows") {
        // Platform: MSVC must resolve Zig and Rust compiler intrinsics through normal archive
        // selection; appending the archive as a raw link argument creates weak-symbol conflicts.
        println!("cargo:rustc-link-lib=static=ghostty-vt-static");
    } else {
        // Rationale: an exact binary-only archive argument avoids the adjacent shared library on
        // macOS while keeping the independent contract library and Node addon free of Ghostty.
        let archive = lib_dir.join("libghostty-vt.a");
        assert!(
            archive.is_file(),
            "libghostty-vt archive is unavailable: {}",
            archive.display()
        );
        println!(
            "cargo:rustc-link-arg-bin=terminal-host={}",
            archive.display()
        );
    }
    if target.contains("apple") && env::var_os("CARGO_FEATURE_NODE_ADDON").is_some() {
        // Platform: Node resolves N-API symbols when loading an addon on Darwin.
        println!("cargo:rustc-cdylib-link-arg=-Wl,-undefined");
        println!("cargo:rustc-cdylib-link-arg=-Wl,dynamic_lookup");
    }
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
