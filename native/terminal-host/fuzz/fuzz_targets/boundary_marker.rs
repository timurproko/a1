#![no_main]

use libfuzzer_sys::fuzz_target;
use terminal_host_contracts::controller::{decode_boundary_marker, encode_boundary_marker};

fuzz_target!(|data: &[u8]| {
    let _ = decode_boundary_marker(data);
    if data.len() >= 24 {
        let generation = u64::from_le_bytes(data[..8].try_into().unwrap());
        let nonce: [u8; 16] = data[8..24].try_into().unwrap();
        let encoded = encode_boundary_marker(generation, nonce);
        assert_eq!(decode_boundary_marker(&encoded), Ok((generation, nonce)));
    }
});