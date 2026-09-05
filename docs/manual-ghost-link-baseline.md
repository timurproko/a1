# Ghost hyperlink underline baseline

## Status and scope

This is the diagnostic stage of `fix-ghost-link-underlines`, accepted in specification PR #237. It does **not** repair production rendering or claim the screenshot's root cause is proven.

Two executable regressions reproduce the code gaps: the damage adapter removes a requested full clear when the last visible link disappears; the viewport controller does not request cleanup when a hovered link changes bounds on the same row with the same target. Both were run as ordinary tests and failed at those exact assertions, with the other 22 controller/adapter tests passing. During baseline review they use Vitest's `it.fails`, not a skip: the known failure must still occur, and an unexpected pass fails the suite. The repair must remove those markers in tasks 2.2 and 3.2.

The standalone protocol fixture drives the **real A1 damage adapter** with the pinned complete-row write grammar. It does not launch A1, Pi, or an agent and does not simulate their complete rendering/input pipeline. In particular it cannot establish shell overlay, selection, or streaming acceptance. It separates emitted-byte evidence from the host's native-hover decoration so those later tests do not mistake a passing controller assertion for a fixed visual bug.

## Confirmed physical baseline

The user reports that in **mode 2 (auto-detected)**, wheel scrolling moves the hovered link upward while its underline remains under the stationary pointer briefly, then disappears. That transient trail is a failure, not successful cleanup.

The clean `f3613bb` run at 123 columns by 29 rows (`run-smbQ70/trace.jsonl`) records `ghost: true` in auto-detected mode after a downward wheel scroll at scroll position 9. The immediately preceding frame, 214, contains no explicit OSC 8 target opens, and the adapter reports `suppressed-redundant-clear`; its forwarded write has no full-screen clear. This confirms an auto-detection reproduction but does not prove that restoring the clear will fix it. The recorded one-shot `f` comparisons were in explicit mode, with no observation establishing their effect on the auto-detected case. Terminal version and the precise host detection setting remain unrecorded.

The persistent-clear comparison below avoids asking the user to press `f` before the short-lived artifact disappears. It changes the diagnostic write path only; production behavior and terminal settings remain unchanged. The user reports that **CLEAR:ON helps** for the confirmed mode-2 case. This supports preserving the complete clear in the production repair, but does not by itself prove the artifact is completely absent in the built A1 candidate.

The test host is Windows Terminal `1.24.2607.10001`, determined from the running executable after the comparison. Its settings file contains no explicit global, profile-default, or per-profile `experimental.detectURLs` override; therefore the effective host default applies. The fixture geometry was 123 by 29. Explicit-mode reproduction remains unconfirmed and is recorded as unknown rather than assumed clean.

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

## Persistent clear comparison for the confirmed auto-detection case

```sh
./scripts/pi/reproduce-ghost-link-underlines --auto --preserve-clears
```

This starts directly in mode 2 with **CLEAR:ON**. Every frame, including every wheel-scroll frame, sends the requested complete synchronized clear-and-repaint directly to the terminal. It is a labelled control experiment, not an implemented A1 fix.

Hover a link and scroll with the wheel while keeping the pointer stationary. Record **y** if any underline trail remains, even if it disappears shortly afterward; record **n** only if this case stays clean. Press **p** to switch to **CLEAR:OFF**, restore the same content position with **r**, and compare the same gesture through the existing adapter. **p** persists across subsequent scrolls, mode changes, and resets. The status row always shows its state. Press **q** to exit.

Trace format 2 records `preserveClears` and actual `bypass` state separately on frames and observations. If the trail survives CLEAR:ON, merely preserving the full clear is insufficient for this reproduced host behavior; further diagnosis is required before choosing the production cleanup strategy.

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

Baseline task 1.2 remains incomplete: the mode-2 failure, host facts, and a helpful persistent-clear comparison are recorded, but explicit-mode and fully-clean control outcomes have not been confirmed. The remaining production repair and exact-candidate acceptance tasks remain open. If the preserved-clear control still ghosts, that is evidence to investigate before assuming clear preservation alone is sufficient.
