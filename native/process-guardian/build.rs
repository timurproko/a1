use std::env;

fn main() {
    let target = env::var("TARGET").expect("Cargo did not provide TARGET");
    if target.contains("apple") {
        // Platform: Node resolves N-API symbols when loading the addon on Darwin. Unit-test
        // executables carry the generated wrappers too, although the tests never invoke them.
        println!("cargo:rustc-cdylib-link-arg=-Wl,-undefined");
        println!("cargo:rustc-cdylib-link-arg=-Wl,dynamic_lookup");
        println!("cargo:rustc-link-arg-tests=-Wl,-undefined");
        println!("cargo:rustc-link-arg-tests=-Wl,dynamic_lookup");
    }
}
