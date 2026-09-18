export interface SyncPiInventoriesInput {
  readonly inventories: { modal: any; presenters: any; behaviors: any };
  readonly modalSources: Record<string, string>;
  readonly presenterSource: string;
  readonly behaviorSources: Map<string, string>;
  readonly componentFiles: readonly string[];
  readonly version: string;
  readonly commit: string;
  readonly lockPackages: Record<string, { readonly version: string; readonly integrity: string }>;
}

export interface SyncPiInventoriesReport {
  readonly version: string;
  readonly commit: string;
  readonly modal: { reanchored: string[]; orphaned: string[]; unmappedComponents: string[] };
  readonly presenters: { reanchored: string[]; orphaned: string[] };
  readonly behaviors: { reanchored: string[]; moved: string[]; orphaned: string[]; manifests: string[] };
}

export function syncInventories(input: SyncPiInventoriesInput): {
  readonly inventories: SyncPiInventoriesInput["inventories"];
  readonly report: SyncPiInventoriesReport;
  readonly blocking: string[];
  readonly changed: boolean;
};
