/**
 * Provenance: @earendil-works/pi-tui 0.84.2 (MIT), commit 914cf1472e715297caa30db4b9535d534a9eb718,
 * packages/tui/src/undo-stack.ts.
 * Modifications: Owned editor core or minimal editor-local helper subset; public imports, strict
 * types, typed persistent-history hooks, and semantic border state. Public terminal runtime/exports
 * remain shared and unchanged. See docs/architecture/history-editor-provenance.md.
 * Deviations: persistent-history-owned-editor-boundary.
 */
/**
 * Generic undo stack with clone-on-push semantics.
 *
 * Stores deep clones of state snapshots. Popped snapshots are returned
 * directly (no re-cloning) since they are already detached.
 */
export class UndoStack<S> {
	private stack: S[] = [];

	/** Push a deep clone of the given state onto the stack. */
	push(state: S): void {
		this.stack.push(structuredClone(state));
	}

	/** Pop and return the most recent snapshot, or undefined if empty. */
	pop(): S | undefined {
		return this.stack.pop();
	}

	/** Remove all snapshots. */
	clear(): void {
		this.stack.length = 0;
	}

	updateSnapshots(update: (snapshot: S) => void): void {
		this.stack = this.stack.map(snapshot => {
			const copy = structuredClone(snapshot);
			update(copy);
			return copy;
		});
	}

	get length(): number {
		return this.stack.length;
	}
}
