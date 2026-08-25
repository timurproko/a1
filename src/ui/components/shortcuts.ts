/**
 * Shortcuts as declared data. Dispatch resolves a key through declarations
 * rather than inline comparisons, conflicts are reported when the registry is
 * assembled, and any listing is generated from the same declarations — so a
 * listed shortcut is one dispatch would actually invoke.
 */

export interface ShortcutDeclaration {
  /** Key token, for example `up`, `shift+down`, `ctrl+c`, or a literal character. */
  readonly key: string;
  /** Screen this applies to, or `global` for every screen. */
  readonly scope: string;
  readonly description: string;
  /** Grouping label for the listing. */
  readonly section?: string;
  /**
   * How this key reads on a screen's hint line, when it belongs there. Keys that
   * do one thing together — the two arrows, enter and space — declare the same
   * pair and are shown once.
   */
  readonly hint?: { readonly keys: string; readonly does: string };
}

export const GLOBAL_SCOPE = "global";

export interface ShortcutConflict {
  readonly key: string;
  readonly scopes: readonly [string, string];
  readonly descriptions: readonly [string, string];
  readonly kind: "duplicate" | "shadowed";
}

export interface ShortcutRegistryResult {
  readonly declarations: readonly ShortcutDeclaration[];
  readonly conflicts: readonly ShortcutConflict[];
}

function overlaps(left: string, right: string): boolean {
  return left === right || left === GLOBAL_SCOPE || right === GLOBAL_SCOPE;
}

/**
 * Assembles declarations and reports every key claimed twice in overlapping
 * scopes. A screen claiming a global key is reported as shadowed rather than
 * silently resolved by declaration order.
 */
export function assembleShortcuts(declarations: readonly ShortcutDeclaration[]): ShortcutRegistryResult {
  const conflicts: ShortcutConflict[] = [];
  for (let left = 0; left < declarations.length; left++) {
    for (let right = left + 1; right < declarations.length; right++) {
      const a = declarations[left];
      const b = declarations[right];
      if (a === undefined || b === undefined) continue;
      if (a.key !== b.key || !overlaps(a.scope, b.scope)) continue;
      conflicts.push({
        key: a.key,
        scopes: [a.scope, b.scope],
        descriptions: [a.description, b.description],
        kind: a.scope === b.scope ? "duplicate" : "shadowed",
      });
    }
  }
  return { declarations: Object.freeze([...declarations]), conflicts: Object.freeze(conflicts) };
}

export function assertNoShortcutConflicts(result: ShortcutRegistryResult): void {
  const duplicate = result.conflicts.find(conflict => conflict.kind === "duplicate");
  if (duplicate) {
    throw new Error(
      `shortcut ${duplicate.key} is declared twice in scope ${duplicate.scopes[0]}: `
      + `"${duplicate.descriptions[0]}" and "${duplicate.descriptions[1]}"`,
    );
  }
}

export class ShortcutRegistry<Action extends string = string> {
  readonly #declarations: ShortcutDeclaration[] = [];
  readonly #actions = new Map<string, Action>();

  declare(declaration: ShortcutDeclaration, action: Action): void {
    this.#declarations.push(declaration);
    this.#actions.set(`${declaration.scope}\u0000${declaration.key}`, action);
  }

  /** The action this key invokes in this scope, preferring a screen over a global. */
  resolve(key: string, scope: string): Action | null {
    return this.#actions.get(`${scope}\u0000${key}`) ?? this.#actions.get(`${GLOBAL_SCOPE}\u0000${key}`) ?? null;
  }

  assemble(): ShortcutRegistryResult {
    return assembleShortcuts(this.#declarations);
  }

  /**
   * The hint line, in the order the screen declares its keys. It is rendered from
   * the same declarations dispatch reads, so a key cannot be described here and
   * bound to something else, or bound and never mentioned.
   */
  hint(scope: string, separator = " · "): string {
    const shown = new Map<string, string>();
    for (const declaration of this.#declarations) {
      if (declaration.hint === undefined) continue;
      if (declaration.scope !== scope && declaration.scope !== GLOBAL_SCOPE) continue;
      if (!shown.has(declaration.hint.keys)) shown.set(declaration.hint.keys, declaration.hint.does);
    }
    return [...shown].map(([keys, does]) => `${keys} ${does}`).join(separator);
  }

  /** The listing, derived from the declarations dispatch reads. */
  list(scope?: string): readonly ShortcutDeclaration[] {
    const inScope = scope === undefined
      ? this.#declarations
      : this.#declarations.filter(declaration => declaration.scope === scope || declaration.scope === GLOBAL_SCOPE);
    return Object.freeze([...inScope].sort((left, right) =>
      (left.section ?? "").localeCompare(right.section ?? "") || left.key.localeCompare(right.key)));
  }
}
