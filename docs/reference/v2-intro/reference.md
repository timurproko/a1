# V2-derived intro reference (WS-INTRO-001)

## Source located

The available v2 behavior source is the clean adjacent checkout at:

`D:/Git/oh-my-pi/packages/coding-agent/src/modes/components/welcome.ts`

Checkout HEAD: `59619623e1eeb7c290649eeaf3a269284ce8adef`; the source file's last commit is `6bd51d4ad32aefe59081eb335af5ef09953dc2a8` (2026-07-12). AddOne does not import this checkout. This record captures observable behavior and the new implementation owns a rewritten projection.

## Observable sequence

- A five-row, twelve-cell block logo is presented inside the welcome composition.
- Animation starts immediately, requests a frame at t=0, then requests frames every 33 ms (about 30 fps).
- Total duration is 3000 ms. The final callback stops animation and renders a distinct resting frame.
- Gradient motion uses cubic ease-out over 2.5 reverse rotations. A separate shine crosses the diagonal three times and fades with the eased progress.
- Non-space logo cells receive individual colors; spaces remain unpainted. The logo dimensions never change between frames.
- Completion state has phase 0, no shine, no timer, and a cacheable stable frame.

## Color contract

Truecolor interpolation uses these stops in order: `#ff5cc8`, `#c86eff`, `#7882ff`, `#3cc8ff`, `#78ffdc`. The terminal-256 fallback ramp is 199, 171, 135, 99, 75, 51, 87. The shine band has normalized half-width 0.18 and blends toward white.

## Normalized checkpoints

`checkpoints.json` records the release reference. Normalization retains cells, logo geometry, phase/shine state, and semantic color-stop names rather than raw ANSI write segmentation. Stable checkpoints are t=0, 750, 1500, 2250, 2999, and the completed shell transition at t=3000. The final checkpoint is `complete`, not an animation frame.
