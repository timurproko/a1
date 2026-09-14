import type { ArchiveReader } from "./openspec-archive-github.mjs";
import type { PullRequestChangedFile } from "./documentation-auto-merge.mjs";
export function inspectDocumentationLifecycle(pull: any, files: readonly PullRequestChangedFile[], reader: Pick<ArchiveReader, "get" | "prefix">): Promise<{ held: boolean; reason: string; change?: string }>;
