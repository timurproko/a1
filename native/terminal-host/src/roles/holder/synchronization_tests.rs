use super::*;
use crate::ghostty::SynchronizedOutputBoundary::{Begin, End};
use std::time::Instant;

#[test]
fn sustained_between_marker_frames_publish_before_input_stops() {
    let started = Instant::now();
    let mut state = SynchronizationState::new(false);
    let mut publications = Vec::new();
    for ms in 0..600u64 {
        let now = started + Duration::from_millis(ms);
        match ms % 30 {
            0 => {
                if state.observe(Begin, now) && ms != 0 {
                    publications.push(ms);
                    state.published();
                }
            }
            1 => state.note_output(now),
            2 => assert!(!state.observe(End, now)),
            _ => {}
        }
        if state.render_pass_due.is_some() && state.may_publish(now) {
            publications.push(ms);
            state.published();
        }
    }
    assert_eq!(publications.first(), Some(&18));
    assert!(publications.len() >= 8, "{publications:?}");
    assert!(publications.windows(2).all(|pair| pair[1] - pair[0] <= 60));
}

#[test]
fn later_end_markers_never_renew_the_pending_deadline() {
    let started = Instant::now();
    let mut state = SynchronizationState::new(false);
    state.observe(Begin, started);
    state.note_output(started + Duration::from_millis(1));
    state.observe(End, started + Duration::from_millis(2));
    let due = state.render_pass_due.unwrap();
    state.observe(Begin, started + Duration::from_millis(10));
    state.note_output(started + Duration::from_millis(11));
    state.observe(End, started + Duration::from_millis(12));
    assert_eq!(state.render_pass_due, Some(due));
    assert!(!state.may_publish(due - Duration::from_millis(1)));
    assert!(state.may_publish(due));
}

#[test]
fn continuous_post_end_fragments_cannot_extend_the_hard_bound() {
    let started = Instant::now();
    let mut state = SynchronizationState::new(false);
    state.observe(Begin, started);
    state.observe(End, started);
    for ms in 1..=16 {
        let now = started + Duration::from_millis(ms);
        state.note_output(now);
        assert_eq!(state.may_publish(now), ms == 16);
        assert_eq!(state.render_pass_due, Some(started + RENDER_PASS_WAIT));
    }
}

#[test]
fn pending_deadline_does_not_expose_an_open_transaction() {
    let started = Instant::now();
    let mut state = SynchronizationState::new(false);
    state.observe(Begin, started);
    state.observe(End, started);
    state.observe(Begin, started + Duration::from_millis(10));
    state.note_output(started + Duration::from_millis(11));
    assert!(!state.may_publish(started + RENDER_PASS_WAIT));
    assert!(!state.observe(Begin, started + RENDER_PASS_WAIT));
    assert!(!state.may_publish(started + Duration::from_millis(200)));
    assert!(state.recover_if_due(started + Duration::from_millis(280)));
    assert!(state.may_publish(started + Duration::from_millis(280)));
    state.published();
    assert!(state.open);
    assert_eq!(state.commit_kind(), SurfaceCommitKind::Recovery);
}

#[test]
fn consuming_a_publication_restores_the_next_pass_coherence_gate() {
    let started = Instant::now();
    let mut state = SynchronizationState::new(false);
    state.observe(Begin, started);
    state.observe(End, started);
    assert!(state.may_publish(started + RENDER_PASS_WAIT));
    state.published();
    let next = started + Duration::from_millis(100);
    assert!(state.observe(Begin, next));
    state.observe(End, next);
    assert!(!state.may_publish(next));
    assert_eq!(state.render_pass_due, Some(next + RENDER_PASS_WAIT));
    state.note_output(next + Duration::from_millis(1));
    assert!(!state.may_publish(next + Duration::from_millis(2)));
    assert!(state.may_publish(next + Duration::from_millis(3)));
}

#[test]
fn native_retained_cells_advance_during_sustained_relayed_frames() {
    let started = Instant::now();
    let mut terminal = GhosttyTerminal::new(10, 2).unwrap();
    let mut builder = RetainedSurfaceBuilder::default();
    let mut state = SynchronizationState::new(false);
    let mut changed = false;
    let mut seen = Vec::new();
    for ms in 0..600u64 {
        let now = started + Duration::from_millis(ms);
        let bytes = match ms % 30 {
            0 => b"\x1b[?2026h".to_vec(),
            1 => format!("\x1b[1;1H{:02}", ms / 30).into_bytes(),
            2 => b"\x1b[?2026l".to_vec(),
            _ => Vec::new(),
        };
        if !bytes.is_empty() {
            let (_, boundary) = state.feed(&mut terminal, &bytes).unwrap();
            changed = true;
            let publish = match boundary {
                Some(boundary) => state.observe(boundary, now),
                None => {
                    state.note_output(now);
                    false
                }
            };
            if publish {
                // Protocol: a begin boundary precedes the new frame's cells, just as in the holder loop.
                let _ =
                    CommittedSurface::capture(&mut terminal, &mut builder, 0, state.commit_kind())
                        .unwrap();
                state.published();
                changed = false;
            }
        }
        if changed && state.may_publish(now) {
            let capture =
                CommittedSurface::capture(&mut terminal, &mut builder, 0, state.commit_kind())
                    .unwrap();
            let surface = capture.retained.structured().unwrap();
            let text: String = surface.row_data[0]
                .cells
                .iter()
                .map(|cell| cell.text.as_str())
                .collect();
            seen.push((ms, text));
            assert!(!state.open);
            state.published();
            changed = false;
        }
    }
    assert!(seen.len() >= 8, "{seen:?}");
    assert_eq!(seen[0].0, 18);
    assert!(seen[0].1.starts_with("00"), "{seen:?}");
    assert!(seen.last().unwrap().1.starts_with("19"), "{seen:?}");
}
