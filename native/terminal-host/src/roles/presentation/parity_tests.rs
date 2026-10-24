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
            child_row_offset: 1,
            clear: false,
            dimmed: false,
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
            child_row_offset: 1,
            clear: false,
            dimmed: false,
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

/// Frames the custom viewport writes while scrolling with the pointer on the rail: a full paint,
/// a detached scroll that moves the thumb, rail-only hover changes, and a one-row thumb move.
#[cfg(windows)]
fn conpty_rail_frames(columns: u16) -> Vec<Vec<u8>> {
    const RESET: &str = "\x1b]8;;\x1b\\\x1b[22;23;24;25;27;28;29;39;54;55m";
    let width = usize::from(columns);
    let row = |index: usize, text: &str, rail: Option<(&str, &str)>| -> String {
        let mut line = format!("\x1b[{index};1H\x1b[2K{text:<w$}", w = width - 1);
        if let Some((color, glyph)) = rail {
            line.push_str(&format!("{RESET}{color}{glyph}\x1b[0m"));
        }
        line
    };
    let rail = |thumb: bool, thick: bool| {
        Some((
            if thumb {
                "\x1b[38;2;181;189;104m"
            } else {
                "\x1b[2m"
            },
            if thick { "┃" } else { "│" },
        ))
    };
    // Invariant: dock rows 10-12 are painted once; a later whole-screen scroll would blank them.
    let frame = |rows: Vec<String>| {
        format!("\x1b[?2026h{}\x1b[12;3H\x1b[?25h\x1b[?2026l", rows.concat()).into_bytes()
    };
    let mut frames = vec![{
        let mut rows = vec![format!("\x1b[?1049h\x1b[?7l\x1b[2J\x1b[H")];
        rows.push(row(1, "> prompt", None));
        for index in 2..=9 {
            rows.push(row(
                index,
                &format!("line {index}"),
                rail(index >= 7, false),
            ));
        }
        rows.push(row(10, &"─".repeat(width), None));
        rows.push(row(11, "footer status", None));
        rows.push(row(12, "> ", None));
        frame(rows)
    }];
    frames.push({
        let mut rows = vec![row(1, "> prompt", None)];
        for index in 2..=9 {
            rows.push(row(
                index,
                &format!("line {}", index + 20),
                rail(index <= 4, false),
            ));
        }
        rows.push(row(9, "line 29      Jump to bottom ↓", rail(false, false)));
        frame(rows)
    });
    frames.push(frame(
        (2..=4)
            .map(|index| row(index, &format!("line {}", index + 20), rail(true, true)))
            .collect(),
    ));
    frames.push(frame(vec![
        row(2, "line 22", rail(false, false)),
        row(5, "line 25", rail(true, true)),
    ]));
    frames.push(frame(
        (3..=5)
            .map(|index| row(index, &format!("line {}", index + 20), rail(true, false)))
            .collect(),
    ));
    // Invariant: when the dock grows by one row, the former last viewport row is erased with no content, and the
    // control row moves up with its rail cell.
    frames.push(frame(vec![
        row(8, "line 28     Jump to bottom ↓", rail(false, false)),
        format!("\x1b[9;1H\x1b[2K"),
    ]));
    frames.push(frame(vec![
        row(8, "line 28", rail(false, false)),
        row(9, "line 29     2 new messages ↓", rail(false, false)),
    ]));
    // Invariant: a followed stream shifts the transcript region up by two rows inside DECSTBM margins and
    // repaints only the exposed rows; the dock below the margins must stay in place.
    frames.push(frame(vec![
        "\x1b[1;9r\x1b[1;1H\x1b[2S\x1b[r".to_owned(),
        row(8, "line 30", rail(false, false)),
        row(9, "line 31", rail(true, false)),
    ]));
    frames
}

