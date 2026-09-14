import type { ArchiveReader } from "./openspec-archive-github.mjs";
export const OPENSPEC_VERSION: string;
export function loadArchiveTool(packageRoot: string, options?: { deadline?: number }): Promise<any>;
export function snapshotOpenSpec(reader: ArchiveReader, sha: string): Promise<{ entries: Map<string, string>; blob(path: string): Promise<Buffer | null> }>;
export function verifySyncBaseline(tool: any, baseline: string | null, current: string | null, delta: string): Map<string, any>;
export function verifySyncResult(tool: any, content: string | null, expected: Map<string, any>): void;
export function prepareArchive(options: { reader: ArchiveReader; evidence: any; tool: any; date: string; expectedArchive?: string | null }): Promise<any>;
