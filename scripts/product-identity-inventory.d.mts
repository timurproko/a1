export type LegacyIdentityClass =
  | "runtime-symbols"
  | "diagnostics"
  | "environment-keys"
  | "paths"
  | "schemas"
  | "artifacts"
  | "native-names"
  | "tests"
  | "current-docs-specs"
  | "historical-records"
  | "explicit-obsolete-package-fixtures";

export interface LegacyIdentityOccurrence {
  readonly id: string;
  readonly path: string;
  readonly locationKind: "content" | "path";
  readonly line: number | null;
  readonly column: number;
  readonly value: string;
  readonly context: string;
  readonly matchedCase: "upper" | "lower" | "title-or-mixed";
  readonly primaryClass: LegacyIdentityClass;
  readonly classes: readonly LegacyIdentityClass[];
}

export interface LegacyIdentityInventory {
  readonly schema: "a1-legacy-identity-inventory-v1";
  readonly scan: Readonly<Record<string, unknown>>;
  readonly classes: readonly LegacyIdentityClass[];
  readonly summary: {
    readonly total: number;
    readonly files: number;
    readonly byLocationKind: Readonly<Record<"content" | "path", number>>;
    readonly byClass: Readonly<Record<LegacyIdentityClass, number>>;
  };
  readonly occurrences: readonly LegacyIdentityOccurrence[];
}

export const LEGACY_IDENTITY_CLASSES: readonly LegacyIdentityClass[];
export function scanLegacyIdentity(root: string): Promise<LegacyIdentityInventory>;
export function writeLegacyIdentityInventory(root: string): Promise<LegacyIdentityInventory>;
