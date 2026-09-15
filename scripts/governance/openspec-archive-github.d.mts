export interface ArchiveReader {
  repository: string;
  prefix: string;
  get(path: string): Promise<any>;
  pages(path: string, limit?: number, field?: string | null): Promise<any[]>;
  ancestor(base: string, head: string): Promise<void>;
}
export function createArchiveReader(options: { repository: string; token?: string; fetchImpl?: typeof fetch; apiUrl?: string; deadline?: number }): ArchiveReader;
export function archiveReaderFromGet(repository: string, get: ArchiveReader["get"]): ArchiveReader;
export function loadImplementationEvidence(reader: ArchiveReader, number: number): Promise<any>;
export function loadArchiveEvidence(reader: ArchiveReader, number: number, options?: { allowMissing?: boolean }): Promise<any>;
export function findImplementationValidation(reader: ArchiveReader, pull: any): Promise<any>;
