use super::*;
use std::sync::mpsc;
use std::thread;

fn pair() -> (EndpointStream, EndpointStream) {
    let name = format!(
        r"\\.\pipe\a1-completion-test-{}-{}",
        std::process::id(),
        rand::random::<u64>()
    );
    let mut listener = OwnerEndpoint::bind_name(name.clone()).unwrap();
    // Rationale: cover ERROR_PIPE_CONNECTED (the client arrives before accept).
    let client = connect(&name).unwrap();
    let server = listener.accept().unwrap();
    (server, client)
}
fn bounded(stream: &EndpointStream) {
    set_handshake_deadline(stream, Duration::from_secs(3)).unwrap();
}

#[test]
fn readiness_wait_has_no_polling_or_multimedia_timer_dependency() {
    let source = include_str!("../windows.rs");
    for forbidden in ["PeekNamedPipe", "thread::sleep", "timeBeginPeriod"] {
        assert!(
            !source.contains(forbidden),
            "readiness must not use {forbidden}"
        );
    }
    assert_eq!(wait_millis(None).unwrap(), INFINITE);
    assert_eq!(
        wait_millis(Some(Instant::now() - Duration::from_millis(1)))
            .unwrap_err()
            .kind(),
        io::ErrorKind::TimedOut
    );
}

#[test]
fn pending_accept_and_duplex_read_write_progress_without_readiness_sleep() {
    let name = format!(r"\\.\pipe\a1-pending-accept-{}", rand::random::<u64>());
    let mut listener = OwnerEndpoint::bind_name(name.clone()).unwrap();
    let accepted = thread::spawn(move || listener.accept().unwrap());
    let mut client = connect(&name).unwrap();
    let mut server = accepted.join().unwrap();
    bounded(&server);
    bounded(&client);
    let mut writer = server.try_clone().unwrap();
    let (ready_tx, ready_rx) = mpsc::channel();
    let reading = thread::spawn(move || {
        let _close = close_on_drop(&server);
        WAIT_ENTERED.with(|hook| *hook.borrow_mut() = Some(ready_tx));
        let mut reply = [0];
        server.read_exact(&mut reply).unwrap();
        assert_eq!(reply, [42]);
    });
    ready_rx.recv_timeout(Duration::from_secs(3)).unwrap();
    // Invariant: the client cannot answer until this independent server write reaches it. A shared
    // handle blocked behind the server read would deadlock here until the read deadline expires.
    writer.write_all(&[17]).unwrap();
    let mut request = [0];
    client.read_exact(&mut request).unwrap();
    assert_eq!(request, [17]);
    client.write_all(&[42]).unwrap();
    reading.join().unwrap();
}

#[test]
fn fragmented_frame_keeps_absolute_handshake_deadline_and_other_direction() {
    let (mut server, mut client) = pair();
    set_handshake_deadline(&server, Duration::from_millis(80)).unwrap();
    let mut writer = server.try_clone().unwrap();
    client.write_all(&[4, 0]).unwrap(); // Protocol: half a length prefix.
    let started = Instant::now();
    let failed = thread::spawn(move || crate::roles::wire::read_payload(&mut server).unwrap_err());
    writer.write_all(b"independent").unwrap();
    bounded(&client);
    let mut bytes = [0; 11];
    client.read_exact(&mut bytes).unwrap();
    assert_eq!(&bytes, b"independent");
    assert!(failed.join().unwrap().contains("deadline"));
    assert!(started.elapsed() < Duration::from_secs(2));
    // Invariant: cancelling the timed-out read did not close the independent writer.
    writer.write_all(b"ok").unwrap();
    let mut bytes = [0; 2];
    client.read_exact(&mut bytes).unwrap();
    assert_eq!(&bytes, b"ok");
}

#[test]
fn fragmented_body_expires_and_clearing_deadline_restores_ordinary_reads() {
    let (mut server, mut client) = pair();
    set_handshake_deadline(&server, Duration::from_millis(60)).unwrap();
    client.write_all(&[4, 0, 0, 0, 7]).unwrap();
    assert!(
        crate::roles::wire::read_payload(&mut server)
            .unwrap_err()
            .contains("deadline")
    );
    clear_handshake_deadline(&server).unwrap();
    client.write_all(&[3, 0, 0, 0, 8, 9, 10]).unwrap();
    assert_eq!(
        crate::roles::wire::read_payload(&mut server).unwrap(),
        Some(vec![8, 9, 10])
    );
}

