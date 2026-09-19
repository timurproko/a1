## Context

`SkillsSelectorComponent.#updateList` added the selected description as a pi-tui `Text`, which wraps to the render width. Descriptions such as the OpenSpec skill descriptions run well past a typical terminal width, so the dialog grew by a row or two whenever such a skill was selected.

## Decision

Swap the description row's `Text` for the pinned pi-tui `TruncatedText` component. It reads only the first line of the string, truncates it to the render width with the pinned `...` marker, and pads to width, so the row height is constant. No A1-side width arithmetic is needed because the component receives the dialog's render width directly.

## Risks

- The startup-graph source byte baseline has no headroom; the added import moves it by 125 bytes and the baseline is refreshed in the same change.
