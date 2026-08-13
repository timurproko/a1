export interface ProjectOwner {
  readonly id: string;
  readonly layer: "entry" | "feature" | "foundation";
  readonly sourceRoot: string;
  readonly testRoot: string;
  readonly publicEntry: string;
  readonly mayImport: readonly string[];
}

export const PROJECT_OWNERS: Readonly<Record<string, ProjectOwner>>;
export const TEST_OWNERS: Readonly<Record<string, string>>;
export function inspectProjectStructureImports(files: Readonly<Record<string, string>>): string[];
export function projectOwnerForPath(path: string): ProjectOwner | null;
export function testOwnerForPath(path: string): string | null;
