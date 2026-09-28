export interface DocumentationChange {
  readonly path: string;
  readonly oldPath?: string;
  readonly status?: string;
}

export function releaseDocumentationChanged(changes: readonly DocumentationChange[]): boolean;
export function releaseDocumentationFindings(readme: string, runbook: string): string[];
export function checkReleaseDocumentation(): Promise<string[]>;
