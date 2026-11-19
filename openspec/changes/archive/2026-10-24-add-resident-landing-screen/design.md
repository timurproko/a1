# Design

## Context

With no resident tab to show, the attach client drew a strip with a lone `+`, the clock, and a blank body. The landing gives that state a face that names the product and its version. The landing is presented by the native attach role, which has no access to the owned TypeScript theme, so the colors it shares with an Agent tab must be pinned and checked.

## Decisions

### 1. The landing is an attach-owned legacy body

`roles/landing.rs` renders pure bytes for the frame's legacy body; `roles/attach.rs` presents them whenever no tab is viewed or requested after tabs were shown. The strip, clock, hover, popups, and notices compose over it unchanged, and no cursor shows. The landing holds no input, so keys and body mouse reports reach no child while tab shortcuts and strip input behave as with tabs.

### 2. The folder sits where the Agent footer shows it

The launch cwd is drawn flush left on the second-to-last body row with the footer's `~` formatting and `dim` color, the version below it, and the accent wordmark above it. An Agent's editor caret sits on the wordmark's middle row at column zero, so the wordmark starts with a full block there. Starting an Agent from the landing wipes the accent cells from the right over 180 ms; the caret cell goes last and turns white, holding until the Agent's first frame commits, so the hand-over looks like the wordmark becoming the cursor.

### 3. Shared colors are a pinned table

The accent, border, `dim`, and canvas colors live in `landing_accents.json`. The Rust renderer asserts its constants against the file and a TypeScript test asserts the file against `derivePiAccentProjection`, the theme's `dim`, and `piCanvasBackgroundAnsi`, so a theme change fails a test instead of drifting. The attach role reads `accentColor` and `backgroundStyle` with its other live presentation settings.

### 4. Settings stays ready beside the landing

As beside Agents, the client prewarms a hidden Settings tab on the landing and keeps it running instead of closing it with the last visible tab, so Settings opens without a start. The view fallback never chooses a hidden Settings tab, so closing the last Agent shows the landing. A client that detaches with only Settings left closes it, and the server treats a registry holding only Settings as having no Agent, so the next bare `a1` still creates and views its first Agent.

## Risks

- A detached client that crashes leaves a lone hidden Settings running until the next attach; the attach then starts or shows an Agent as if the registry were empty and reuses that Settings tab.
- The pinned colors are dark-appearance values; a light terminal theme shows the landing with dark-theme colors.
