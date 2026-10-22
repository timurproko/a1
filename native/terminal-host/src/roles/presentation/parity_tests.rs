//! Compare terminal-generated frames, not hand-authored surface rows, across every replay boundary.
use super::*;
use crate::ghostty::{GhosttyTerminal, RetainedSurfaceBuilder};
use crate::protocol::{SurfaceCommitKind, SurfaceLink};

fn capture(
    terminal: &mut GhosttyTerminal,
    builder: &mut RetainedSurfaceBuilder,
) -> StructuredSurface {
    let surface = terminal
        .capture_retained_surface(builder, 1, SurfaceCommitKind::Complete)
        .unwrap()
        .structured()
        .unwrap();
    // Invariant: exercise the actual structured wire representation as well as the local retained form.
    rmp_serde::from_slice(&rmp_serde::to_vec_named(&surface).unwrap()).unwrap()
}

fn cells(
    surface: &StructuredSurface,
    skip: usize,
) -> Vec<Vec<(String, u8, SurfaceStyle, Option<SurfaceLink>)>> {
    surface
        .row_data
        .iter()
        .skip(skip)
        .map(|row| {
            row.cells
                .iter()
                .map(|cell| {
                    (
                        cell.text.clone(),
                        cell.width,
                        surface.styles[usize::from(cell.style)].clone(),
                        cell.link
                            .map(|index| surface.links[usize::from(index)].clone()),
                    )
                })
                .collect()
        })
        .collect()
}

#[test]
fn terminal_generated_blank_colors_survive_capture_and_legacy_replay() {
    for color in ["48;2;12;34;56", "48;5;4"] {
        let mut source = GhosttyTerminal::new(24, 4).unwrap();
        // Rationale: real fullscreen writers erase/pad under a background. Ghostty stores those blank
        // colors in the raw cell content tag, not necessarily the style record.
        source.write(format!("\x1b[{color}m\x1b[2J\x1b[2;1HX\x1b[K\x1b[0m").as_bytes());
        let surface = capture(&mut source, &mut RetainedSurfaceBuilder::default());
        for (row_index, row) in surface.row_data.iter().enumerate() {
            for (column, cell) in row.cells.iter().enumerate() {
                let bg = &surface.styles[usize::from(cell.style)].background;
                let resolved = match bg {
                    SurfaceColor::Rgb(rgb) => *rgb,
                    SurfaceColor::Palette(index) => surface.palette[usize::from(*index)],
                    SurfaceColor::Default => {
                        panic!("lost {color} background at {row_index}:{column}")
                    }
                };
                assert_eq!(
                    resolved,
                    if color.ends_with("56") {
                        [12, 34, 56]
                    } else {
                        surface.palette[4]
                    }
                );
            }
        }
        source.mark_dirty().unwrap();
        let legacy = source.frame_at(0, 1, false).unwrap().into_bytes();
        for bytes in [complete_surface_bytes(&surface).unwrap(), legacy] {
            let mut replay = GhosttyTerminal::new(24, 5).unwrap();
            replay.write(&bytes);
            assert_eq!(
                cells(&surface, 0),
                cells(
                    &capture(&mut replay, &mut RetainedSurfaceBuilder::default()),
                    1
                )
            );
        }
    }
}

#[test]
fn resident_content_converges_after_resize_and_tab_reselection() {
    let mut source = GhosttyTerminal::new(80, 12).unwrap();
    let mut outer = GhosttyTerminal::new(80, 13).unwrap();
    let mut retained = RetainedSurfaceBuilder::default();
    let mut composer = PresentationComposer::default();
    for (revision, (columns, rows)) in [(80, 12), (24, 8), (132, 24), (40, 10), (80, 12)]
        .into_iter()
        .enumerate()
    {
        source.resize(columns, rows).unwrap();
        outer.resize(columns, rows + 1).unwrap();
        source.write(format!("\x1b[0m\x1b[2J\x1b[H\x1b[48;2;12;34;56m\x1b[2Ktool at width {columns}\x1b[2;1H\x1b[2K\x1b[0m\x1b[{};3HJump to bottom\x1b[{};{}H│\x1b[{rows};3H> ", rows - 2, rows - 3, columns).as_bytes());
        let surface = capture(&mut source, &mut retained);
        let next = DesiredPresentation {
            tab_id: Some(if revision % 2 == 0 { "a" } else { "b" }.into()),
            incarnation: 1,
            revision: revision as u64 + 1,
            geometry_generation: 1,
            strip: "\x1b[1;1HSTRIP".into(),
            structured: Some(surface.clone()),
            legacy_body: Vec::new(),
            overlay: None,
            cursor: source
                .cursor_cell()
                .unwrap()
                .map(|(column, row)| FinalCursor::At(SurfaceCursor { column, row })),
            modes: None,
            columns,
            outer_rows: rows + 1,
            clear: false,
        };
        let prepared = composer
            .prepare(&next)
            .unwrap()
            .expect("changed geometry/tab paints");
        outer.write(&prepared.bytes);
        prepared.acknowledge(&mut composer);
        let replay = capture(&mut outer, &mut RetainedSurfaceBuilder::default());
        assert_eq!(
            cells(&surface, 0),
            cells(&replay, 1),
            "resize revision={revision}"
        );
    }
}

