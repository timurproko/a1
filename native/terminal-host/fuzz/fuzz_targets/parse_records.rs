#![no_main]

use libfuzzer_sys::fuzz_target;
use terminal_host_contracts::roles::registry::RegistryStore;
use terminal_host_contracts::roles::release_holds::parse_owner_marker;

fuzz_target!(|data: &[u8]| {
    let _ = RegistryStore::parse(data);
    let _ = parse_owner_marker(data);
});