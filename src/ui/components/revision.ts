import type { PaneRect } from "./frame.js";

export type RenderRevisionKind = "content" | "selection" | "hover" | "layout" | "theme";

export const RENDER_REVISION_KINDS: readonly RenderRevisionKind[] = Object.freeze([
  "content",
  "selection",
  "hover",
  "layout",
  "theme",
]);

export type RenderRevisions = Readonly<Record<RenderRevisionKind, number>>;

export const ZERO_REVISIONS: RenderRevisions = Object.freeze({
  content: 0,
  selection: 0,
  hover: 0,
  layout: 0,
  theme: 0,
});

/**
 * A component declares what changed. A host reuses a cached frame only while
 * every declared revision and the rectangle are unchanged; a component that
 * declares nothing is always stale rather than cached incorrectly.
 */
export interface RenderCacheContract {
  revisions(): Partial<RenderRevisions>;
}

export function normalizeRevisions(revisions: Partial<RenderRevisions> | undefined): RenderRevisions {
  if (revisions === undefined) return ZERO_REVISIONS;
  const normalized: Record<RenderRevisionKind, number> = { ...ZERO_REVISIONS };
  for (const kind of RENDER_REVISION_KINDS) {
    const value = revisions[kind];
    normalized[kind] = typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
  return Object.freeze(normalized);
}

export function revisionsEqual(left: RenderRevisions, right: RenderRevisions): boolean {
  return RENDER_REVISION_KINDS.every(kind => left[kind] === right[kind]);
}

/** Bumps revisions by kind so a component can declare what it invalidated. */
export class RenderRevisionTracker {
  #revisions: Record<RenderRevisionKind, number> = { ...ZERO_REVISIONS };

  bump(kind: RenderRevisionKind): void {
    this.#revisions[kind] += 1;
  }

  bumpAll(): void {
    for (const kind of RENDER_REVISION_KINDS) this.#revisions[kind] += 1;
  }

  revisions(): RenderRevisions {
    return Object.freeze({ ...this.#revisions });
  }
}

interface CachedFrame {
  readonly rect: PaneRect;
  readonly revisions: RenderRevisions;
  readonly lines: readonly string[];
}

/**
 * Caches one component's frame. A component with no cache contract is rendered
 * every time, so adoption is incremental rather than all-or-nothing.
 */
export class FrameCache {
  #cached: CachedFrame | undefined;
  #hits = 0;
  #misses = 0;

  get hits(): number {
    return this.#hits;
  }

  get misses(): number {
    return this.#misses;
  }

  render(
    component: { readonly renderCache?: RenderCacheContract },
    rect: PaneRect,
    render: () => readonly string[],
  ): readonly string[] {
    if (component.renderCache === undefined) {
      this.#misses += 1;
      this.#cached = undefined;
      return render();
    }
    const revisions = normalizeRevisions(component.renderCache.revisions());
    const cached = this.#cached;
    if (
      cached
      && cached.rect.width === rect.width
      && cached.rect.height === rect.height
      && revisionsEqual(cached.revisions, revisions)
    ) {
      this.#hits += 1;
      return cached.lines;
    }
    this.#misses += 1;
    const lines = render();
    this.#cached = { rect: { width: rect.width, height: rect.height }, revisions, lines };
    return lines;
  }

  invalidate(): void {
    this.#cached = undefined;
  }
}
