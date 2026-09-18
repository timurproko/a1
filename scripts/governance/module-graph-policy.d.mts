export interface ModuleGraphNode {
  readonly staticEdges: readonly string[];
  readonly runtimeEdges: readonly string[];
}

export interface ArchitectureAllowlist {
  readonly schema: "a1-architecture-allowlist-v1";
  readonly entryModules?: readonly string[];
  readonly importCycles?: readonly (readonly string[])[];
  readonly unreachableModules?: readonly string[];
}

export function collectModuleGraph(root: string, sources?: Readonly<Record<string, string>> | null): Promise<Map<string, ModuleGraphNode>>;
export function findImportCycles(graph: ReadonlyMap<string, ModuleGraphNode>): string[][];
export function findUnreachableModules(graph: ReadonlyMap<string, ModuleGraphNode>, roots: readonly string[]): string[];
export function collectEntryRoots(root: string, graph: ReadonlyMap<string, ModuleGraphNode>): Promise<string[]>;
export function inspectModuleGraph(root: string, allowlist: ArchitectureAllowlist | null | undefined, sources?: Readonly<Record<string, string>> | null): Promise<string[]>;