/// Frames recorded from the real session shell, from `TERMINAL_HOST_CONPTY_PARITY_FRAMES`.
#[cfg(windows)]
fn conpty_recorded_frames() -> (u16, u16, Vec<Vec<u8>>) {
    let path = std::env::var("TERMINAL_HOST_CONPTY_PARITY_FRAMES").expect("recorded frames path");
    let text = std::fs::read_to_string(path).expect("read recorded frames");
    let value: serde_json::Value = serde_json::from_str(&text).expect("parse recorded frames");
    let columns = value["columns"].as_u64().unwrap() as u16;
    let rows = value["rows"].as_u64().unwrap() as u16;
    let frames = value["frames"]
        .as_array()
        .unwrap()
        .iter()
        .map(|frame| frame["data"].as_str().unwrap().as_bytes().to_vec())
        .collect();
    (columns, rows, frames)
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

/// Composes one resident outer frame for the parity child and acknowledges it.
#[cfg(windows)]
fn compose_parity_frame(
    composer: &mut PresentationComposer,
    surface: StructuredSurface,
    cursor: FinalCursor,
    revision: usize,
    columns: u16,
    rows: u16,
) -> Vec<u8> {
    let next = DesiredPresentation {
        tab_id: Some("parity".into()),
        incarnation: 1,
        revision: revision as u64 + 1,
        geometry_generation: 1,
        strip: "\x1b[1;1HSTRIP".into(),
        structured: Some(surface),
        legacy_body: Vec::new(),
        overlay: None,
        cursor: Some(cursor),
        modes: None,
        columns,
        outer_rows: rows + 1,
        child_row_offset: 1,
        clear: false,
        dimmed: false,
    };
    // Invariant: a cursor-only child frame changes no retained cell and prepares nothing.
    match composer.prepare(&next).unwrap() {
        Some(prepared) => {
            let output = prepared.bytes.clone();
            prepared.acknowledge(composer);
            output
        }
        None => Vec::new(),
    }
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
    let rail_case = mode.contains(":rail:");
    let recorded_case = mode.contains(":recorded:");
    let frame_limit = mode.rsplit(':').next().unwrap().parse::<usize>().unwrap();
    let columns = mode.split(':').nth(2).unwrap().parse::<u16>().unwrap();
    let recorded = recorded_case.then(conpty_recorded_frames);
    let rows = if hover_case {
        31
    } else if let Some((_, rows, _)) = recorded.as_ref() {
        *rows
    } else {
        12
    };
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
    } else if rail_case {
        conpty_rail_frames(columns)
    } else if let Some((_, _, frames)) = recorded {
        frames
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
            let cursor = if hover_case {
                FinalCursor::Hidden
            } else {
                source
                    .cursor_cell()
                    .unwrap()
                    .map_or(FinalCursor::Hidden, |(column, row)| {
                        FinalCursor::At(SurfaceCursor { column, row })
                    })
            };
            compose_parity_frame(&mut composer, surface, cursor, revision, columns, rows)
        } else {
            frame
        };
        terminal_output.write_all(&output).unwrap();
        terminal_output.flush().unwrap();
        std::thread::sleep(std::time::Duration::from_millis(if recorded_case {
            12
        } else {
            80
        }));
    }
    std::thread::sleep(std::time::Duration::from_millis(150));
    drop(terminal_output);
    assert_eq!(unsafe { GetConsoleOutputCP() }, original_code_page);
    std::process::exit(0);
}

#[cfg(windows)]
#[test]
fn conpty_output_preserves_solo_content_before_resident_replay() {
    conpty_content_parity(false, "base", conpty_frames().len(), 40);
    conpty_content_parity(true, "base", conpty_frames().len(), 40);
}

#[cfg(windows)]
#[test]
fn conpty_recorded_session_frames_replay() {
    if std::env::var_os("TERMINAL_HOST_CONPTY_PARITY_FRAMES").is_none() {
        return;
    }
    let (columns, _, frames) = conpty_recorded_frames();
    let limits: Vec<usize> = std::env::var("TERMINAL_HOST_CONPTY_PARITY_LIMITS")
        .ok()
        .map(|value| value.split(',').map(|item| item.parse().unwrap()).collect())
        .unwrap_or_else(|| vec![frames.len()]);
    for frame_limit in limits {
        conpty_content_parity(false, "recorded", frame_limit, columns);
        conpty_content_parity(true, "recorded", frame_limit, columns);
    }
}

