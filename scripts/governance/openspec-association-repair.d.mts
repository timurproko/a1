export const ASSOCIATION_REPAIR_SCHEMA: "a1-openspec-association-repair-v1";

export interface AssociationRepairRecord {
  readonly schema: typeof ASSOCIATION_REPAIR_SCHEMA;
  readonly repository: string;
  readonly change: string;
  readonly sourcePr: number;
  readonly sourceHead: string;
  readonly sourceMerge: string;
  readonly validationRunId: number;
  readonly failureReason: "missing-openspec-implementation-metadata";
  readonly correctivePr: number;
}

export function parseAssociationRepair(text: string): AssociationRepairRecord;
export function loadAssociationRepair(snapshot: any, change: string): Promise<{
  path: string;
  archive: string;
  record: AssociationRepairRecord;
}>;
