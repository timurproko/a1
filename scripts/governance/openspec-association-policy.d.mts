export interface OpenSpecSnapshot {
  readonly entries: ReadonlyMap<string, string>;
  blob(path: string): Promise<Buffer | null>;
}

export interface AssociationInspection {
  readonly blocked: boolean;
  readonly reason: "missing-implementation-association" | "existing-active-documentation" | "no-active-delivery-path";
  readonly changes: readonly string[];
  readonly documentationOnly: boolean;
}

export function inspectUnassociatedActiveDelivery(input: {
  readonly pull: any;
  readonly files: readonly any[];
  readonly base: OpenSpecSnapshot;
  readonly head: OpenSpecSnapshot;
}): AssociationInspection;

export function inspectUnassociatedPull(reader: any, pull: any): Promise<AssociationInspection>;
