//! The resident quit outro: the attach client's port of bare A1's `fall` effect
//! (`src/app/session-shell/quit-outro-effects.ts` and `quit-outro.ts`).
//!
//! Solo A1 animates its last frame before leaving the alternate screen. A resident attach client
//! owns the outer terminal instead, so on a double-Ctrl+C detach it plays the same plan over the
//! screen it already presented, then restores the terminal. Every tick is one synchronized-output
//! block, and playback is bounded so a slow terminal cannot delay restoration.

use std::time::{Duration, Instant};

const WHITE: &str = "\x1b[38;2;238;238;238m";
const FALL_GLYPHS: [&str; 6] = [".", ".", "·", "'", ":", "°"];
const GRAVITY: f64 = 85.0;
pub const QUIT_OUTRO_DURATION: Duration = Duration::from_millis(800);
const QUIT_OUTRO_GUARD: Duration = Duration::from_millis(500);
const FRAME: Duration = Duration::from_micros(33_333);
const MAX_TICKS: usize = 80;

#[derive(Debug, Clone, PartialEq)]
pub struct OutroCell {
    pub row: usize,
    pub col: usize,
    /// Progress at which the sparkle glyph is painted.
    pub start: f64,
    /// Progress at which the cell is cleared.
    pub end: f64,
    pub glyph: &'static str,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct OutroPlan {
    /// Sorted by `start`.
    pub sparkles: Vec<OutroCell>,
    /// Sorted by `end`.
    pub clears: Vec<OutroCell>,
}

struct Mulberry32(u32);

impl Mulberry32 {
    fn next(&mut self) -> f64 {
        self.0 = self.0.wrapping_add(0x6d2b_79f5);
        let value = self.0;
        let mut next = (value ^ (value >> 15)).wrapping_mul(1 | value);
        next = next.wrapping_add((next ^ (next >> 7)).wrapping_mul(61 | next)) ^ next;
        f64::from(next ^ (next >> 14)) / 4_294_967_296.0
    }

