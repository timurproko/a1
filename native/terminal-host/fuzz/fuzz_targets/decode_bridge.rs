#![no_main]

use libfuzzer_sys::fuzz_target;
use terminal_host_contracts::protocol::{
    BridgeHeartbeat, BridgeRequest, BridgeStatus, Envelope, decode_payload,
};

fuzz_target!(|data: &[u8]| {
    let _ = decode_payload::<Envelope<BridgeStatus>>(data);
    let _ = decode_payload::<Envelope<BridgeRequest>>(data);
    let _ = decode_payload::<Envelope<BridgeHeartbeat>>(data);
});