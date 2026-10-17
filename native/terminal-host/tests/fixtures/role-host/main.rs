use std::process::ExitCode;

fn main() -> ExitCode {
    let executable = match std::env::current_exe() {
        Ok(value) => value,
        Err(error) => {
            eprintln!("a1-terminal-host: resolve role-host fixture: {error}");
            return ExitCode::from(2);
        }
    };
    if let Err(error) = terminal_host_contracts::launch::set_host_command(
        executable,
        std::iter::empty::<std::ffi::OsString>(),
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
