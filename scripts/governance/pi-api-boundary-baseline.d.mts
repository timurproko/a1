export interface PiApiBoundaryBaseline {
  readonly schema: "a1-pi-api-boundary-baseline-v1";
  readonly baselineCommit: string;
  readonly dependencyGraph: {
    readonly authorities: readonly string[];
    readonly root: string;
    readonly packages: readonly Array<{ readonly name: string; readonly lockPath: string; readonly version: string; readonly integrity: string | null }>;
    readonly packageEdges: readonly Array<{ readonly from: string; readonly to: string; readonly requested: string; readonly lockPath: string }>;
    readonly productionOwnerEdges: readonly Array<{ readonly from: string; readonly to: string }>;
  };
  readonly productionPiImportSites: readonly Array<{ readonly path: string; readonly line: number; readonly specifier: string; readonly statement: string }>;
  readonly packageLayoutReads: readonly Array<{ readonly path: string; readonly line: number; readonly expression: string }>;
  readonly reflectedConcreteConstructors: readonly Array<{ readonly path: string; readonly line: number; readonly target: string; readonly expression: string }>;
  readonly structuralConcreteSessionSubstitutes: readonly Array<{ readonly path: string; readonly line: number; readonly identifier: string; readonly consumer: string; readonly expression: string }>;
  readonly featureToAdapterDependencies: readonly Array<{ readonly path: string; readonly line: number; readonly specifier: string; readonly feature: string; readonly adapter: string; readonly statement: string }>;
  readonly sourceDerivedUiUnits: readonly Array<{ readonly id: string; readonly package: string; readonly upstreamPath: string; readonly localDestination: string; readonly localSha256: string; readonly implementationStatus: string }>;
  readonly exactOracleResolution: {
    readonly profile: "pi";
    readonly requestedExecutable: "pi";
    readonly binding: "ambient-path";
    readonly selectedDependencyPackage: string;
    readonly selectedDependencyPublicEntry: null;
    readonly selectedDependencyBound: false;
    readonly platformBehavior: Readonly<Record<string, string>>;
    readonly sources: readonly Array<{ readonly path: string; readonly line: number; readonly expression: string }>;
  };
  readonly summary: {
    readonly dependencyPackages: number;
    readonly productionPiImports: number;
    readonly packageLayoutReads: number;
    readonly reflectedConcreteConstructors: number;
    readonly structuralConcreteSessionSubstitutes: number;
    readonly featureToAdapterDependencies: number;
    readonly sourceDerivedUiUnits: number;
    readonly exactOracleBoundToSelectedDependency: false;
  };
}

export function collectPiApiBoundaryBaseline(root: string, baselineCommit?: string): PiApiBoundaryBaseline;
