# Tasks

## 1. Direct model cycling

- [x] 1.1 Assign the bare-A1 Ctrl+M default to the existing forward cycle workflow: all available models when unscoped, otherwise only available models in scope; leave model selection without a replacement default chord.
- [x] 1.2 Align effective shortcut help and user documentation with cycling versus explicit model selection and Launcher naming.
- [x] 1.3 Add focused tests for unscoped cycling, scoped cycling, clearing scope, wraparound, zero/one-eligible-model behavior, no selector, effective overrides, unchanged comparison bindings, legacy Enter, and unchanged warning/failure visibility.

## 2. In-place Models selection

- [x] 2.1 Restore the pre-Apps unified Models dock integration and styling while retaining deferred controller loading.
- [x] 2.2 Preserve search, scope filtering/editing/ordering/saving, prompt restoration, and transcript scroll/copy behavior across selection and cancellation.
- [x] 2.3 Update focused selector and shell tests to assert the in-place surface and input ownership rather than a floating overlay.

## 3. Launcher presentation

- [x] 3.1 Rename visible Apps title and related help/loading/error/close copy to Launcher, omitting the description and any reserved subtitle row.
- [x] 3.2 Preserve Ctrl+P application switching, state retention, focus isolation, and shared floating-modal contrast.
- [x] 3.3 Update focused dialog, cross-application, and presentation tests for the new copy and unchanged lifecycle.

## 4. Delivery preparation

- [x] 4.1 Update implementation evidence and any affected source-port provenance records; disposition every known gap.
- [x] 4.2 Run bounded affected tests, typecheck, strict OpenSpec validation, and applicable architecture/provenance/documentation checks.
- [x] 4.3 Prepare plain acceptance outcomes and reconcile current origin/develop before completing the final PR implementation outcome for trusted readiness and finalization.
