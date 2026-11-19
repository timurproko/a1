## Context

The accepted `0.2.1-dev.603` installer renders a fixed-width colored bar and percentage followed by an allowlisted phase label. The supplied terminal capture shows `53% Installingpackages`: `Installing` replaced the beginning of the earlier `Resolving packages` label, but the carriage-return redraw did not erase the longer label's trailing `packages` text.

The user wants no wording after the percentage regardless of phase. npm currently serves `.603` under the `next` tag for both packages. The npm profile package list displays each package's `latest` tag, which remains `0.2.0` for the application and the bootstrap `0.2.1-dev.599` for the installer; that page is not a newest-version listing.

The root README establishes `a1 update`, `a1 update --develop`, and `a1 update --develop [preview-or-version]`. The installer currently uses bare invocation, `--develop`, and `--version <exact-development-version>`. Because the installer API is newly established, retaining two exact-target grammars or adding npm-tag-shaped flags would create avoidable inconsistency.

## Goals / Non-Goals

**Goals:**

- Make the visible interactive progress row end at the numeric percentage.
- Remove stale suffix text when a carriage-return frame replaces an earlier longer row.
- Keep measured progress, animation, palette, cleanup, success, and failure behavior unchanged.
- Make installer target selection match the established self-update grammar exactly.
- Resolve both a numeric preview and a full development version from npm's authoritative published-version list.
- Prove the corrected installer in a newly numbered development publication under `next`.

**Non-Goals:**

- No change to npm `latest`/`next` publication policy or stable release timing.
- No compatibility aliases for the replaced installer argument grammar.
- No removal of internal phase classification used to interpret child activity.
- No change to progress percentages, bar width, colors, installation mutation, activation, or diagnostics.

## Decisions

### 1. Render only the bar and percentage

`ProgressDisplay.draw` will render `renderProgressBar(percent)` without appending the current phase label. Internal phase classification may continue because it remains useful for mapping child events and preserving existing progress milestones, but those labels will no longer be terminal content.

Removing only spaces between words is rejected because the user requested no wording. Retaining one generic label is rejected because it adds the same static visual noise.

### 2. Erase the remainder of the terminal row

Append the ANSI erase-to-end-of-line control after each interactive progress frame. This removes any characters left by a previous installer frame without printing visible padding or moving the cursor away from the percentage. Existing clear/finalization logic will continue restoring the cursor and default foreground.

Padding every frame to the historical maximum is rejected because it leaves the cursor far to the right and couples rendering to obsolete label lengths.

### 3. Reuse the self-update target grammar

The installer will accept only these target forms:

- no target option: resolve the stable `latest` channel;
- `--develop`: resolve the moving development `next` channel;
- `--develop <positive-preview-number>`: select the unique published version ending in `-dev.<number>`;
- `--develop <full-development-version>`: select that exact published preview.

`--version`, `--latest`, and `--next` will be rejected as unsupported options. No compatibility aliases will be retained. This makes fresh installation and self-update read the same way:

| Purpose | Fresh installation | Existing installation update |
| --- | --- | --- |
| Stable | `npx -y @timurproko/a1-install` | `a1 update` |
| Development head | `npx -y @timurproko/a1-install --develop` | `a1 update --develop` |
| Numbered preview | `npx -y @timurproko/a1-install --develop 107` | `a1 update --develop 107` |
| Exact preview | `npx -y @timurproko/a1-install --develop 0.1.8-dev.107` | `a1 update --develop 0.1.8-dev.107` |

Using `@latest` or `@next` on `@timurproko/a1-install` is rejected as the target API because npm consumes that suffix to choose the installer package, not the application release. A new `--target` vocabulary is rejected because the existing update grammar already expresses the intended behavior.

### 4. Resolve requested previews from published versions

Mirror self-update's safe resolution model in the dependency-free installer: query the authoritative application version list, accept an exact development version only when published, accept a numeric preview only when it has exactly one published match, and fail on absent or ambiguous numbers. Do not construct an unpublished version from the current `next` core.

When an existing installation is present, delegate the selected exact development target through `a1 update --develop <full-version>` so fresh and existing paths converge on the same immutable target.

### 5. Test visible output and grammar

Extend TTY orchestration coverage to inspect complete progress frames and require every frame's visible content to end at a percentage with no allowlisted phase wording. Add parser/resolution regressions for all four accepted forms and explicit rejection of removed or invented flags. Retain palette, non-decreasing progress, non-TTY silence, cancellation cleanup, and exact success-output assertions.

### 6. Keep npm channel semantics explicit

The corrective publication will produce the next numbered preview and advance both `next` tags. The npm profile page will not show that preview as the headline version because it displays `latest`. Moving `latest` remains a stable-publication action and is outside this interface correction.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Progress rendering | Interactive frames contain the 40-cell bar and percentage, then erase-to-end, with no phase text |
| Stale-content prevention | A shorter/new frame cannot leave the prior label suffix visible |
| Target grammar | Bare stable and `--develop [preview-or-version]` match self-update; removed/invented options fail |
| Preview resolution | Numeric and full previews resolve only from authoritative published versions |
| Existing contracts | Non-TTY success, cancellation cleanup, failure diagnostics, and progress palette remain unchanged |
| Documentation | Root and installer READMEs show the same target grammar as `a1 update` |
| PR | Exact-head selected CI validates installer, rendering, governance, and OpenSpec delivery |
| Post-merge | A new OIDC development publication passes exact-package and native published-pair lanes |

## Risks / Trade-offs

- **Phase context is no longer visible.** The phase wording was static for long intervals and visually misleading; percentage movement remains the intended progress signal.
- **ANSI erase-to-end is terminal-only.** It is emitted only when TTY progress is already enabled; redirected output remains the exact unstyled success line.
- **Removing `--version` is intentionally incompatible.** The installer API is new, and one shared `--develop [preview-or-version]` grammar is preferable to permanent aliases.
- **Numeric previews can be ambiguous across release cores.** The installer fails and asks for the full version exactly as self-update does; it never guesses.
- **The npm profile still shows older headline versions.** That is intentional dist-tag behavior, not failed publication; `next` carries development candidates until a stable release moves `latest`.

## Migration Plan

1. After explicit plan approval and implementation request, continue in this worktree, branch, and draft PR.
2. Add focused TTY/grammar regressions, remove visible labels, erase stale suffixes, and align installer target selection with self-update.
3. Update installer declarations and README examples, then complete evidence, finalization, and exact-head validation before authorized manual merge.
4. After merge, publish one newly numbered development candidate and verify all native installation and aggregate gates.

Rollback uses a later corrective PR and does not mutate prior package versions.
