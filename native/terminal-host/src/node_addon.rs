use napi::{Error, Result, Status};
use napi_derive::napi;

use crate::session_lock::SessionLock;

/// Opaque writer-held lease. The Node process owns the native descriptor directly.
#[napi(js_name = "SessionLock")]
pub struct NodeSessionLock {
    inner: Option<SessionLock>,
}

#[napi]
impl NodeSessionLock {
    #[napi(factory)]
    pub fn acquire(path: String) -> Result<Self> {
        SessionLock::acquire(path)
            .map(|lock| Self { inner: Some(lock) })
            .map_err(node_error)
    }

    #[napi]
    pub fn bind_created(&mut self, path: String) -> Result<()> {
        self.inner
            .as_mut()
            .ok_or_else(|| Error::new(Status::InvalidArg, "session lock was released"))?
            .bind_created(path)
            .map_err(node_error)
    }

    #[napi(getter)]
    pub fn bound(&self) -> bool {
        self.inner.as_ref().is_some_and(SessionLock::is_bound)
    }

    #[napi]
    pub fn release(&mut self) -> Result<()> {
        let lock = self
            .inner
            .take()
            .ok_or_else(|| Error::new(Status::InvalidArg, "session lock was already released"))?;
        lock.release();
        Ok(())
    }
}

fn node_error(error: impl std::fmt::Display) -> Error {
    Error::new(Status::GenericFailure, error.to_string())
}