    fn pick(&mut self, values: &[&'static str]) -> &'static str {
        values[((self.next() * values.len() as f64) as usize).min(values.len() - 1)]
    }
}

struct Particle {
    row: usize,
    col: usize,
    release: f64,
    glyph: &'static str,
    velocity_col: f64,
}

/// White dotted fragments accelerating downward and collecting in a floor pile.
pub fn fall_plan(row_widths: &[usize], seed: u32) -> OutroPlan {
    let mut random = Mulberry32(seed);
    let height = row_widths.len().max(1);
    let width = row_widths.iter().copied().max().unwrap_or(0).max(1);
    let floor = height - 1;
    let area = (width * height).max(1) as f64;
    let fragment_chance = (150.0 / area).clamp(0.1, 0.24);
    let mut particles = Vec::<Particle>::new();
    let mut fallback = None::<Particle>;
    let mut sparkles = Vec::new();
    let mut clears = Vec::new();
    for (row, row_width) in row_widths.iter().copied().enumerate() {
        for col in 0..row_width {
            let release = 0.025 + random.next() * 0.13 + (1.0 - row as f64 / height as f64) * 0.035;
            let glyph = random.pick(&FALL_GLYPHS);
            clears.push(OutroCell {
                row,
                col,
                start: release,
                end: release + 0.04,
                glyph,
            });
            if row >= floor {
                continue;
            }
            let velocity_col = (random.next() - 0.5) * 9.0;
            let particle = Particle {
                row,
                col,
                release,
                glyph,
                velocity_col,
            };
            if random.next() < fragment_chance {
                particles.push(particle);
            } else if fallback.is_none() {
                fallback = Some(particle);
            }
        }
    }
    if particles.is_empty()
        && let Some(particle) = fallback
    {
        particles.push(particle);
    }
    let arrival = |particle: &Particle| {
        particle.release + (2.0 * (floor - particle.row) as f64 / GRAVITY).sqrt()
    };
    particles.sort_by(|a, b| arrival(a).total_cmp(&arrival(b)));

    let mut pile_heights = vec![0usize; width];
    for particle in particles {
        let floor_fall_time = (2.0 * (floor - particle.row) as f64 / GRAVITY)
            .sqrt()
            .max(0.05);
        let predicted = (particle.col as f64 + particle.velocity_col * floor_fall_time)
            .round()
            .clamp(0.0, (width - 1) as f64) as usize;
        let mut landing = predicted;
        for radius in 1..=3usize {
            for candidate in [predicted.checked_sub(radius), Some(predicted + radius)]
                .into_iter()
                .flatten()
            {
                if candidate < width && pile_heights[candidate] < pile_heights[landing] {
                    landing = candidate;
                }
            }
        }
        let stack = pile_heights[landing];
        pile_heights[landing] += 1;
        let resting_row = floor
            .saturating_sub(stack)
            .clamp(particle.row + 1, floor.max(particle.row + 1));
        let distance = resting_row.saturating_sub(particle.row).max(1) as f64;
        let fall_time = (2.0 * distance / GRAVITY).sqrt();
        let velocity_col = (landing as f64 - particle.col as f64) / fall_time;
        let steps = ((fall_time / 0.045).ceil() as usize).clamp(4, 14);
        let interval = fall_time / steps as f64;
        for step in 1..steps {
            let elapsed = step as f64 * interval;
            let progress = step as f64 / steps as f64;
            let row = particle.row as f64 + 0.5 * GRAVITY * elapsed * elapsed;
            let col = particle.col as f64
                + velocity_col * elapsed
                + (progress * std::f64::consts::PI).sin() * 0.3;
            let start = (particle.release + elapsed).clamp(0.0, 0.93);
            let cell = OutroCell {
                row: row.round().clamp(0.0, floor as f64) as usize,
                col: col.round().clamp(0.0, (width - 1) as f64) as usize,
                start,
                end: (start + (interval * 0.72).max(0.025)).min(0.96),
                glyph: particle.glyph,
            };
            sparkles.push(cell.clone());
            clears.push(cell);
        }
        let settled = OutroCell {
            row: resting_row.min(floor),
            col: landing,
            start: (particle.release + fall_time).clamp(0.0, 0.93),
            end: 0.97,
            glyph: particle.glyph,
        };
        sparkles.push(settled.clone());
        clears.push(settled);
    }
    sparkles.sort_by(|a, b| a.start.total_cmp(&b.start));
    clears.sort_by(|a, b| a.end.total_cmp(&b.end));
    OutroPlan { sparkles, clears }
}

fn cursor_at(row: usize, col: usize) -> String {
    format!("\x1b[{};{}H", row + 1, col + 1)
}

/// The playback cursor over a plan: how many sparkles and clears earlier ticks already wrote.
#[derive(Debug, Default)]
pub struct OutroCursor {
    sparkle: usize,
    clear: usize,
}

/// Builds one synchronized tick block at `progress`, advancing `cursor`. Returns the block and
/// whether playback is finished; a finished block, including a `force_finish` one, clears the
/// screen so the leave never reveals a half-cleared frame.
pub fn outro_block(
    plan: &OutroPlan,
    cursor: &mut OutroCursor,
    progress: f64,
    force_finish: bool,
) -> (String, bool) {
    let mut output = String::from("\x1b[?2026h\x1b[?25l\x1b[0m");
    while cursor.sparkle < plan.sparkles.len() && plan.sparkles[cursor.sparkle].start <= progress {
        let cell = &plan.sparkles[cursor.sparkle];
        output.push_str(&cursor_at(cell.row, cell.col));
        output.push_str(WHITE);
        output.push_str(cell.glyph);
        cursor.sparkle += 1;
    }
    while cursor.clear < plan.clears.len() && plan.clears[cursor.clear].end <= progress {
        let cell = &plan.clears[cursor.clear];
        output.push_str(&cursor_at(cell.row, cell.col));
        output.push_str("\x1b[0m ");
        cursor.clear += 1;
    }
    let finished = force_finish || cursor.clear >= plan.clears.len() || progress >= 1.0;
    if finished {
        output.push_str("\x1b[2J\x1b[H");
    }
    output.push_str("\x1b[0m\x1b[?2026l");
    (output, finished)
}

/// Builds the blocks for a sequence of tick progress values, finishing at the last one.
pub fn outro_blocks(plan: &OutroPlan, ticks: &[f64]) -> Vec<String> {
    let mut cursor = OutroCursor::default();
    let mut blocks = Vec::new();
    for (index, progress) in ticks.iter().copied().enumerate() {
        let (block, finished) = outro_block(plan, &mut cursor, progress, index + 1 == ticks.len());
        blocks.push(block);
        if finished {
            break;
        }
    }
    blocks
}

/// Plays the fall outro over the presented screen. Write failures end playback; the caller
/// restores the terminal either way.
pub fn play(row_widths: &[usize], seed: u32, mut write: impl FnMut(&[u8]) -> bool) {
    let plan = fall_plan(row_widths, seed);
    if plan.clears.is_empty() {
        return;
    }
    let started = Instant::now();
    let mut cursor = OutroCursor::default();
    for tick in 0..MAX_TICKS {
        let elapsed = started.elapsed();
        let progress = (elapsed.as_secs_f64() / QUIT_OUTRO_DURATION.as_secs_f64()).min(1.0);
        let overdue = elapsed > QUIT_OUTRO_DURATION + QUIT_OUTRO_GUARD || tick + 1 == MAX_TICKS;
        let (block, finished) = outro_block(&plan, &mut cursor, progress, overdue);
        if !write(block.as_bytes()) || finished {
            return;
        }
        std::thread::sleep(FRAME);
    }
}

/// Per-row visible widths of the presented outer screen: the full strip row, then each child
/// row up to its last visible glyph.
pub fn presented_row_widths(
    columns: u16,
    outer_rows: u16,
    child_row_offset: u16,
    surface: Option<&crate::protocol::StructuredSurface>,
) -> Vec<usize> {
    let mut widths = vec![0usize; usize::from(outer_rows)];
    let strip_row = if child_row_offset == 0 {
        usize::from(outer_rows.saturating_sub(1))
    } else {
        0
    };
    if let Some(width) = widths.get_mut(strip_row) {
        *width = usize::from(columns);
    }
    if let Some(surface) = surface {
        for (index, row) in surface.row_data.iter().enumerate() {
            let Some(width) = widths.get_mut(index + usize::from(child_row_offset)) else {
                break;
            };
            // Invariant: solo measures each presented line including its painted padding, so a
            // cell counts when it shows a glyph or a background of its own.
            let mut visible = 0usize;
            for (column, cell) in row.cells.iter().enumerate() {
                let painted = surface
                    .styles
                    .get(usize::from(cell.style))
                    .is_some_and(|style| {
                        style.inverse || style.background != crate::protocol::SurfaceColor::Default
                    });
                if painted || !cell.text.trim().is_empty() {
                    visible = column + usize::from(cell.width.max(1));
                }
            }
            *width = visible.min(usize::from(columns));
        }
    }
    widths
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mulberry32_matches_the_typescript_generator() {
        // Provenance: Values produced by quit-outro-effects.ts `mulberry32(1)` in Node.
        let mut random = Mulberry32(1);
        for expected in [
            0.627_073_940_588_161_3,
            0.002_735_721_180_215_478,
            0.527_447_039_959_952_2,
        ] {
            let value = random.next();
            assert!((value - expected).abs() < 1e-15, "{value} != {expected}");
        }
    }

    #[test]
    fn fall_plan_clears_every_presented_cell_and_lands_fragments_on_the_floor() {
        let widths = [10, 6, 0, 8];
        let plan = fall_plan(&widths, 7);
        for (row, width) in widths.iter().copied().enumerate() {
            for col in 0..width {
                assert!(
                    plan.clears
                        .iter()
                        .any(|cell| cell.row == row && cell.col == col),
                    "cell {row},{col} is never cleared"
                );
            }
        }
        assert!(!plan.sparkles.is_empty());
        assert!(
            plan.sparkles
                .windows(2)
                .all(|pair| pair[0].start <= pair[1].start)
        );
        assert!(
            plan.clears
                .windows(2)
                .all(|pair| pair[0].end <= pair[1].end)
        );
        assert!(
            plan.sparkles
                .iter()
                .all(|cell| cell.row < widths.len() && cell.col < 10)
        );
        assert!(
            plan.sparkles
                .iter()
                .any(|cell| cell.row == widths.len() - 1)
        );
        assert_eq!(fall_plan(&widths, 7), plan, "a fixed seed is deterministic");
    }

    #[test]
    fn outro_blocks_are_synchronized_and_end_on_a_blank_screen() {
        let plan = fall_plan(&[4, 4, 4], 3);
        let blocks = outro_blocks(&plan, &[0.0, 0.3, 0.6, 1.0]);
        assert!(!blocks.is_empty());
        for block in &blocks {
            assert!(block.starts_with("\x1b[?2026h") && block.ends_with("\x1b[?2026l"));
        }
        assert!(blocks.last().unwrap().contains("\x1b[2J\x1b[H"));
        assert!(blocks.iter().any(|block| block.contains(WHITE)));
    }

    #[test]
    fn playback_is_bounded_and_finishes_blank() {
        let mut writes = Vec::<String>::new();
        let started = Instant::now();
        play(&[20, 20, 20, 20], 11, |bytes| {
            writes.push(String::from_utf8_lossy(bytes).into_owned());
            true
        });
        let elapsed = started.elapsed();
        assert!(elapsed < QUIT_OUTRO_DURATION + QUIT_OUTRO_GUARD + FRAME * 4);
        assert!(
            elapsed >= QUIT_OUTRO_DURATION - FRAME * 2,
            "the animation plays for its duration, not one frame: {elapsed:?}"
        );
        // Platform: hosted runners oversleep 33 ms frames, so only a multi-frame playback is required.
        assert!(
            writes.len() >= 5,
            "only {} frames were written",
            writes.len()
        );
        assert_eq!(
            writes
                .iter()
                .filter(|block| block.contains("\x1b[2J"))
                .count(),
            1,
            "only the final block clears the screen"
        );
        assert!(writes.last().unwrap().contains("\x1b[2J"));
        assert!(
            writes[..writes.len() - 1]
                .iter()
                .any(|block| block.contains(WHITE))
        );
        let mut stopped = 0;
        play(&[20, 20], 11, |_| {
            stopped += 1;
            false
        });
        assert_eq!(stopped, 1, "a failed write ends playback");
        let mut empty = 0;
        play(&[0, 0], 11, |_| {
            empty += 1;
            true
        });
        assert_eq!(empty, 0, "a blank screen does not animate");
    }

    #[test]
    fn presented_widths_cover_the_strip_and_visible_child_text() {
        let mut surface = crate::protocol::StructuredSurface::default();
        let cell = |text: &str| crate::protocol::SurfaceCell {
            text: text.into(),
            width: 1,
            ..Default::default()
        };
        surface.row_data = vec![
            crate::protocol::SurfaceRow {
                cells: vec![cell("a"), cell("b"), cell(" "), cell(" ")],
            },
            crate::protocol::SurfaceRow {
                cells: vec![cell(" "), cell(" ")],
            },
        ];
        assert_eq!(
            presented_row_widths(6, 4, 1, Some(&surface)),
            vec![6, 2, 0, 0]
        );

        // Invariant: A highlighted row with blank padding dissolves across its painted width, as in solo.
        surface.styles = vec![
            crate::protocol::SurfaceStyle::default(),
            crate::protocol::SurfaceStyle {
                background: crate::protocol::SurfaceColor::Rgb([40, 40, 40]),
                ..Default::default()
            },
        ];
        surface.row_data[1].cells[1].style = 1;
        assert_eq!(
            presented_row_widths(6, 4, 1, Some(&surface)),
            vec![6, 2, 2, 0]
        );
        assert_eq!(
            presented_row_widths(6, 4, 0, Some(&surface)),
            vec![2, 2, 0, 6],
            "a bottom strip and every child row are covered exactly once"
        );
        assert_eq!(presented_row_widths(6, 2, 1, None), vec![6, 0]);
        assert_eq!(presented_row_widths(6, 2, 0, None), vec![0, 6]);
    }
}
