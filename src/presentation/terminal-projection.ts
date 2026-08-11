import type { TerminalProjectionPolicy, TerminalRenderOperation, TerminalRenderTransaction, TerminalSurface } from "../domain/index.js";

export interface TerminalViewport {
  readonly top: number;
  readonly left: number;
  readonly columns: number;
  readonly rows: number;
}

export interface TerminalProjectionPlan {
  readonly kind: "full-viewport-native" | "clipped-composited";
  readonly viewport: TerminalViewport;
}

export function selectTerminalProjection(
  policy: TerminalProjectionPolicy,
  dimensions: { readonly columns: number; readonly rows: number },
  viewport: TerminalViewport = { top: 0, left: 0, columns: dimensions.columns, rows: dimensions.rows },
): TerminalProjectionPlan {
  const completeGeometry = viewport.top === 0 && viewport.left === 0
    && viewport.columns === dimensions.columns && viewport.rows === dimensions.rows;
  return {
    kind: policy.layout === "full-viewport-native" && completeGeometry ? "full-viewport-native" : "clipped-composited",
    viewport,
  };
}

export function projectTerminalSnapshot(surface: TerminalSurface, plan: TerminalProjectionPlan): TerminalSurface {
  if (plan.kind === "full-viewport-native") return surface;
  const { viewport } = plan;
  const cells = Array.from({ length: viewport.rows }, (_, targetRow) => {
    const source = surface.cells[viewport.top + targetRow] ?? [];
    return source.slice(viewport.left, viewport.left + viewport.columns);
  });
  const cursorInViewport = surface.cursor.row >= viewport.top && surface.cursor.row < viewport.top + viewport.rows
    && surface.cursor.column >= viewport.left && surface.cursor.column < viewport.left + viewport.columns;
  return {
    ...surface,
    columns: viewport.columns,
    rows: viewport.rows,
    cells,
    // Composited panes do not project child scrollback into the host's global
    // scrollback. The resident terminal still retains it for reconnect.
    scrollbackCells: [],
    cursor: {
      ...surface.cursor,
      column: Math.max(0, Math.min(viewport.columns - 1, surface.cursor.column - viewport.left)),
      row: Math.max(0, Math.min(viewport.rows - 1, surface.cursor.row - viewport.top)),
      visible: surface.cursor.visible && cursorInViewport,
    },
  };
}

export function projectTerminalRenderTransaction(transaction: TerminalRenderTransaction, plan: TerminalProjectionPlan): TerminalRenderTransaction {
  if (plan.kind === "full-viewport-native") return transaction;
  const { viewport } = plan;
  const dirtyRanges = transaction.dirtyRanges.flatMap(range => {
    if (range.row < viewport.top || range.row >= viewport.top + viewport.rows) return [];
    const sourceStart = Math.max(range.startColumn, viewport.left);
    const sourceEnd = Math.min(range.startColumn + range.cells.length, viewport.left + viewport.columns);
    if (sourceStart >= sourceEnd) return [];
    return [{
      row: range.row - viewport.top,
      startColumn: sourceStart - viewport.left,
      cells: range.cells.slice(sourceStart - range.startColumn, sourceEnd - range.startColumn),
    }];
  });
  const operations = transaction.operations.flatMap(operation => projectOperation(operation, viewport));
  const cursorInViewport = transaction.cursor.row >= viewport.top && transaction.cursor.row < viewport.top + viewport.rows
    && transaction.cursor.column >= viewport.left && transaction.cursor.column < viewport.left + viewport.columns;
  return {
    ...transaction,
    dimensions: { columns: viewport.columns, rows: viewport.rows },
    operations,
    dirtyRanges,
    cursor: {
      ...transaction.cursor,
      column: Math.max(0, Math.min(viewport.columns - 1, transaction.cursor.column - viewport.left)),
      row: Math.max(0, Math.min(viewport.rows - 1, transaction.cursor.row - viewport.top)),
      visible: transaction.cursor.visible && cursorInViewport,
    },
  };
}

function projectOperation(operation: TerminalRenderOperation, viewport: TerminalViewport): readonly TerminalRenderOperation[] {
  if (operation.type === "screen") return [operation];
  if (operation.type === "scroll") {
    const top = Math.max(operation.top, viewport.top);
    const bottom = Math.min(operation.bottom, viewport.top + viewport.rows - 1);
    return top > bottom ? [] : [{ ...operation, top: top - viewport.top, bottom: bottom - viewport.top }];
  }
  if (operation.row < viewport.top || operation.row >= viewport.top + viewport.rows) return [];
  const startColumn = Math.max(operation.startColumn, viewport.left);
  const endColumn = Math.min(operation.endColumn, viewport.left + viewport.columns);
  return startColumn >= endColumn ? [] : [{
    ...operation,
    row: operation.row - viewport.top,
    startColumn: startColumn - viewport.left,
    endColumn: endColumn - viewport.left,
  }];
}
