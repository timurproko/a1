mod build_target;
mod build_vt_manifest;

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use build_vt_manifest::{VT_MANIFEST, VtIdentity};

const GHOSTTY_COMMIT: &str = "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3";
const LOCAL_BUILD_OVERRIDE: &str = "TERMINAL_HOST_LOCAL_BUILD";
/// Directory that receives the linked library, its headers, and its manifest after a Zig build.
const EXPORT_VT: &str = "TERMINAL_HOST_EXPORT_VT";
/// Directory of a CI-published library that a local development build links instead of running Zig.
const PREBUILT_VT: &str = "TERMINAL_HOST_PREBUILT_VT";

fn main() {
    println!("cargo:rerun-if-env-changed=CI");
    println!("cargo:rerun-if-env-changed={LOCAL_BUILD_OVERRIDE}");
    println!("cargo:rerun-if-env-changed={EXPORT_VT}");
    println!("cargo:rerun-if-env-changed={PREBUILT_VT}");
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
    println!("cargo:rerun-if-changed=build_vt_manifest.rs");
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
    let identity = VtIdentity {
        version: &version,
        ghostty_commit: GHOSTTY_COMMIT,
        cargo_target: &target,
        zig_target: zig_target.triple,
        zig_cpu: zig_target.cpu,
    };

    let lib_dir = match prebuilt_directory() {
        Some(prebuilt) => link_prebuilt(&prebuilt, &identity),
        None => build_library(&source, &target, &version, &zig_target, &identity),
    };
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

// Security: only a local development build (no `CI`, explicit local opt-in) reads the override,
// so CI and release builds always link the library their own Zig build produced.
fn prebuilt_directory() -> Option<PathBuf> {
    let prebuilt = env::var_os(PREBUILT_VT).filter(|value| !value.is_empty())?;
    let ci = env::var_os("CI").is_some_and(|value| !value.is_empty());
    if ci || env::var(LOCAL_BUILD_OVERRIDE).as_deref() != Ok("1") {
        println!(
            "cargo:warning={PREBUILT_VT} is ignored outside a local development build ({LOCAL_BUILD_OVERRIDE}=1 without CI)"
        );
        return None;
    }
    Some(PathBuf::from(prebuilt))
}

// Invariant: a mismatched or altered library fails the build in one line and never falls back to
// Zig, so a developer never links bytes other than the published ones without noticing.
fn link_prebuilt(prebuilt: &Path, identity: &VtIdentity) -> PathBuf {
    println!(
        "cargo:rerun-if-changed={}",
        prebuilt.join(VT_MANIFEST).display()
    );
    println!("cargo:rerun-if-changed={}", prebuilt.join("lib").display());
    match build_vt_manifest::verify_prebuilt(prebuilt, identity) {
        Ok(lib_dir) => lib_dir,
        Err(message) => {
            eprintln!("{message}");
            std::process::exit(1);
        }
    }
}

fn build_library(
    source: &Path,
    target: &str,
    version: &str,
    zig_target: &build_target::ZigTarget,
    identity: &VtIdentity,
) -> PathBuf {
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
        copy_dir(source, &work);
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
    if let Some(export) = env::var_os(EXPORT_VT).filter(|value| !value.is_empty()) {
        export_library(
            &lib_dir,
            &source.join("include"),
            Path::new(&export),
            identity,
        );
        // Invariant: a cached build whose export was removed reruns this script and exports again.
        println!(
            "cargo:rerun-if-changed={}",
            Path::new(&export).join(VT_MANIFEST).display()
        );
    }
    lib_dir
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
         Push the branch and read the job result, set {PREBUILT_VT} with {LOCAL_BUILD_OVERRIDE}=1 to link\n\
         a published library (scripts/development/fetch-terminal-vt.mjs), or set {LOCAL_BUILD_OVERRIDE}=1 to build locally anyway."
    );
    std::process::exit(1);
}

// Rationale: CI publishes exactly the library it linked, so a later development build can link
// those bytes without running Zig; the manifest binds them to the vendored version and target.
fn export_library(lib_dir: &Path, include: &Path, export: &Path, identity: &VtIdentity) {
    if export.exists() {
        fs::remove_dir_all(export).expect("remove stale terminal library export");
    }
    let exported_lib = export.join("lib");
    fs::create_dir_all(&exported_lib).expect("create terminal library export");
    let mut names: Vec<_> = fs::read_dir(lib_dir)
        .expect("read libghostty-vt output")
        .map(|entry| entry.expect("read libghostty-vt output entry"))
        .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_file()))
        .map(|entry| entry.file_name().to_string_lossy().into_owned())
        .collect();
    names.sort();
    let mut files = Vec::new();
    for name in names {
        let bytes = fs::read(lib_dir.join(&name)).expect("read libghostty-vt library");
        fs::write(exported_lib.join(&name), &bytes).expect("export libghostty-vt library");
        files.push((name, build_vt_manifest::sha256_hex(&bytes)));
    }
    copy_dir(include, &export.join("include"));
    fs::write(
        export.join(VT_MANIFEST),
        build_vt_manifest::render_manifest(identity, &files),
    )
    .expect("write terminal library manifest");
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
