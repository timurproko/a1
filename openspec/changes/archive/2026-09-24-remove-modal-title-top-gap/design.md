## Context

See `proposal.md` for motivation. Most framed bare-A1 modal components currently compose a top `DynamicBorder`, a one-row `Spacer`, and then a title. That sequence appears in owned Models and Skills dialogs and in source-synchronized Thinking, scoped-model, session, tree, trust, and extension dialog families. Other modal routes delegate to public pinned components or use nested states, so changing only the visibly reported dialog would leave the same gap elsewhere and invite it to return.

The recently established modal inventory already identifies every built-in and extension-hosted modal node and its presentation owner. Bare A1 may intentionally customize these surfaces, while the explicit `a1 pi` profile remains the untouched pinned comparison route.

The implementation merged through PR #573 at exact head `8aa3a7d9e2a4f2f9e2d06a6fbbe950f7e063531f` and merge commit `93f6928f55c35ae2e1d9c7b21deb5377557fdb65`, with the protected aggregate and every selected lane successful. Before merge, however, the PR body was replaced with an ordinary summary that omitted its `openspec-implementation` fence. Trusted finalization therefore skipped it as unassociated, and `develop` integrated the active change instead of synchronized specs and an archive. The merged PR body is immutable; the repair must not rewrite it or manufacture a retroactive version-3 manifest.

## Goals / Non-Goals

**Goals:**
- Render a titled framed modal with its title immediately after the top rule.
- Give every A1-authored modal content row the same one-cell global left inset used by full-screen A1 surfaces while keeping frame rules full width.
- Encode vertical and horizontal geometry once in a reusable modal component boundary used by every applicable bare-A1 modal family.
- Preserve relative indentation inside list, form, description, and shortcut content.
- Prove inventory-wide adoption and stable narrow-width, resize, focus, and transition behavior.
- Bind the exact merged implementation to a reviewed corrective delivery without editing PR #573's merged body.
- Synchronize the existing deltas and archive this active change through the corrective candidate.
- Fail closed before validation/merge when a future ready implementation candidate carries active OpenSpec delivery content but lacks valid association metadata.
- Release the retained PR #573 worktree only after exact corrective provenance and archive state are verified.

**Non-Goals:**
- Remove blank rows below titles or elsewhere in modal bodies.
- Change border styling, title text or styling, semantic shortcut presentation, list markers, editing behavior, or bottom padding.
- Compact transcript cards, startup notices, full-screen documents, or other ruled content that is not a modal.
- Change modal actions, state, controller lifecycles, or installed Pi package bytes.
- Alter `a1 pi` pinned-comparison output.
- Reinterpret PR #573 as a valid finalized version-3 delivery or edit its merged body.
- Weaken ordinary documentation-only revisions, legacy delivery readers, exact-head CI, or cleanup identity/content safeguards.
- Create an acceptance-only or archive-only publication path.

## Decisions

### 1. Make top-title adjacency a modal-frame invariant

Introduce a shared bare-A1 modal frame component or component adapter that owns the top rule and title slot. When a framed modal has a title, the title is emitted as the row immediately following the top rule; the API does not expose an optional top-title spacer. Body composition begins after the title and may retain its existing intentional spacer.

Deleting `Spacer(1)` independently in every constructor was rejected because it leaves no reusable invariant, misses public-component adapter paths, and allows new dialogs to restore the gap by copying an older layout.

### 2. Adapt modal producers at their existing ownership boundary

Route owned and source-synchronized titled modal families through the shared frame boundary. Where a pinned public component hardcodes its frame and cannot accept shared chrome, adapt or minimally source-synchronize it behind the existing bare-A1 factory rather than patching installed dependencies. The modal inventory will classify genuinely untitled/custom surfaces explicitly instead of forcing a title onto them.

The explicit `a1 pi` factories continue to construct pinned components directly. A global terminal-row rewrite was rejected because rendered ANSI rows do not reliably identify semantic titles and could compact unrelated ruled content.

### 3. Make horizontal padding a frame-owned content property

The shared frame renders top, bottom, and explicitly declared separator rules at full width. It renders every semantic content component — title, search/input, selectable rows, descriptions, status, and shortcuts — within a one-cell left inset and one-column-smaller content width. Existing row-authored spaces remain relative indentation inside that content area. Callers do not add a separate outer title or hint indent, preventing double padding and preserving heading/shortcut alignment.

A terminal-output heuristic that prefixes rows based on visible text was rejected because it cannot distinguish a rule from content reliably and would make ANSI output determine semantics. The frame instead receives semantic rule and content components and owns their composition.

### 4. Preserve vertical body geometry and interaction

The change removes exactly one top-title gap from each applicable modal and adds no vertical rows. Existing spacing after the title, relative content indentation, list selection markers, bottom rule spacing, clipping, and wrapping remain intact within the one-cell-smaller content rectangle. Search and editor components receive the reduced width so their caret, clipping, and pointer geometry agree with their visible position. Modal height naturally decreases by one row, and overlay centering may move by the compositor's normal response to that smaller height.

