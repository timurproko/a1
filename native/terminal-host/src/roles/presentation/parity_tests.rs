//! Compare terminal-generated frames, not hand-authored surface rows, across every replay boundary.
use super::*;
use crate::ghostty::{GhosttyTerminal, RetainedSurfaceBuilder};
#[cfg(windows)]
use crate::protocol::SurfaceCell;
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
fn cyrillic_continuation_bytes_are_not_control_boundaries() {
    let bytes = "\x1b[?1049h\x1b[?7l\x1b[2J\x1b[?2026h\x1b[1;1H### 1. Личност\x1b[2;1H1. Как би описал характера си?\x1b[3;1HśЛ Ще ти задам въпроси\x1b[8;1HJump to bottom ↓\x1b[?2026l".as_bytes();
    let mut solo = GhosttyTerminal::new(40, 10).unwrap();
    solo.write(bytes);
    let expected = capture(&mut solo, &mut RetainedSurfaceBuilder::default());
    for size in [1, 2, 3, 7, 64, 4096] {
        let mut resident = GhosttyTerminal::new(40, 10).unwrap();
        let mut builder = RetainedSurfaceBuilder::default();
        for chunk in bytes.chunks(size) {
            let mut offset = 0;
            while offset < chunk.len() {
                let (count, _) = resident
                    .write_until_sync_boundary(&chunk[offset..])
                    .unwrap();
                offset += count;
                capture(&mut resident, &mut builder);
            }
        }
        let actual = capture(&mut resident, &mut builder);
        assert_eq!(
            cells(&expected, 0),
            cells(&actual, 0),
            "UTF-8 control-like bytes, chunk={size}"
        );
    }
}

