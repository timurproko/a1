## Why

Contextual prompt suggestions are correctly emitted as faint ghost text by the A1 editor, but resident multi-agent tabs repaint their retained libghostty surface without the terminal's faint attribute. The resident host therefore turns an unaccepted suggestion white, making inert generated text look like ordinary user input before Tab acceptance.

## What Changes

- Preserve the faint cell attribute when the resident terminal host converts libghostty render-state cells back into ANSI frames.
- Keep selected cells and ordinary accepted/typed prompt text at normal intensity, so only the unaccepted suggestion is dimmed and Tab acceptance visibly promotes it to white editable text.
- Extend the native terminal-fidelity probe and its verification gate to fail if faint styling is lost during resident frame composition or leaks into a subsequent normal-intensity repaint.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `resident-terminal-host`: retained and reattached resident surfaces preserve faint intensity as part of their terminal cell attributes, including contextual suggestion ghost text.

## Impact

The change is confined to native resident terminal frame composition, the existing terminal-fidelity probe and verifier, and focused regression coverage. It does not change suggestion generation, acceptance keybindings, prompt semantics, protocol shapes, or the direct single-agent rendering path.
