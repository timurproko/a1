export const SHA: RegExp;

export interface DeliveryRecord {
  readonly change: string;
  readonly archive?: string;
  readonly finalizedHead?: string;
}

export interface RepositoryReader {
  readonly repository: string;
  readonly prefix: string;
  get(path: string): Promise<any>;
  pages(path: string, limit?: number): Promise<any[]>;
}

export function recordFailure(code: string): Error & { readonly recordCode: string };
export function carriesDeliveryMetadata(body: string): boolean;
export function readDeliveryRecord(body: string): DeliveryRecord | null;
export function createRepositoryReader(options: {
  readonly repository: string;
  readonly token?: string;
  readonly fetchImpl?: typeof fetch;
  readonly apiUrl?: string;
}): RepositoryReader;