#[test]
fn retained_rows_follow_natural_linefeed_scrolling() {
    for alternate in [false, true] {
        let mut source = GhosttyTerminal::new(24, 6).unwrap();
        let mut builder = RetainedSurfaceBuilder::default();
        let initial = format!(
            "{}\x1b[2J\x1b[Hrow0\r\nrow1\r\nrow2\r\nrow3\r\nrow4\r\nrow5",
            if alternate { "\x1b[?1049h" } else { "" }
        );
        source.write(initial.as_bytes());
        capture(&mut source, &mut builder);
        let mut all = initial.into_bytes();
        for index in 0..16 {
            let next = format!("\x1b[6;1H\r\nnew{index}");
            all.extend_from_slice(next.as_bytes());
            source.write(next.as_bytes());
            let retained = capture(&mut source, &mut builder);
            let mut fresh = GhosttyTerminal::new(24, 6).unwrap();
            fresh.write(&all);
            let direct = capture(&mut fresh, &mut RetainedSurfaceBuilder::default());
            assert_eq!(
                cells(&retained, 0),
                cells(&direct, 0),
                "linefeed={index} alternate={alternate}"
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
            dim: false,
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
            dim: false,
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
        "\x1b[?1049h\x1b[?7l\x1b[2J\x1b[H\x1b[48;2;12;34;56m\x1b[2KЛичност ś tool output\x1b[2;1H\x1b[2K\x1b[0m\x1b[9;3HJump to bottom ↓\x1b[10;1HWorking\x1b[12;3H> ",
        "\x1b[9;1H\x1b[2K\x1b[10;1H\x1b[2K\x1b[8;3HJump to bottom ↓\x1b[3;1H\x1b[48;5;4m\x1b[2Knext tool\x1b[0m\x1b[8;40H│\x1b[12;3H> ",
        "\x1b[8;1H\x1b[2K\x1b[7;3H3 new messages ↓\x1b[4;1H\x1b[1;3m界 e\u{301} Личност\x1b[0m\x1b[5;1H1. Как би описал характера си?\x1b[12;3H> ",
        "\x1b[7;1H\x1b[2K\x1b[8;40H \x1b[12;3H> ",
    ].iter().map(|body| format!("\x1b[?2026h{body}\x1b[12;1H{}\x1b[0m\x1b[12;3H\x1b[?2026l", " ".repeat(40)).into_bytes()).collect()
}

#[cfg(windows)]
fn conpty_hover_frames(columns: u16) -> Vec<StructuredSurface> {
    let fixture: serde_json::Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/viewport-hover.json")).unwrap();
    let base: StructuredSurface = serde_json::from_value(fixture["base"].clone()).unwrap();
    fixture["frames"]
        .as_array()
        .unwrap()
        .iter()
        .map(|frame| {
            let mut surface = base.clone();
            surface.styles = serde_json::from_value(frame["styles"].clone()).unwrap();
            surface.row_data = frame["rows"]
                .as_array()
                .unwrap()
                .iter()
                .map(|runs| SurfaceRow {
                    cells: runs
                        .as_array()
                        .unwrap()
                        .iter()
                        .flat_map(|run| {
                            let style = run[0].as_u64().unwrap() as u16;
                            run[1]
                                .as_str()
                                .unwrap()
                                .chars()
                                .map(move |text| SurfaceCell {
                                    text: text.to_string(),
                                    style,
                                    ..SurfaceCell::default()
                                })
                        })
                        .collect(),
                })
                .collect();
            if columns != surface.columns {
                for row in &mut surface.row_data {
                    let edge = row.cells.pop().unwrap();
                    row.cells
                        .resize(usize::from(columns - 1), SurfaceCell::default());
                    row.cells.push(edge);
                }
                surface.columns = columns;
            }
            surface.validate().unwrap();
            surface
        })
        .collect()
}

// Rationale: the test binary doubles as the PTY child, avoiding a Node/shell/toolchain dependency.
#[cfg(windows)]
#[test]
fn conpty_parity_child() {
    let mode = std::env::var("TERMINAL_HOST_CONPTY_PARITY_CHILD").unwrap_or_default();
    if mode.is_empty() {
        return;
    }
    use std::io::Write;
    use windows_sys::Win32::System::Console::GetConsoleOutputCP;
    let original_code_page = unsafe { GetConsoleOutputCP() };
    let mut terminal_output = crate::roles::terminal_output::TerminalOutput::new();
    let resident_output = mode.starts_with("resident:");
    let hover_case = mode.contains(":hover:");
    let frame_limit = mode.rsplit(':').next().unwrap().parse::<usize>().unwrap();
    let columns = mode.split(':').nth(2).unwrap().parse::<u16>().unwrap();
    let rows = if hover_case { 31 } else { 12 };
    let mut source = GhosttyTerminal::new(columns, rows).unwrap();
    let mut builder = RetainedSurfaceBuilder::default();
    let mut composer = PresentationComposer::default();
    if resident_output {
        terminal_output
            .write_all(crate::roles::attach::ENTER_OUTER_MODES)
            .unwrap();
    }
    let hover = if hover_case {
        conpty_hover_frames(columns)
    } else {
        Vec::new()
    };
    let frames = if hover_case {
        vec![Vec::new(); hover.len()]
    } else {
        conpty_frames()
    };
    for (revision, frame) in frames.into_iter().take(frame_limit).enumerate() {
        let output = if resident_output {
            source.write(&frame);
            let surface = if hover_case {
                hover[revision].clone()
            } else {
                capture(&mut source, &mut builder)
            };
            let next = DesiredPresentation {
                tab_id: Some("parity".into()),
                incarnation: 1,
                revision: revision as u64 + 1,
                geometry_generation: 1,
                strip: "\x1b[1;1HSTRIP".into(),
                structured: Some(surface),
                legacy_body: Vec::new(),
                overlay: None,
                cursor: Some(if hover_case {
                    FinalCursor::Hidden
                } else {
                    source
                        .cursor_cell()
                        .unwrap()
                        .map_or(FinalCursor::Hidden, |(column, row)| {
                            FinalCursor::At(SurfaceCursor { column, row })
                        })
                }),
                modes: None,
                columns,
                outer_rows: rows + 1,
                clear: false,
                dim: false,
            };
            let prepared = composer.prepare(&next).unwrap().unwrap();
            let output = prepared.bytes.clone();
            prepared.acknowledge(&mut composer);
            output
        } else {
            frame
        };
        terminal_output.write_all(&output).unwrap();
        terminal_output.flush().unwrap();
        std::thread::sleep(std::time::Duration::from_millis(80));
    }
    std::thread::sleep(std::time::Duration::from_millis(150));
    drop(terminal_output);
    assert_eq!(unsafe { GetConsoleOutputCP() }, original_code_page);
    std::process::exit(0);
}

#[cfg(windows)]
#[test]
fn conpty_output_preserves_solo_content_before_resident_replay() {
    conpty_content_parity(false, false, conpty_frames().len(), 40);
    conpty_content_parity(true, false, conpty_frames().len(), 40);
}

#[cfg(windows)]
fn conpty_output(
    resident_output: bool,
    hover_case: bool,
    frame_limit: usize,
    columns: u16,
) -> Vec<u8> {
    let rows = if hover_case { 31 } else { 12 };
    use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
    use std::io::{Read, Write};
    let pair = NativePtySystem::default()
        .openpty(PtySize {
            rows: rows + u16::from(resident_output),
            cols: columns,
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
    command.env(
        "TERMINAL_HOST_CONPTY_PARITY_CHILD",
        format!(
            "{}:{}:{columns}:{frame_limit}",
            if resident_output { "resident" } else { "solo" },
            if hover_case { "hover" } else { "base" }
        ),
    );
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
    bytes
}

#[cfg(windows)]
fn conpty_content_parity(
    resident_output: bool,
    hover_case: bool,
    frame_limit: usize,
    columns: u16,
) {
    let rows = if hover_case { 31 } else { 12 };
    let bytes = conpty_output(resident_output, hover_case, frame_limit, columns);
    let mut solo = GhosttyTerminal::new(columns, rows).unwrap();
    for frame in conpty_frames().into_iter().take(frame_limit) {
        solo.write(&frame);
    }
    let direct = if hover_case {
        conpty_hover_frames(columns)[frame_limit - 1].clone()
    } else {
        capture(&mut solo, &mut RetainedSurfaceBuilder::default())
    };
    for chunk_size in [1, 7, 4096] {
        let mut resident =
            GhosttyTerminal::new(columns, rows + u16::from(resident_output)).unwrap();
        let mut builder = RetainedSurfaceBuilder::default();
        let mut through_pty = None;
        for chunk in bytes.chunks(chunk_size) {
            let mut offset = 0;
            while offset < chunk.len() {
                let (count, _) = resident
                    .write_until_sync_boundary(&chunk[offset..])
                    .unwrap();
                offset += count;
                through_pty = Some(capture(&mut resident, &mut builder));
            }
        }
        let expected = cells(&direct, 0);
        let actual = cells(&through_pty.unwrap(), usize::from(resident_output));
        for (y, (a, b)) in expected.iter().zip(&actual).enumerate() {
            for (x, (e, g)) in a.iter().zip(b).enumerate() {
                if hover_case {
                    // Compatibility: ConPTY may resolve a default foreground into explicit RGB. Cell positions and
                    // backgrounds, including styled blanks, must still survive the replay exactly.
                    assert_eq!(
                        (&e.0, e.1, &e.2.background),
                        (&g.0, g.1, &g.2.background),
                        "hover cell at {y}:{x} phase={frame_limit} width={columns} chunks={chunk_size}"
                    );
                    continue;
                }
                assert_eq!(
                    e, g,
                    "ConPTY mismatch at {y}:{x} chunks={chunk_size} resident={resident_output} hover={hover_case} phase={frame_limit}"
                );
            }
        }
    }
}

#[cfg(windows)]
#[test]
fn conpty_hover_replay_keeps_the_rail_in_its_fixed_column() {
    for columns in [100, 120, 121, 132] {
        for frame_limit in 1..=conpty_hover_frames(columns).len() {
            conpty_content_parity(true, true, frame_limit, columns);
        }
    }
}

fn parity_frames(columns: u16) -> Vec<String> {
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
    sequences
}

fn assert_parity_sequence(columns: u16) {
    let rows = 12u16;
    let mut source = GhosttyTerminal::new(columns, rows).unwrap();
    let mut outer = GhosttyTerminal::new(columns, rows + 1).unwrap();
    let mut retained = RetainedSurfaceBuilder::default();
    let mut presented = RetainedSurfaceBuilder::default();
    let mut composer = PresentationComposer::default();
    let mut stream = Vec::new();
    for (frame_index, body) in parity_frames(columns).iter().enumerate() {
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
            dim: false,
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

#[test]
fn solo_and_resident_cells_converge_across_frame_sequences() {
    for columns in [24u16, 80, 132, 192] {
        assert_parity_sequence(columns);
    }
}