#[cfg(windows)]
#[test]
fn conpty_rail_only_row_changes_reach_the_grid() {
    for columns in [40u16, 120] {
        for frame_limit in 1..=conpty_rail_frames(columns).len() {
            conpty_content_parity(false, "rail", frame_limit, columns);
            conpty_content_parity(true, "rail", frame_limit, columns);
        }
    }
}

#[cfg(windows)]
fn conpty_output(resident_output: bool, case: &str, frame_limit: usize, columns: u16) -> Vec<u8> {
    let rows = if case == "hover" {
        31
    } else if case == "recorded" {
        conpty_recorded_frames().1
    } else {
        12
    };
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
            "{}:{case}:{columns}:{frame_limit}",
            if resident_output { "resident" } else { "solo" },
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
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(60);
    let mut failure = None;
    loop {
        if let Some(status) = child.try_wait().unwrap() {
            if !status.success() {
                failure = Some(status);
            }
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
    if let Some(status) = failure {
        let text = String::from_utf8_lossy(&bytes);
        let tail: String = text
            .chars()
            .rev()
            .take(1500)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect();
        panic!("ConPTY fixture child failed ({status:?}); output tail: {tail:?}");
    }
    bytes
}

#[cfg(windows)]
fn conpty_content_parity(resident_output: bool, case: &str, frame_limit: usize, columns: u16) {
    let hover_case = case == "hover";
    let recorded = (case == "recorded").then(conpty_recorded_frames);
    let rows = if hover_case {
        31
    } else if let Some((_, rows, _)) = recorded.as_ref() {
        *rows
    } else {
        12
    };
    let bytes = conpty_output(resident_output, case, frame_limit, columns);
    let mut solo = GhosttyTerminal::new(columns, rows).unwrap();
    let solo_frames = if case == "rail" {
        conpty_rail_frames(columns)
    } else if let Some((_, _, frames)) = recorded {
        frames
    } else {
        conpty_frames()
    };
    for frame in solo_frames.into_iter().take(frame_limit) {
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
        if case == "recorded" {
            let mut mismatches = Vec::new();
            for (y, (a, b)) in expected.iter().zip(&actual).enumerate() {
                let row_text = |row: &Vec<(String, u8, SurfaceStyle, Option<SurfaceLink>)>| {
                    row.iter().map(|cell| cell.0.as_str()).collect::<String>()
                };
                let differs = a.iter().zip(b).any(|(e, g)| {
                    e.0 != g.0
                        || e.1 != g.1
                        || e.2.background != g.2.background
                        || ((e.0 == "│" || e.0 == "┃") && e.2.foreground != g.2.foreground)
                });
                if differs {
                    mismatches.push(format!(
                        "row {y}:\n  direct: {:?}\n  conpty: {:?}",
                        row_text(a),
                        row_text(b)
                    ));
                }
            }
            assert!(
                mismatches.is_empty(),
                "recorded replay phase={frame_limit} chunks={chunk_size} resident={resident_output}\n{}",
                mismatches.join("\n")
            );
            continue;
        }
        for (y, (a, b)) in expected.iter().zip(&actual).enumerate() {
            for (x, (e, g)) in a.iter().zip(b).enumerate() {
                if hover_case || case == "recorded" {
                    // Compatibility: ConPTY may resolve a default foreground into explicit RGB. Cell positions and
                    // backgrounds, including styled blanks, must still survive the replay exactly.
                    let rail = e.0 == "│" || e.0 == "┃" || g.0 == "│" || g.0 == "┃";
                    assert_eq!(
                        (&e.0, e.1, &e.2.background, rail.then_some(&e.2.foreground)),
                        (&g.0, g.1, &g.2.background, rail.then_some(&g.2.foreground)),
                        "{case} cell at {y}:{x} phase={frame_limit} width={columns} chunks={chunk_size} resident={resident_output}"
                    );
                    continue;
                }
                assert_eq!(
                    e, g,
                    "ConPTY mismatch at {y}:{x} chunks={chunk_size} resident={resident_output} case={case} phase={frame_limit}"
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
            conpty_content_parity(true, "hover", frame_limit, columns);
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
            child_row_offset: 1,
            clear: false,
            dimmed: false,
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

/// Writes PTY output into the terminal exactly as the holder loop does, including its ConPTY
/// cursor repair and synchronized-output boundary splitting.
fn write_like_holder(
    terminal: &mut GhosttyTerminal,
    repair: &mut crate::roles::conpty_cursor::ConptyCursorRepair,
    bytes: &[u8],
) {
    let mut offset = 0;
    while offset < bytes.len() {
        let (consumed, _) = repair
            .write_until_sync_boundary(terminal, &bytes[offset..])
            .unwrap();
        offset += consumed;
    }
}

fn row_text(surface: &StructuredSurface, row: usize) -> String {
    surface.row_data[row]
        .cells
        .iter()
        .map(|cell| cell.text.as_str())
        .collect()
}

/// Exact bytes Windows ConPTY re-rendered for a rail row whose render pass was split after the
/// child's cursor rested past the final column (recorded at 122 columns, reduced to 12).
const CONPTY_SPLIT_RAIL_ROW: &[u8] = b"\x1b[?2026h\x1b[1;1H 56. text\x1b[K\x1b[3C\x1b[?2026l\x1b[38;2;104;183;141m\x08\xe2\x94\x83\x1b[m\r\n";

#[test]
fn conpty_split_render_pass_keeps_the_rail_in_the_final_column() {
    let mut repaired = GhosttyTerminal::new(12, 3).unwrap();
    let mut repair = crate::roles::conpty_cursor::ConptyCursorRepair::new(true);
    write_like_holder(&mut repaired, &mut repair, CONPTY_SPLIT_RAIL_ROW);
    let surface = capture(&mut repaired, &mut RetainedSurfaceBuilder::default());
    assert_eq!(row_text(&surface, 0), " 56. text  ┃");

    // Platform: without the repair a standard parser draws the rail one column left of the gutter.
    let mut raw = GhosttyTerminal::new(12, 3).unwrap();
    let mut disabled = crate::roles::conpty_cursor::ConptyCursorRepair::new(false);
    write_like_holder(&mut raw, &mut disabled, CONPTY_SPLIT_RAIL_ROW);
    let surface = capture(&mut raw, &mut RetainedSurfaceBuilder::default());
    assert_eq!(row_text(&surface, 0), " 56. text ┃ ");
}

/// Replays real ConPTY output recorded by a probe (`TERMINAL_HOST_CONPTY_OUTPUT`, with
/// `TERMINAL_HOST_CONPTY_OUTPUT_SIZE=<columns>x<rows>`) through the holder write path and asserts no
/// published state ever shows a rail glyph beside a blank final column.
#[test]
fn recorded_conpty_output_never_shifts_the_rail() {
    let Some(path) = std::env::var_os("TERMINAL_HOST_CONPTY_OUTPUT") else {
        return;
    };
    let size = std::env::var("TERMINAL_HOST_CONPTY_OUTPUT_SIZE").unwrap();
    let (columns, rows) = size.split_once('x').unwrap();
    let (columns, rows): (u16, u16) = (columns.parse().unwrap(), rows.parse().unwrap());
    let bytes = std::fs::read(path).unwrap();
    let mut terminal = GhosttyTerminal::new(columns, rows).unwrap();
    let mut repair = crate::roles::conpty_cursor::ConptyCursorRepair::new(
        std::env::var_os("TERMINAL_HOST_CONPTY_REPAIR_OFF").is_none(),
    );
    let mut builder = RetainedSurfaceBuilder::default();
    let mut failures = Vec::new();
    let marker = b"\x1b[?2026h";
    let mut start = 0;
    let mut checkpoints: Vec<usize> = (0..bytes.len().saturating_sub(marker.len()))
        .filter(|&index| &bytes[index..index + marker.len()] == marker)
        .collect();
    checkpoints.push(bytes.len());
    for end in checkpoints {
        write_like_holder(&mut terminal, &mut repair, &bytes[start..end]);
        start = end;
        let surface = capture(&mut terminal, &mut builder);
        for (row, data) in surface.row_data.iter().enumerate() {
            let cells = &data.cells;
            let last = cells.len() - 1;
            if cells[last].text == " " && matches!(cells[last - 1].text.as_str(), "│" | "┃") {
                failures.push(format!(
                    "offset {end} row {row}: {:?}",
                    row_text(&surface, row)
                ));
            }
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}
