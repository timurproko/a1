## Context

The resident attach client (`native/terminal-host/src/roles/attach.rs`) reads outer-terminal events through crossterm. `input()` first applies platform admission (`admit_alt_code_input`, which takes the platform as a parameter so tests can exercise Windows behavior anywhere). `key()` then resolves `self.bindings.action(&key)` from `key_token(code, modifiers)`. A matched action is consumed by the attach state machine; an unmatched key is encoded and forwarded to the child. On Unix the client enables the kitty keyboard protocol at level 1 (`ESC[>1u`, disambiguate only).

macOS terminals send Option+key as the character from the keyboard layout's Option layer unless the user enables an Option-as-Alt setting. Ghostty (`macos-option-as-alt`), Terminal.app ("Use Option as Meta key"), and iTerm2 ("Esc+") all default to characters, and kitty disambiguate mode still reports a text-producing key as its text. Observed in Ghostty: Option+1, 2, 3 typed `¡™£` into the prompt and no tab action ran.

## Goals / Non-Goals

**Goals:** Default tab shortcuts and any user Alt bindings for tab actions work with Option on a stock macOS terminal configuration, consume the key instead of typing a symbol, and stay covered by deterministic tests on every CI platform.

**Non-Goals:** Changing pinned Pi verbatim text, raising the kitty keyboard protocol level, mapping non-ABC/US Option layers, handling dead keys (Option+E, I, N, U, and backtick compose and send nothing on their own), or remapping Option for keys the child or Pi bind.

## Decisions

- **Map only bound tab chords.** Add `admit_option_shortcut(macos, bindings, key)`, applied at the start of `key()`. When `macos` is true and the key is an unmodified (or Shift-only) press, repeat, or release of `KeyCode::Char(c)`, look up `c` in a fixed ABC/US Option-layer table to its base key. If `alt+<base>` resolves to a tab action, return the key as `Char(base)` with `ALT`; otherwise return it unchanged. Mapping only bound chords keeps every other Option character typable (`π`, `ø`, `≈`, `µ`, and `å` once `tabs.new` is rebound). Keeping the table in one constant makes it reviewable and testable.
- **Table.** Digits `1`–`0`: `¡ ™ £ ¢ ∞ § ¶ • ª º`. Letters without dead keys: `a å`, `b ∫`, `c ç`, `d ∂`, `f ƒ`, `g ©`, `h ˙`, `j ∆`, `k ˚`, `l ¬`, `m µ`, `o ø`, `p π`, `q œ`, `r ®`, `s ß`, `t †`, `v √`, `w ∑`, `x ≈`, `y ¥`, `z Ω`. Punctuation: `, ≤`, `. ≥`, `/ ÷`, `; …`, `' æ`, `[ “`, `] ‘`, `\ «`, `- –`, `= ≠`.
- **Only ABC and U.S. layouts.** The table is the ABC/US Option layer, but `å` is a letter key on Swedish, Norwegian, Danish, and Finnish layouts, `£` and `§` are keys on UK and other European layouts, and `¡` is a Spanish key. Mapping them unconditionally would swallow real typing. The candidate is therefore mapped only when `com.apple.HIToolbox` `AppleCurrentKeyboardLayoutInputSourceID` (read with `/usr/bin/defaults`) is `com.apple.keylayout.ABC` or `com.apple.keylayout.US`. The read happens only for a bound candidate and is cached for one second, so ordinary typing never spawns a process and a layout switch applies promptly. The check is a closure argument, so tests choose it and prove it is never invoked for unbound, modified, or non-macOS keys. The first PR validation exposed this: the resident interaction parity harness, which double-encoded its Unicode case into `å…`, saw the resident client swallow `å`.
- **Harness encoding.** `verify-interaction-parity.mjs` wrote each step as `chunk.toString("latin1")` to node-pty, which encodes written strings as UTF-8, so every non-ASCII step reached both children double-encoded and `prompt.type-unicode` never typed `开发 é`. It now writes the UTF-8 string, so the case exercises real wide and combining text.
- **Platform as a parameter.** Production passes `cfg!(target_os = "macos")`, mirroring `admit_alt_code_input(cfg!(windows), …)`, so Windows and Linux CI run the macOS cases too and real Alt input is unaffected on every platform.
- **Where it applies.** Before the binding lookup in `key()`, so the existing consume-or-forward contract holds: a mapped chord is consumed by the same action path as a real Alt chord, including palette, popup, and failed-banner states that already receive the action.

- **One label system: `Option+`.** Pinned Pi already names Alt `Option` on macOS in the Keyboard Shortcuts table, the models, thinking, and tree dialogs, and the footer, and those surfaces are held to Pi parity. macOS menu symbols (`⌥W`) would split labels into two styles. A1 therefore names Alt `Option` in every remaining formatter: the attach client's `shortcut_label` (tab menus, Commands palette, and `+` menu), its `shortcut_hints` footer formatter, the shared TypeScript `displayShortcutKeyLabel`, and the resident changelog refusal message. The TypeScript formatter reads `process.platform` per call so tests that simulate Windows or Linux keep `Alt`; the attach client carries the platform in `TabBindings`, with a test-only override, so its label tests hold on every CI host. The failed-tab banner names the effective close label instead of a fixed `Alt+W`. The two TypeScript additions raise the startup source-byte baseline by 221 bytes.

## Risks / Trade-offs

- A user who types a mapped character on purpose, for example `å` with Option+A on the ABC layout, loses it while `alt+a` is bound to `tabs.new`. Rebinding `tabs.new` restores typing. Users of other layouts are unaffected, because their Option characters differ from the table, and can still enable their terminal's Option-as-Alt setting.
- A pasted or IME-committed single mapped character arrives as a key only when the terminal sends it as a key event. Bracketed paste arrives as `Paste` and is not mapped.

## Migration Plan

No configuration or data migration. Terminals already sending Option as Alt keep the existing path.
