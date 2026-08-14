#[cfg(windows)]
mod platform {
    use std::env;
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use std::path::Path;

    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW,
        TH32CS_SNAPPROCESS,
    };
    use windows_sys::Win32::System::Threading::{
        GetCurrentProcessId, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
        QueryFullProcessImageNameW,
    };

    pub fn default_shell() -> (String, Vec<String>) {
        if let Some(shell) = parent_shell() {
            return shell;
        }
        let command = env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_owned());
        (command, vec!["/d".to_owned(), "/q".to_owned()])
    }

    fn parent_shell() -> Option<(String, Vec<String>)> {
        let mut process_id = unsafe { GetCurrentProcessId() };
        for _ in 0..8 {
            let parent_id = parent_process_id(process_id)?;
            let path = process_path(parent_id)?;
            let name = Path::new(&path)
                .file_name()?
                .to_string_lossy()
                .to_ascii_lowercase();
            match name.as_str() {
                "bash.exe" => return Some((path, vec!["--login".to_owned(), "-i".to_owned()])),
                "pwsh.exe" | "powershell.exe" => return Some((path, Vec::new())),
                "cmd.exe" => return Some((path, vec!["/d".to_owned(), "/q".to_owned()])),
                _ => process_id = parent_id,
            }
        }
        None
    }

    fn parent_process_id(process_id: u32) -> Option<u32> {
        unsafe {
            let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if snapshot.is_null() || snapshot == -1_isize as _ {
                return None;
            }
            let result = (|| {
                let mut entry = PROCESSENTRY32W {
                    dwSize: size_of::<PROCESSENTRY32W>() as u32,
                    ..Default::default()
                };
                if Process32FirstW(snapshot, &mut entry) == 0 {
                    return None;
                }
                loop {
                    if entry.th32ProcessID == process_id {
                        return Some(entry.th32ParentProcessID);
                    }
                    if Process32NextW(snapshot, &mut entry) == 0 {
                        return None;
                    }
                }
            })();
            CloseHandle(snapshot);
            result
        }
    }

    fn process_path(process_id: u32) -> Option<String> {
        unsafe {
            let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id);
            if process.is_null() {
                return None;
            }
            let result = (|| {
                let mut buffer = [0u16; 32_768];
                let mut length = buffer.len() as u32;
                if QueryFullProcessImageNameW(process, 0, buffer.as_mut_ptr(), &mut length) == 0 {
                    return None;
                }
                Some(
                    OsString::from_wide(&buffer[..length as usize])
                        .to_string_lossy()
                        .into_owned(),
                )
            })();
            CloseHandle(process);
            result
        }
    }
}

#[cfg(not(windows))]
mod platform {
    use std::env;

    pub fn default_shell() -> (String, Vec<String>) {
        (
            env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_owned()),
            Vec::new(),
        )
    }
}

pub use platform::default_shell;
