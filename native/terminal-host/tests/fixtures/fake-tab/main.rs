use std::io::{BufRead, Read, Write};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let mode = std::env::var("TERMINAL_HOST_FAKE_TAB_MODE").unwrap_or_else(|_| "echo".into());
    match mode.as_str() {
        "exit" => std::process::exit(17),
        "hang" => loop {
            thread::sleep(Duration::from_secs(60));
        },
        "grandchild" => {
            let executable = std::env::current_exe().expect("fake-tab executable");
            let _child = Command::new(executable)
                .env("TERMINAL_HOST_FAKE_TAB_MODE", "hang")
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .expect("fake-tab grandchild");
            run_echo(false);
        }
        "stream" => run_stream(false),
        "progress" => run_progress(),
        "stop-reading" => run_stream(true),
        "ignore-shutdown" => run_echo(true),
        _ => run_echo(false),
    }
}

fn run_echo(ignore_shutdown: bool) {
    let stdin = std::io::stdin();
    let mut stdout = std::io::stdout().lock();
    writeln!(stdout, "fake-tab-ready\r").expect("ready");
    stdout.flush().expect("flush ready");
    for line in stdin.lock().lines() {
        let line = line.expect("read input");
        if !ignore_shutdown && line.as_bytes() == [4] {
            return;
        }
        writeln!(stdout, "echo:{line}\r").expect("echo");
        stdout.flush().expect("flush echo");
    }
    if ignore_shutdown {
        loop {
            thread::sleep(Duration::from_secs(60));
        }
    }
}

/// Advances a counter in place and, once far enough along, prints a line and drops a marker file in
/// its working directory, so a test can tell when the tab has produced output nobody has seen yet.
fn run_progress() {
    let mut stdout = std::io::stdout().lock();
    writeln!(stdout, "fake-tab-ready\r").expect("ready");
    for tick in 1_u64.. {
        if tick == 50 {
            writeln!(stdout, "\r\nprogress-reached\r").expect("progress line");
            stdout.flush().expect("flush progress line");
            std::fs::write("fake-tab-progress-reached", b"reached\n").expect("progress marker");
        }
        write!(stdout, "\rtick:{tick:08}").expect("tick");
        stdout.flush().expect("flush tick");
        thread::sleep(Duration::from_millis(20));
    }
}

fn run_stream(stop_reading: bool) {
    let (tx, rx) = mpsc::channel::<Vec<u8>>();
    if !stop_reading {
        thread::spawn(move || {
            let mut stdin = std::io::stdin();
            let mut buffer = [0_u8; 4096];
            while let Ok(count) = stdin.read(&mut buffer) {
                if count == 0 {
                    break;
                }
                let _ = tx.send(buffer[..count].to_vec());
            }
        });
    }
    let bytes_per_tick = std::env::var("TERMINAL_HOST_FAKE_TAB_STREAM_BYTES")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(4096)
        .clamp(1, 1024 * 1024);
    let payload = vec![b'x'; bytes_per_tick];
    let mut stdout = std::io::stdout().lock();
    writeln!(stdout, "fake-tab-ready\r").expect("ready");
    loop {
        while let Ok(input) = rx.try_recv() {
            stdout.write_all(b"echo:").expect("echo prefix");
            stdout.write_all(&input).expect("echo input");
        }
        stdout.write_all(&payload).expect("stream");
        stdout.write_all(b"\r\n").expect("stream line");
        stdout.flush().expect("flush stream");
        thread::sleep(Duration::from_millis(10));
    }
}