#[test]
fn fragmented_transfer_and_frame_limits_remain_unchanged() {
    let (mut server, mut client) = pair();
    bounded(&server);
    let writer = thread::spawn(move || {
        for byte in [3, 0, 0, 0, 7, 8, 9] {
            client.write_all(&[byte]).unwrap();
        }
    });
    assert_eq!(
        crate::roles::wire::read_payload(&mut server).unwrap(),
        Some(vec![7, 8, 9])
    );
    writer.join().unwrap();
    let (mut server, mut client) = pair();
    bounded(&server);
    client
        .write_all(&((crate::protocol::MAX_FRAME_BYTES + 1) as u32).to_le_bytes())
        .unwrap();
    assert!(
        crate::roles::wire::read_payload(&mut server)
            .unwrap_err()
            .contains("frame")
    );
}

#[test]
fn owner_exit_cancels_pending_read_and_slow_write_without_affecting_other_peer() {
    let (mut server, client) = pair();
    let close = close_on_drop(&server);
    let weak = Arc::downgrade(&server.connection);
    let mut writer = server.try_clone().unwrap();
    let (read_tx, read_rx) = mpsc::channel();
    let (write_tx, write_rx) = mpsc::channel();
    let reading = thread::spawn(move || {
        WAIT_ENTERED.with(|hook| *hook.borrow_mut() = Some(read_tx));
        server.read(&mut [0; 1])
    });
    // Rationale: exceed pipe capacity; a peer that never reads cannot hold shutdown hostage.
    let writing = thread::spawn(move || {
        WAIT_ENTERED.with(|hook| *hook.borrow_mut() = Some(write_tx));
        writer.write_all(&vec![1; 1024 * 1024])
    });
    read_rx.recv_timeout(Duration::from_secs(3)).unwrap();
    write_rx.recv_timeout(Duration::from_secs(3)).unwrap();
    let (mut unaffected_server, mut unaffected_client) = pair();
    bounded(&unaffected_server);
    unaffected_client.write_all(b"live").unwrap();
    let mut bytes = [0; 4];
    unaffected_server.read_exact(&mut bytes).unwrap();
    assert_eq!(&bytes, b"live");
    drop(close);
    assert!(reading.join().unwrap().is_err());
    assert!(writing.join().unwrap().is_err());
    assert!(
        weak.upgrade().is_none(),
        "workers released connection custody"
    );
    drop(client);
}

#[test]
fn dropping_an_ordinary_clone_preserves_connection_and_peer_exit_wakes_reader() {
    let (mut server, mut client) = pair();
    bounded(&server);
    drop(server.try_clone().unwrap());
    client.write_all(b"a").unwrap();
    let mut byte = [0];
    server.read_exact(&mut byte).unwrap();
    assert_eq!(byte, [b'a']);
    drop(client);
    assert_eq!(server.read(&mut byte).unwrap(), 0);
}

#[test]
fn existing_and_new_connections_progress_after_one_simulated_wake_gap() {
    let (mut existing_server, mut existing_client) = pair();
    bounded(&existing_server);
    let mut previous = std::time::SystemTime::UNIX_EPOCH + Duration::from_secs(10);
    let after = previous + Duration::from_secs(3600);
    let mut repaints = 0;
    for now in [
        after,
        after + Duration::from_millis(8),
        after + Duration::from_millis(16),
    ] {
        repaints += usize::from(crate::roles::attach::take_resume_gap(&mut previous, now));
    }
    assert_eq!(repaints, 1);
    existing_client.write_all(b"old").unwrap();
    let mut old = [0; 3];
    existing_server.read_exact(&mut old).unwrap();
    assert_eq!(&old, b"old");
    let (mut new_server, mut new_client) = pair();
    bounded(&new_server);
    new_client.write_all(b"new").unwrap();
    let mut new = [0; 3];
    new_server.read_exact(&mut new).unwrap();
    assert_eq!(&new, b"new");
    assert!(!crate::roles::attach::take_resume_gap(
        &mut previous,
        after - Duration::from_secs(1)
    ));
}

