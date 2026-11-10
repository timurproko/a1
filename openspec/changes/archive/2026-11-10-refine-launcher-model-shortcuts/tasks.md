# Tasks

## 1. Direct model cycling

- [x] 1.1 Assign the bare-A1 Ctrl+M default to the existing forward cycle workflow: all available models when unscoped, otherwise only available models in scope; leave model selection without a replacement default chord.
- [x] 1.2 Align effective shortcut help and user documentation with cycling versus explicit model selection and Launcher naming.
- [x] 1.3 Add focused tests for unscoped cycling, scoped cycling, clearing scope, wraparound, zero/one-eligible-model behavior, no selector, effective overrides, unchanged comparison bindings, legacy Enter, and unchanged warning/failure visibility.

## 2. In-place Models selection

- [x] 2.1 Restore the pre-Apps unified Models dock integration and styling while retaining deferred controller loading.
- [x] 2.2 Preserve search, scope filtering/editing/ordering/saving, prompt restoration, and transcript scroll/copy behavior across selection and cancellation.
- [x] 2.3 Update focused selector and shell tests to assert the in-place surface and input ownership rather than a floating overlay.

- [x] 2.4 Open Models atomically without loading or refresh-status text, preserving early input, cancellation, deferred loading, and visible failures.

- [x] 2.5 Align compaction selector ownership coverage with the restored input dock, retaining transcript scroll isolation and explicit draft restoration.

## 3. Launcher presentation

- [x] 3.1 Rename visible Apps title and related help/loading/error/close copy to Launcher, omitting the description and any reserved subtitle row.
- [x] 3.2 Preserve Ctrl+P application switching, state retention, focus isolation, and shared floating-modal contrast.
- [x] 3.3 Update focused dialog, cross-application, and presentation tests for the new copy and unchanged lifecycle.

## 4. Hotkeys application

- [x] 4.1 Add searchable Hotkeys to Launcher using the existing reference-screen route and effective shortcuts document.
- [x] 4.2 Remove built-in Hotkeys from bare-A1 Agent catalog, completion, help, and route dispatch while preserving comparison and unrelated resource/extension commands.
- [x] 4.3 Add focused coverage for Launcher discovery, navigation from Hotkeys and back, same-app preservation, input isolation, live shortcut content, and comparison command behavior.

## 5. Delivery preparation

- [x] 5.1 Update implementation evidence and any affected source-port provenance records; disposition every known gap.
- [x] 5.2 Run bounded affected tests, typecheck, strict OpenSpec validation, and applicable architecture/provenance/documentation checks.
- [x] 5.3 Prepare plain acceptance outcomes and reconcile current origin/develop before completing the final PR implementation outcome for trusted readiness and finalization.
