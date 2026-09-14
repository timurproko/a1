export function createArchivePublisher(options: { repository: string; appId?: string; privateKey?: string; fetchImpl?: typeof fetch; deadline?: number }): Promise<any>;
export function archiveMarker(evidence: any, candidate: any): any;
export function readArchiveMarker(body: string): any;
export function publishArchive(options: any): Promise<any>;
export function archivePullBody(repository: string, marker: any): string;
export function archiveAuthorityCurrent(get: (path: string) => Promise<any>, repository: string, pull: any, marker: any): Promise<boolean>;