#[test]
fn busy_endpoint_waits_for_an_available_instance_without_polling() {
    let name = format!(r"\\.\pipe\a1-busy-test-{}", rand::random::<u64>());
    let mut listener = OwnerEndpoint::bind_name(name.clone()).unwrap();
    let first = connect(&name).unwrap();
    let waiting = thread::spawn(move || connect(&name).unwrap());
    let _accepted_first = listener.accept().unwrap();
    let _accepted_next = listener.accept().unwrap();
    let _next = waiting.join().unwrap();
    drop(first);
}

#[test]
fn connection_and_operation_handles_are_not_inherited() {
    use windows_sys::Win32::Foundation::{GetHandleInformation, HANDLE_FLAG_INHERIT};
    let (server, client) = pair();
    let operation = Operation::new(&server.connection.pipe).unwrap();
    for handle in [
        &server.connection.pipe,
        &client.connection.pipe,
        &server.connection.closed,
        &operation._event,
    ] {
        let mut flags = 0;
        assert_ne!(unsafe { GetHandleInformation(raw(handle), &mut flags) }, 0);
        assert_eq!(flags & HANDLE_FLAG_INHERIT, 0);
    }
}

// Rationale: a fresh subprocess isolates this fixture from any multimedia timer request made
// by other tests. Also emits native (not .NET) echo timings without changing production budgets.
#[test]
fn timer_free_subprocess_and_repeated_reconnect_fixture() {
    let output = std::process::Command::new(std::env::current_exe().unwrap())
        .args([
            "--exact",
            "endpoint::windows::tests::timer_free_and_reconnect_child",
            "--ignored",
            "--nocapture",
        ])
        .output()
        .unwrap();
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        output.status.success(),
        "{stdout}\n{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(
        stdout.contains("test result: ok. 1 passed; 0 failed;"),
        "child fixture did not run: {stdout}"
    );
    print!("{stdout}");
}

// Rationale: only the parent fixture invokes this helper, in a fresh process with no timer request.
// The parent requires one passed child test, so filtering or accidentally skipping it fails coverage.
#[test]
#[ignore = "invoked by timer_free_subprocess_and_repeated_reconnect_fixture"]
fn timer_free_and_reconnect_child() {
    for requested in [false, true] {
        if requested {
            assert_eq!(unsafe { windows_sys::Win32::Media::timeBeginPeriod(1) }, 0);
        }
        let (mut server, mut client) = pair();
        bounded(&server);
        bounded(&client);
        let echo = thread::spawn(move || {
            for _ in 0..128 {
                let mut byte = [0];
                server.read_exact(&mut byte).unwrap();
                server.write_all(&byte).unwrap();
            }
        });
        let mut samples = Vec::new();
        for token in 0..128_u8 {
            let started = Instant::now();
            client.write_all(&[token]).unwrap();
            let mut byte = [0];
            client.read_exact(&mut byte).unwrap();
            assert_eq!(byte, [token]);
            samples.push(started.elapsed().as_secs_f64() * 1000.0);
        }
        echo.join().unwrap();
        samples.sort_by(f64::total_cmp);
        println!(
            "native completion echo timer_requested={requested} n=128 p50={:.3} p95={:.3} ms",
            samples[64], samples[121]
        );
        if requested {
            assert_eq!(unsafe { windows_sys::Win32::Media::timeEndPeriod(1) }, 0);
        }
    }
    fn handle_count() -> u32 {
        let mut count = 0;
        assert_ne!(
            unsafe {
                windows_sys::Win32::System::Threading::GetProcessHandleCount(
                    windows_sys::Win32::System::Threading::GetCurrentProcess(),
                    &mut count,
                )
            },
            0
        );
        count
    }
    let before = handle_count();
    for _ in 0..32 {
        let (mut server, mut client) = pair();
        bounded(&server);
        let close = close_on_drop(&server);
        let reader = thread::spawn(move || server.read(&mut [0]));
        drop(close);
        assert!(reader.join().unwrap().is_err());
        client.write_all(b"x").ok();
    }
    assert!(
        handle_count() <= before + 2,
        "reconnect leaked kernel handles"
    );
}
