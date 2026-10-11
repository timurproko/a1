#![no_main]

use libfuzzer_sys::fuzz_target;
use terminal_host_contracts::protocol::FrameDecoder;

fuzz_target!(|data: &[u8]| {
    let mut decoder = FrameDecoder::default();
    for chunk in data.chunks(1 + data.len() % 31) {
        let _ = decoder.push(chunk);
    }
});