#[test]
fn resident_damage_compares_referenced_style_and_link_values() {
    let mut source = GhosttyTerminal::new(24, 4).unwrap();
    let mut outer = GhosttyTerminal::new(24, 5).unwrap();
    let mut composer = PresentationComposer::default();
    for (revision, color, uri) in [(1, 31, "one"), (2, 32, "two"), (3, 34, "three")] {
        source.write(format!("\x1b[2J\x1b[H\x1b[{color}m\x1b]8;;https://example.test/{uri}\x1b\\same cells\x1b]8;;\x1b\\\x1b[0m").as_bytes());
        // Invariant: each coherent wire surface owns its own dictionary. Equal numeric indexes are not
        // proof of equal colors or targets after a producer/replay baseline is rebuilt.
        let surface = capture(&mut source, &mut RetainedSurfaceBuilder::default());
        let next = DesiredPresentation {
            tab_id: Some("parity".into()),
            incarnation: 1,
            revision,
            geometry_generation: 1,
            strip: "\x1b[1;1HSTRIP".into(),
            structured: Some(surface.clone()),
            legacy_body: Vec::new(),
            overlay: None,
            cursor: Some(FinalCursor::Hidden),
            modes: None,
            columns: 24,
            outer_rows: 5,
            clear: false,
        };
        if let Some(prepared) = composer.prepare(&next).unwrap() {
            outer.write(&prepared.bytes);
            prepared.acknowledge(&mut composer);
        }
        let replay = capture(&mut outer, &mut RetainedSurfaceBuilder::default());
        assert_eq!(
            cells(&surface, 0),
            cells(&replay, 1),
            "dictionary revision={revision}"
        );
    }
}

#[cfg(windows)]
fn conpty_frames() -> Vec<Vec<u8>> {
    [
        "\x1b[?1049h\x1b[2J\x1b[H\x1b[48;2;12;34;56m\x1b[2Ktool output\x1b[2;1H\x1b[2K\x1b[0m\x1b[9;3HJump to bottom\x1b[10;1HWorking\x1b[12;3H> ",
        "\x1b[9;1H\x1b[2K\x1b[10;1H\x1b[2K\x1b[8;3HJump to bottom\x1b[3;1H\x1b[48;5;4m\x1b[2Knext tool\x1b[0m\x1b[8;40H│\x1b[12;3H> ",
        "\x1b[8;1H\x1b[2K\x1b[7;3H3 new messages\x1b[4;1H\x1b[1;3m界 e\u{301}\x1b[0m\x1b[12;3H> ",
    ].iter().map(|body| format!("\x1b[?2026h{body}\x1b[?2026l").into_bytes()).collect()
}

// Rationale: the test binary doubles as the PTY child, avoiding a Node/shell/toolchain dependency.
#[cfg(windows)]
#[test]
fn conpty_parity_child() {
    if std::env::var("A1_CONPTY_PARITY_CHILD").as_deref() != Ok("1") {
        return;
    }
    use std::io::Write;
    for frame in conpty_frames() {
        std::io::stdout().write_all(&frame).unwrap();
        std::io::stdout().flush().unwrap();
        std::thread::sleep(std::time::Duration::from_millis(80));
    }
    std::thread::sleep(std::time::Duration::from_millis(150));
    std::process::exit(0);
}

