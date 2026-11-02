use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) == Some("--fixture-session-writer") {
        use std::io::{Read, Write};
        let Ok(_lease) = terminal_host_contracts::session_lock::SessionLock::acquire_location(std::path::Path::new(&args[2])) else { return ExitCode::from(3); };
        println!("writer-ready");
        std::io::stdout().flush().unwrap();
        let _ = std::io::stdin().read_to_end(&mut Vec::new());
        return ExitCode::SUCCESS;
    }
    let executable = match std::env::current_exe() {
        Ok(value) => value,
        Err(error) => {
            eprintln!("a1-terminal-host: resolve role-host fixture: {error}");
            return ExitCode::from(2);
        }
    };
    if let Err(error) = terminal_host_contracts::launch::set_host_command(
        &executable,
        std::iter::empty::<std::ffi::OsString>(),
        &executable,
    ) {
        eprintln!("a1-terminal-host: {error}");
        return ExitCode::from(2);
    }
    #[cfg(windows)]
    unsafe {
        windows_sys::Win32::Media::timeBeginPeriod(1);
    }
    let code =
        terminal_host_contracts::roles::entry::run_from_args(std::env::args().skip(1).collect());
    ExitCode::from(u8::try_from(code).unwrap_or(2))
}
