export const ACTIVE_TO_ARCHIVE_RENAME_POLICY: true;
export const ASSOCIATION_REPAIR_POLICY: true;

export interface ArchiveReader {
  repository: string;
  prefix: string;
  get(path: string): Promise<any>;
  pages(path: string, limit?: number, field?: string | null): Promise<any[]>;
  ancestor(base: string, head: string): Promise<void>;
}
export function createArchiveReader(options: { repository: string; token?: string; fetchImpl?: typeof fetch; apiUrl?: string; deadline?: number }): ArchiveReader;
export function archiveReaderFromGet(repository: string, get: ArchiveReader["get"]): ArchiveReader;
export function inspectVersion3DeliverySnapshot(reader: ArchiveReader, pull: any, implementation: any, sha: string,
  options?: { allowLegacyVersion3Phase?: boolean }): Promise<any>;
export function validateVersion3Candidate(reader: ArchiveReader, number: number): Promise<any>;
export function loadImplementationEvidence(reader: ArchiveReader, number: number): Promise<any>;
export function loadVersion3Acceptance(reader: ArchiveReader, source: any): Promise<any>;
export function loadArchiveEvidence(reader: ArchiveReader, number: number, options?: { allowMissing?: boolean }): Promise<any>;
export function findImplementationValidation(reader: ArchiveReader, pull: any): Promise<any>;
