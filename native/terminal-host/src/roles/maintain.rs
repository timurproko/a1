//! The client half of `a1 tabs`: a bounded, non-interactive maintenance connection.
//!
//! It authenticates with the profile's client token as role `maintain`, never becomes a viewing
//! client or controller, and bounds every exchange so an unresponsive server is reported rather
//! than waited on forever.

use std::sync::mpsc;
use std::thread;
use std::time::Duration;

use crate::endpoint;
use crate::protocol;
use crate::roles::wire::{self, RoleHello};

#[derive(Debug, PartialEq, Eq)]
pub enum ConnectError {
    /// Nothing accepted the connection.
    NotRunning,
    /// A server answered with another protocol generation.
    IncompatibleGeneration,
    /// A server accepted the connection but did not complete the handshake in time.
    Unresponsive,
    /// The server refused the credential or the role.
    Refused(String),
}

pub struct Connection {
    stream: endpoint::EndpointStream,
    next_request: u64,
}

const HANDSHAKE: Duration = Duration::from_secs(4);

pub fn connect(address: &str, token: &[u8]) -> Result<Connection, ConnectError> {
    let mut stream = endpoint::connect(address).map_err(|_| ConnectError::NotRunning)?;
    // Platform: macOS refuses socket options once the peer has closed, and a server of another
    // generation answers and closes at once, so Unix bounds the read before sending the hello.
    #[cfg(unix)]
    endpoint::set_handshake_deadline(&stream, HANDSHAKE).map_err(|_| ConnectError::Unresponsive)?;
    wire::send(
        &mut stream,
        "hello",
        Some(1),
        RoleHello {
            role: "maintain".into(),
            generation: protocol::GENERATION,
            build: "a1".into(),
            features: vec![],
            token: token.to_vec(),
            tab_id: None,
            pid: Some(std::process::id()),
            start_identity: None,
            incarnation: 0,
            child_pid: None,
            child_start_identity: None,
            highest_epoch: 0,
        },
    )
    .map_err(|_| ConnectError::Unresponsive)?;
    // Platform: on Windows this waits for the welcome to arrive, so it follows the hello.
    #[cfg(windows)]
    endpoint::set_handshake_deadline(&stream, HANDSHAKE).map_err(|_| ConnectError::Unresponsive)?;
    let payload = match wire::read_payload(&mut stream) {
        Ok(Some(payload)) => payload,
        Ok(None) => return Err(ConnectError::Refused("server closed the handshake".into())),
        Err(_) => return Err(ConnectError::Unresponsive),
    };
    let kind = wire::kind(&payload).map_err(ConnectError::Refused)?;
    match kind.message_type.as_str() {
        "welcome" => {
            endpoint::clear_handshake_deadline(&stream).map_err(|_| ConnectError::Unresponsive)?;
            Ok(Connection {
                stream,
                next_request: 2,
            })
        }
        // Invariant: the server closes after this answer, so the deadline is not cleared.
        "incompatible-generation" => Err(ConnectError::IncompatibleGeneration),
        other => Err(ConnectError::Refused(format!("server answered {other}"))),
    }
}

impl Connection {
    /// Sends one request and waits at most `timeout` for its answer. `None` means the server
    /// did not answer in time.
    pub fn request(
        self,
        message_type: &str,
        body: serde_json::Value,
        timeout: Duration,
    ) -> Result<Option<(String, serde_json::Value, Connection)>, String> {
        let (tx, rx) = mpsc::channel();
        let message_type = message_type.to_owned();
        thread::spawn(move || {
            let mut connection = self;
            let request_id = connection.next_request;
            connection.next_request = connection.next_request.saturating_add(1);
            let result = (|| {
                wire::send(
                    &mut connection.stream,
                    &message_type,
                    Some(request_id),
                    body,
                )?;
                let payload = wire::read_payload(&mut connection.stream)?
                    .ok_or_else(|| "server closed the maintenance connection".to_owned())?;
                let kind = wire::kind(&payload)?;
                let (_, value): (_, serde_json::Value) = wire::body(&payload)?;
                Ok::<_, String>((kind.message_type, value))
            })();
            let _ = tx.send(result.map(|(kind, value)| (kind, value, connection)));
        });
        match rx.recv_timeout(timeout) {
            Ok(Ok(answer)) => Ok(Some(answer)),
            Ok(Err(error)) => Err(error),
            // Concurrency: the worker thread stays blocked on the unresponsive server and ends
            // with the process; the caller treats the server as unresponsive.
            Err(_) => Ok(None),
        }
    }
}
