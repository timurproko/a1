export function newArchiveCheckpoint(now?: number): any;
export function validateArchiveCheckpoint(value: any, now?: number): any;
export function scanArchiveCandidates(reader: any, checkpoint: any, limit?: number): Promise<any>;
export function advanceArchiveCheckpoint(checkpoint: any, scan: any, processed: any[]): any;
