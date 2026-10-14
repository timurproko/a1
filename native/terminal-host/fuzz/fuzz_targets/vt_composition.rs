#![no_main]

use libfuzzer_sys::fuzz_target;
use terminal_host_contracts::ghostty::GhosttyTerminal;

// Rationale: arbitrary child output goes through the holder's terminal model and the frame the attach client
// composes from it, including a resize between chunks.
fuzz_target!(|data: &[u8]| {
    let Ok(mut terminal) = GhosttyTerminal::new(80, 24) else {
        return;
    };
    let split = data.len() / 2;
    terminal.write(&data[..split]);
    let _ = terminal.frame();
    let _ = terminal.resize(40 + (data.len() % 80) as u16, 10 + (data.len() % 30) as u16);
    terminal.write(&data[split..]);
    let _ = terminal.frame();
    let _ = terminal.scrollback_rows();
});