#[cfg(windows)]
#[test]
fn conpty_output_preserves_solo_content_before_resident_replay() {
    use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
    use std::io::{Read, Write};
    let pair = NativePtySystem::default()
        .openpty(PtySize {
            rows: 12,
            cols: 40,
            pixel_width: 0,
            pixel_height: 0,
        })
        .unwrap();
    let mut command = CommandBuilder::new(std::env::current_exe().unwrap());
    command.args([
        "--exact",
        "roles::presentation::parity_tests::conpty_parity_child",
        "--nocapture",
    ]);
    command.env("A1_CONPTY_PARITY_CHILD", "1");
    let mut child = pair.slave.spawn_command(command).unwrap();
    drop(pair.slave);
    let mut reader = pair.master.try_clone_reader().unwrap();
    let mut writer = pair.master.take_writer().unwrap();
    let (sender, receiver) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let mut bytes = Vec::new();
        let mut buffer = [0u8; 4096];
        let result = loop {
            match reader.read(&mut buffer) {
                Ok(0) => break Ok(()),
                Ok(count) => {
                    let previous = bytes.len();
                    bytes.extend_from_slice(&buffer[..count]);
                    // Platform: ConPTY's startup cursor-position query must be answered before it starts
                    // the child. It is terminal I/O, not a child content frame.
                    if bytes[previous.saturating_sub(3)..]
                        .windows(4)
                        .any(|window| window == b"\x1b[6n")
                    {
                        writer.write_all(b"\x1b[1;1R").unwrap();
                        writer.flush().unwrap();
                    }
                }
                Err(error) => break Err(error),
            }
        };
        let _ = sender.send((result, bytes));
    });
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(10);
    loop {
        if let Some(status) = child.try_wait().unwrap() {
            assert!(status.success());
            break;
        }
        if std::time::Instant::now() >= deadline {
            child.kill().unwrap();
            child.wait().unwrap();
            panic!("ConPTY fixture child did not finish within ten seconds");
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
    drop(pair.master);
    let (result, bytes) = receiver
        .recv_timeout(std::time::Duration::from_secs(10))
        .expect("PTY output completed");
    result.unwrap();
    let mut solo = GhosttyTerminal::new(40, 12).unwrap();
    for frame in conpty_frames() {
        solo.write(&frame);
    }
    let mut resident = GhosttyTerminal::new(40, 12).unwrap();
    resident.write(&bytes);
    let direct = capture(&mut solo, &mut RetainedSurfaceBuilder::default());
    let through_pty = capture(&mut resident, &mut RetainedSurfaceBuilder::default());
    assert_eq!(
        cells(&direct, 0),
        cells(&through_pty, 0),
        "ConPTY must preserve the child frame before capture/replay"
    );
}

#[test]
fn solo_and_resident_cells_converge_across_frame_sequences() {
    for columns in [24u16, 80, 132, 192] {
        let rows = 12u16;
        let mut source = GhosttyTerminal::new(columns, rows).unwrap();
        let mut outer = GhosttyTerminal::new(columns, rows + 1).unwrap();
        let mut retained = RetainedSurfaceBuilder::default();
        let mut presented = RetainedSurfaceBuilder::default();
        let mut composer = PresentationComposer::default();
        let mut stream = Vec::new();
        let mut sequences = vec![
            format!("\x1b[?1049h\x1b[2J\x1b[H\x1b[48;2;12;34;56m{}\x1b[0m\x1b[10;3HJump to bottom\x1b[11;1HWorking\x1b[12;1H> ", " ".repeat(usize::from(columns))),
            "\x1b[10;1H\x1b[2K\x1b[9;3HJump to bottom\x1b[11;1H\x1b[2K\x1b[4;1H\x1b[48;5;4mtool\x1b[K\x1b[0m".into(),
            "\x1b[2;10r\x1b[2;1H\x1b[2S\x1b[r\x1b[9;1H\x1b[2K\x1b[8;3H3 new messages".into(),
            "\x1b[3;1H\x1b[1;3;4:3;9m\x1b]8;id=parity;https://example.test/\x1b\\界e\u{301}\x1b]8;;\x1b\\\x1b[0m\x1b[8;1H\x1b[2K\x1b[6;1H\x1b[48;2;2;8;16m\x1b[2K\x1b[0m".into(),
            "\x1b[2;1H\x1b[3L\x1b[5;1H\x1b[2M\x1b[10;1H\x1b[2K\x1b[7;1H\x1b[48;5;2m\x1b[K\x1b[0m".into(),
            "\x1b[0m\x1b[2J\x1b[Hshort\x1b[12;3H\x1b[?25h".into(),
        ];
        sequences.push("\x1b]4;4;rgb:12/34/56\x1b\\\x1b]10;rgb:ab/cd/ef\x1b\\\x1b]11;rgb:11/22/33\x1b\\\x1b]12;rgb:44/55/66\x1b\\\x1b[2;1H\x1b[48;5;4m\x1b[2K\x1b[0m".into());
        // Invariant: exercise sustained differential damage without a full/mark-dirty capture healing the
        // source cache between frames. Controls, rail cells and status rows move independently.
        let mut seed = 0x811u32;
        for revision in 0..96 {
            seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
            let row = 2 + seed % 8;
            let operation = match revision % 8 {
                0 => format!(
                    "\x1b[{row};1H\x1b[48;2;12;34;56m\x1b[2Ktool {revision}\x1b[0m\x1b[{row};{columns}H│"
                ),
                1 => format!(
                    "\x1b[10;1H\x1b[2K\x1b[{row};3HJump to bottom\x1b[11;1H\x1b[2KWorking {revision}"
                ),
                2 => "\x1b[2;10r\x1b[1S\x1b[r".into(),
                3 => format!("\x1b[{row};1H\x1b[48;5;4m\x1b[K\x1b[0m\x1b[11;1H\x1b[2K"),
                4 => "\x1b[2;10r\x1b[1T\x1b[r".into(),
                5 => format!("\x1b[{row};1H\x1b[2K\x1b[1;3;7m界\x1b[0m replacement"),
                6 => format!("\x1b[{row};1H\x1b[1L\x1b[9;1H\x1b[1M"),
                _ => format!("\x1b[{row};1H\x1b[2K\x1b[10;1H\x1b[2K\x1b[12;3H> {revision}"),
            };
            sequences.push(operation);
        }
        for (frame_index, body) in sequences.iter().enumerate() {
            let frame = format!("\x1b[?2026h{body}\x1b[?2026l");
            stream.extend_from_slice(frame.as_bytes());
            // Invariant: fragment at arbitrary byte boundaries, including inside UTF-8, CSI and OSC.
            for chunk in frame.as_bytes().chunks(7) {
                let mut offset = 0;
                while offset < chunk.len() {
                    let (consumed, _) = source.write_until_sync_boundary(&chunk[offset..]).unwrap();
                    offset += consumed;
                }
            }
            let incremental = capture(&mut source, &mut retained);
            // Invariant: independent solo execution never consumes render damage between frames.
            let mut solo = GhosttyTerminal::new(columns, rows).unwrap();
            solo.write(&stream);
            let direct = capture(&mut solo, &mut RetainedSurfaceBuilder::default());
            assert_eq!(
                cells(&incremental, 0),
                cells(&direct, 0),
                "fragmentation: width={columns} frame={frame_index}"
            );
            let next = DesiredPresentation {
                tab_id: Some("parity".into()),
                incarnation: 1,
                revision: frame_index as u64 + 1,
                geometry_generation: 1,
                strip: "\x1b[1;1HSTRIP".into(),
                structured: Some(incremental.clone()),
                legacy_body: Vec::new(),
                overlay: None,
                cursor: source
                    .cursor_cell()
                    .unwrap()
                    .map(|(column, row)| FinalCursor::At(SurfaceCursor { column, row })),
                modes: None,
                columns,
                outer_rows: rows + 1,
                clear: false,
            };
            if let Some(prepared) = composer.prepare(&next).unwrap() {
                outer.write(&prepared.bytes);
                prepared.acknowledge(&mut composer);
            }
            let replay = capture(&mut outer, &mut presented);
            assert_eq!(
                cells(&direct, 0),
                cells(&replay, 1),
                "resident replay: width={columns} frame={frame_index}"
            );
            assert_eq!(
                direct.palette, replay.palette,
                "palette: frame={frame_index}"
            );
            assert_eq!(
                direct.default_foreground, replay.default_foreground,
                "foreground: frame={frame_index}"
            );
            assert_eq!(
                direct.default_background, replay.default_background,
                "background: frame={frame_index}"
            );
            assert_eq!(
                direct.cursor_color, replay.cursor_color,
                "cursor color: frame={frame_index}"
            );
            let expected_cursor = source
                .cursor_cell()
                .unwrap()
                .map(|(column, row)| (column, row + 1));
            assert_eq!(
                outer.cursor_cell().unwrap(),
                expected_cursor,
                "cursor: frame={frame_index}"
            );
        }
    }
}
