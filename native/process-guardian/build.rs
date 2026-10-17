use std::env;

fn main() {
    let target = env::var("TARGET").expect("Cargo did not provide TARGET");
    if target.contains("apple") {
        // Platform: Node resolves N-API symbols when loading the addon on Darwin. The libtest
        // executable carries the generated wrappers too, although its tests never invoke them.
        // The generic link argument applies to both outputs; Cargo rejects the test-only form
        // because this package has no standalone integration-test target.
        println!("cargo:rustc-link-arg=-Wl,-undefined");
        println!("cargo:rustc-link-arg=-Wl,dynamic_lookup");
    }
}