### 5. Use inventory-backed component evidence

Extend modal presentation coverage so every inventoried node has one of three dispositions: it uses the shared compact padded frame, it is intentionally unframed, or it is an extension-owned custom surface whose geometry is not authored by A1. Representative render tests will assert that the top rule is followed immediately by the title, every A1-authored content row has the global inset, rules remain full width, only one vertical row is removed, and relative row indentation/styles remain coherent. Interaction tests retain authority for navigation, completion, cancellation, nesting, focus restoration, resize, and disposal.

### 6. Repair association through an exact corrective record

Keep PR #573's merged body unchanged. Add a machine-readable association-repair artifact to this active change that names the repository, change, original PR, exact source head, merge commit, successful required validation, failure reason, and corrective delivery identity. The corrective PR will use ordinary version-3 association metadata for this same change, include the governance implementation below, and be finalized normally; its authorized manual merge conditionally accepts the repair record, synchronizes the modal deltas, and archives the complete change atomically.

The repair record does not claim that PR #573 was itself finalized or retroactively alter its acceptance manifest. It establishes a narrow chain: the original manually merged implementation and exact-head CI provide implementation provenance; the corrective PR provides reviewed association, synchronized specifications, archive bytes, and repair acceptance.

Editing PR #573 after merge was rejected because merged delivery bodies are immutable and its exact merged tree does not contain the archive or manifest that finalized metadata would assert. A documentation-only archive follow-up was rejected because it would bypass the version-3 lifecycle and would not repair the validation or cleanup gap.

### 7. Fail closed on unassociated active implementation candidates

Extend trusted base-controlled readiness/finalization policy to inspect immutable pull-request base/head trees and the complete changed-path set when no valid implementation fence is present. A ready PR that introduces or restores an active OpenSpec change, or combines changes to an active change with code/operational paths, must fail with a bounded missing-association reason instead of running ordinary validation and emitting the protected aggregate. Existing active-change documentation revisions remain eligible only under their established documentation-only rules; ordinary code PRs that do not carry active delivery paths remain unaffected.

The check uses paths and tree presence, not editable title text, labels, or inferred change names. Malformed metadata remains a separate fail-closed result. The finalization workflow must report the same unassociated-active blocker rather than a successful skip so the two trusted entry points cannot disagree.

### 8. Make cleanup consume only the exact repair chain

Extend cleanup evidence with one narrow recovery path for a registered original worktree whose merged PR is unassociated. It may proceed only when current `develop` contains a valid association-repair record for that exact repository/change/source PR/head/merge, the corrective version-3 delivery is manually merged with successful exact-head validation, the declared archive and canonical specifications verify, the active change is absent, the original and corrective remote topic refs are absent, and all existing local identity/content checks pass.

A missing, ambiguous, mismatched, unmerged, stale, automatic, or archive-drifted repair remains `source-association` or a more specific blocker. The recovery does not generalize merged status into cleanup authority and does not permit remote deletion.

## Risks / Trade-offs

- **[A public pinned modal cannot accept the shared frame]** → Adapt it only behind the bare-A1 factory or source-synchronize the minimum coherent component, retaining provenance and leaving comparison constructors untouched.
- **[A broad spacer removal compacts body sections]** → Give the shared frame explicit rule/title/body slots and assert representative complete frames, not a generic blank-row filter.
- **[Padding already authored into a row is doubled]** → Move only the global inset into the frame; retain local spaces solely where they express relative list, field, or description indentation.
- **[Reduced content width desynchronizes input or pointer geometry]** → Render child components at the reduced width and add focused narrow-width, caret, and interaction evidence.
- **[A shorter modal shifts centered overlay bounds]** → Treat the one-row height reduction and resulting normal centering as intentional; assert pointer ownership and computed bounds still match rendered rows.
- **[Unframed extension surfaces are changed accidentally]** → Require an inventory disposition and do not infer content or rules from rendered strings.
- **[New modal code bypasses the policy]** → Add source/inventory governance that rejects applicable bare-A1 modal producers not routed through the shared frame boundary.
- **[The repair overstates PR #573's lifecycle]** → Preserve its body and exact tree unchanged; explicitly distinguish original implementation provenance from corrective archive/association acceptance.
- **[Missing metadata is removed again to bypass finalization]** → Inspect immutable base/head trees and complete paths under trusted base policy, independent of editable body text.
- **[Cleanup accepts an unrelated archive]** → Require exact source and corrective identities plus archive/spec digests, successful CI, authorized manual merges, remote absence, and existing local safeguards.

## Migration Plan

No persisted-data migration is required. The modal implementation is already integrated. The corrective delivery will first add trusted missing-association enforcement and exact repair evidence, then use normal version-3 finalization to synchronize the existing modal deltas and move this active change into its dated archive. After authorized manual merge and verification, local cleanup may consume the repair chain for PR #573. Rollback of the governance code leaves the active change and retained worktree in their current blocked state; it must not rewrite PR #573 or remove archive evidence independently.
