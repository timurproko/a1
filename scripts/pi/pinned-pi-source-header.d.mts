export interface ProvenanceHeaderRecord {
  readonly id: string;
  readonly package: string;
  readonly upstreamPath: string;
  readonly modifications: string;
  readonly approvedDeviations: readonly { readonly id: string }[];
}

export interface ProvenanceHeaderUpstream {
  readonly commit: string;
  readonly license: string;
  readonly packages: readonly { readonly name: string; readonly version: string }[];
}

export function renderProvenanceHeader(record: ProvenanceHeaderRecord, upstream: ProvenanceHeaderUpstream): string;
export function splitProvenanceHeader(source: string): { readonly header: string; readonly body: string };
export function carriesProvenanceHeader(path: string): boolean;
