//! Exact VT byte output for the outer terminal, with console encoding owned for its lifetime.

use std::io::{self, StdoutLock, Write};

#[cfg(windows)]
use windows_sys::Win32::{
    Storage::FileSystem::WriteFile,
    System::Console::{
        GetConsoleMode, GetConsoleOutputCP, GetStdHandle, STD_OUTPUT_HANDLE, SetConsoleOutputCP,
    },
};

/// Serializes terminal bytes without Windows stdout's UTF-16 console-write conversion.
pub(crate) struct TerminalOutput {
    stdout: StdoutLock<'static>,
    #[cfg(windows)]
    initialized: bool,
    #[cfg(windows)]
    original_code_page: Option<u32>,
}

impl TerminalOutput {
    /// Acquires the existing stdout lock; encoding setup errors propagate on the first write.
    pub(crate) fn new() -> Self {
        Self {
            stdout: io::stdout().lock(),
            #[cfg(windows)]
            initialized: false,
            #[cfg(windows)]
            original_code_page: None,
        }
    }

    #[cfg(windows)]
    fn prepare_console(&mut self) -> io::Result<()> {
        if self.initialized {
            return Ok(());
        }
        self.stdout.flush()?;
        let mut mode = 0;
        if unsafe { GetConsoleMode(GetStdHandle(STD_OUTPUT_HANDLE), &mut mode) } != 0 {
            let original = unsafe { GetConsoleOutputCP() };
            if unsafe { SetConsoleOutputCP(65001) } == 0 {
                return Err(io::Error::last_os_error());
            }
            self.original_code_page = Some(original);
        }
        self.initialized = true;
        Ok(())
    }
}

impl Write for TerminalOutput {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        #[cfg(windows)]
        {
            self.prepare_console()?;
            let mut written = 0;
            // Platform: match the solo UTF-8 VT stream. WriteConsoleW's conversion/chunking can
            // make ConPTY project a blank suffix past the margin and backspace the next glyph.
            let result = unsafe {
                WriteFile(
                    GetStdHandle(STD_OUTPUT_HANDLE),
                    bytes.as_ptr(),
                    bytes.len().min(u32::MAX as usize) as u32,
                    &mut written,
                    std::ptr::null_mut(),
                )
            };
            if result == 0 {
                return Err(io::Error::last_os_error());
            }
            Ok(written as usize)
        }
        #[cfg(not(windows))]
        self.stdout.write(bytes)
    }

    fn flush(&mut self) -> io::Result<()> {
        self.stdout.flush()
    }
}

#[cfg(windows)]
impl Drop for TerminalOutput {
    fn drop(&mut self) {
        if let Some(original) = self.original_code_page {
            // Invariant: a detached client must not leave its UTF-8 selection in the user's shell.
            unsafe { SetConsoleOutputCP(original) };
        }
    }
}
