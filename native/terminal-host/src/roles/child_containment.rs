#[cfg(unix)]
pub struct ChildContainment {
    process_group: i32,
}

#[cfg(unix)]
impl ChildContainment {
    pub fn acquire(pid: u32) -> Result<Self, String> {
        let pid = pid as i32;
        let group = unsafe { libc::getpgid(pid) };
        if group != pid {
            return Err(format!(
                "resident child is not its process-group leader: pid={pid} group={group}"
            ));
        }
        Ok(Self {
            process_group: group,
        })
    }
}

#[cfg(unix)]
impl Drop for ChildContainment {
    fn drop(&mut self) {
        unsafe {
            libc::kill(-self.process_group, libc::SIGKILL);
        }
    }
}

#[cfg(windows)]
pub struct ChildContainment {
    job: windows_sys::Win32::Foundation::HANDLE,
}

#[cfg(windows)]
impl ChildContainment {
    pub fn acquire(pid: u32) -> Result<Self, String> {
        use std::mem::size_of;
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::JobObjects::{
            AssignProcessToJobObject, CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectExtendedLimitInformation,
            SetInformationJobObject,
        };
        use windows_sys::Win32::System::Threading::{
            OpenProcess, PROCESS_SET_QUOTA, PROCESS_TERMINATE,
        };
        let job = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
        if job.is_null() {
            return Err(format!(
                "create resident child job: {}",
                std::io::Error::last_os_error()
            ));
        }
        let mut limits: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { std::mem::zeroed() };
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if unsafe {
            SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                &limits as *const _ as _,
                size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            )
        } == 0
        {
            unsafe {
                CloseHandle(job);
            }
            return Err(format!(
                "configure resident child job: {}",
                std::io::Error::last_os_error()
            ));
        }
        let process = unsafe { OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, pid) };
        if process.is_null() {
            unsafe {
                CloseHandle(job);
            }
            return Err(format!(
                "open resident child for containment: {}",
                std::io::Error::last_os_error()
            ));
        }
        let assigned = unsafe { AssignProcessToJobObject(job, process) };
        unsafe {
            CloseHandle(process);
        }
        if assigned == 0 {
            unsafe {
                CloseHandle(job);
            }
            return Err(format!(
                "assign resident child job: {}",
                std::io::Error::last_os_error()
            ));
        }
        Ok(Self { job })
    }
}

#[cfg(windows)]
impl Drop for ChildContainment {
    fn drop(&mut self) {
        unsafe {
            windows_sys::Win32::Foundation::CloseHandle(self.job);
        }
    }
}
