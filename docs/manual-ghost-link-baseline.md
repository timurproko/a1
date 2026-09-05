# Ghost hyperlink underline baseline

## Status and scope

This is the diagnostic stage of `fix-ghost-link-underlines`, accepted in specification PR #237. It does **not** repair production rendering or claim the screenshot's root cause is proven.

Two executable regressions reproduce the code gaps: the damage adapter removes a requested full clear when the last visible link disappears; the viewport controller does not request cleanup when a hovered link changes bounds on the same row with the same target. Both were run as ordinary tests and failed at those exact assertions, with the other 22 controller/adapter tests passing. During baseline review they use Vitest's `it.fails`, not a skip: the known failure must still occur, and an unexpected pass fails the suite. The repair must remove those markers in tasks 2.2 and 3.2.

The standalone protocol fixture drives the **real A1 damage adapter** with the pinned complete-row write grammar. It does not launch A1, Pi, or an agent and does not simulate their complete rendering/input pipeline. In particular it cannot establish shell overlay, selection, or streaming acceptance. It separates emitted-byte evidence from the host's native-hover decoration so those later tests do not mistake a passing controller assertion for a fixed visual bug.

## Run in Windows Terminal / Git Bash

From the implementation checkout, with dependencies installed:

```sh
./scripts/pi/reproduce-ghost-link-underlines
```

This shell entry preserves VT color. It uses `tsx` directly, so no application build is needed for this standalone probe. It is not a substitute for the eventual built-candidate `./scripts/dev` acceptance run.

Optional host facts can be recorded explicitly; use the actual version from Windows Terminal's About page and the actual automatic URL-detection setting, without changing either:

```sh
./scripts/pi/reproduce-ghost-link-underlines --terminal-version YOUR_VERSION --url-detection enabled
```

Missing facts are recorded as `unknown`, not inferred. Use a terminal wide enough to display the controls (192 columns by 54 rows is a useful comparison geometry).

## Observe and record

1. Press **1** for explicit OSC 8 links. Hover the long label, a file label, or a wrapped URL. Keep the pointer stationary and press **x** to replace the content with blank green rows. Also inspect those former cells by hovering them again.
2. Press **y** if a ghost underline is visible or **n** if the current case is clean. These keys record a **human** observation of the preceding action; capture a screenshot before pressing them because feedback itself repaints.
3. If a ghost is visible, press **f**. This sends the complete clear directly to the terminal, bypassing the optimizer for this one control experiment. Record **y** or **n** again. The trace labels bypass writes so they cannot be mistaken for production output.
4. Press **r** to restore the current mode. Hover the long label at its left side and press **b** to shorten/reposition it. Record the result. This visual fixture does not exercise the controller's hover-key logic; the controller regression covers that independently.
5. Restore with **r** and use the wheel or **j/k** to scroll while the pointer remains stationary. Scroll until all links are above the screen, then hover plain text and blank rows. Record the result, including cases that do **not** reproduce.
6. Press **2** for the same labels without explicit OSC 8 targets; repeat blanking, scrolling, and the forced-clear comparison. Whether these labels become links is controlled by Windows Terminal's own detection. The file-like tool rows are deliberately not wrapped in OSC 8 in either mode.
7. Press **q** or Ctrl+C to restore the terminal. Report the terminal version, automatic URL-detection setting, observations, and screenshot if the symptom occurs.

The fixture does not implement link activation. The host may still handle its normal hyperlink gestures; the explicit file target is this checkout's `package.json`, and web targets use the reserved `example.invalid` domain.

## Evidence and limitations

Each run creates its own ignored `.artifacts/ghost-link-baseline/run-*/trace.jsonl`. It records checkout commit and dirty status, supplied host facts, geometry, requested writes, actual forwarded writes, adapter decisions, probe input, and explicit human observations. It captures only the synthetic fixture, not an agent conversation. Review local file targets before sharing the trace.

For noninteractive protocol evidence:

```sh
./scripts/pi/reproduce-ghost-link-underlines --capture
```

Capture mode always records `physical-result: not-observed`. Final text, closed OSC 8 sequences, and a preserved clear cannot prove that Windows Terminal discarded its hover overlay. A clean probe also does not disprove the original A1 screenshot: the complete UI pipeline still needs review.

Baseline task 1.2 remains incomplete until physical observations and host facts are recorded. The remaining production repair and exact-candidate acceptance tasks remain open. If the preserved-clear control still ghosts, that is evidence to investigate before assuming clear preservation alone is sufficient.
