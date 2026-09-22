## Context

See `proposal.md` for motivation. The custom viewport currently appends semantic transcript rows, pending steering rows, and live-status rows to one viewport document, but declares only the status rows as the fitting bottom-aligned suffix. The resulting alignment gap is inserted between steering and status, leaving steering beside earlier transcript content.

## Goals / Non-Goals

**Goals:**
- Present fitting pending steering directly above the live working status.
- Keep unused viewport space before the steering/status group.
- Preserve overflow scrolling and transient ownership.

**Non-Goals:**
- Do not convert steering into persisted or selectable transcript content.
- Do not move steering or live status into the pinned dock.
- Do not change queue text, styling, editing, lifecycle, or `a1 pi` behavior.

## Decisions

### 1. Align the complete fitting transient group

The shell will declare both pending-steering and live-status rows as the viewport's bottom-aligned transient suffix. The viewport's existing fitting gap will therefore precede steering, while status-owned spacing and the working indicator remain after it.

### 2. Preserve the overflow path

The viewport already removes its flexible alignment gap when document extent exceeds available rows. Expanding the aligned suffix does not change row order or extent, so steering and status retain existing scrolling, scrollbar, follow-tail, selection exclusion, and pointer behavior at overflow.

### 3. Keep ownership unchanged

Pending steering remains non-persistent, non-selectable viewport chrome. The pinned dock, queue component, live-status component, and comparison profile retain their existing owners and content.

## Risks / Trade-offs

- [A larger aligned suffix could affect overflow] → Keep the same rows and order; change only which final rows receive fitting alignment and cover both fitting and overflowing cases.
- [The queue could become selectable or persistent] → Retain the semantic transcript boundary and existing transient-tail ownership.
- [Comparison behavior could drift] → Apply the alignment only in the custom viewport composition path.

## Migration Plan

1. Expand the custom viewport's fitting bottom-aligned suffix to include steering and status rows.
2. Verify fitting adjacency, stable coordinates while unused space shrinks, and unchanged overflow ordering/scrolling.
3. Build and launch through `./scripts/dev` for physical review. No data migration is required.
