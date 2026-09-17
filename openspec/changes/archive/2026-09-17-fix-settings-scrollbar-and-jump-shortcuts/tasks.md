## 1. Follow the shared scrollbar settings

- [x] 1.1 Resolve the effective live `scrollbarAppearance` and `scrollbarStyle` in the settings app through one helper shared with the existing speed lookup, keeping `scrollbarWheelRows(this.#scrollbarSpeed())` for wheel distance; verify a pending accepted value is used before source reflection.
- [x] 1.2 Present the settings rail through `scrollbarPresentation` and a keyed `ScrollbarRails` state with the transcript's scroll activity window and fade timer, extending `withScrollbarRail` to honor reservation, visibility, and glyphs; verify `auto` reserves a blank rail, lights it on a scroll and fades it after the linger, `always` draws thin or thick, `hidden` releases the columns, and changing the mode on the screen updates the rail on the next frame.
- [x] 1.3 Give the rail pointer ownership: hover reveal and thick thumb, thumb drag with grab offset, track paging, and hover clearing when the pointer leaves; verify no row hover is set by rail motion, wheel ownership is unchanged, and the dialog and menu keep precedence.

## 2. Use the content-boundary chords

- [x] 2.1 Declare `ctrl+home`/`ctrl+end` for the first and last setting, drop the `home`/`end` declarations, and extend the key table with the xterm modifier and rxvt Ctrl encodings; verify both encodings jump in the list and `Ctrl+Home` restores the opening scroll position.
- [x] 2.2 Route the Ctrl chords through the search branch and let unmodified `Home`/`End` reach the shared line input; verify search-cursor movement leaves the selection alone and the list ignores unmodified keys.
- [x] 2.3 Retarget existing settings fixtures by intent and keep the shortcut governance tests green; verify the status bar hints are unchanged and no conflict is reported by the registry.

## 3. Validate the integrated candidate

- [x] 3.1 Run the settings, component, and governance suites plus typecheck and the governance commands on the candidate and record the outcomes; the ready head's exact-head CI run then validates the same suites for the maintainer.
- [x] 3.2 Present a built candidate for Windows Terminal/Git Bash acceptance and record the user's result for the scrollbar modes and styles on the settings screen, rail scroll reveal, hover, and drag, and `Ctrl+Home`/`Ctrl+End` in the list and in search; verify acceptance refers to the exact candidate commit before requesting merge.
