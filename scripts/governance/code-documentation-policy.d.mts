export type CodeDocumentationSourceRole =
  | "first-party-production"
  | "first-party-tooling"
  | "first-party-native"
  | "synchronized"
  | "vendored"
  | "generated"
  | "ignored"
  | "unmatched";

export interface CodeDocumentationSource {
  readonly path: string;
  readonly role: CodeDocumentationSourceRole;
  readonly source: string | null;
}

export interface CodeDocumentationOwner {
  readonly id?: string;
  readonly publicEntry: string;
}

export interface CodeDocumentationDiagnostic {
  readonly rule: string;
  readonly path: string;
  readonly line: number;
  readonly column: number;
  readonly symbol: string | null;
  readonly message: string;
}

export const CODE_DOCUMENTATION_RULES: Readonly<{
  publicClassContract: "DOC001";
  multipleJsdoc: "DOC002";
  privateJsdoc: "DOC003";
  summaryTag: "DOC004";
  implementationIntent: "DOC005";
  commentedCode: "DOC006";
  trackedFollowUp: "DOC007";
  suppressionReason: "DOC008";
  sourceClassification: "DOC009";
  synchronizedProvenance: "DOC010";
  classContractQuality: "DOC011";
}>;

export const IMPLEMENTATION_INTENTS: readonly string[];

export function normalizeCodeDocumentationPath(path: string): string;
export function classifyCodeDocumentationSource(path: string): CodeDocumentationSourceRole;
export function loadTrackedCodeDocumentationSources(repository: string): Promise<CodeDocumentationSource[]>;
export function loadCodeDocumentationSources(repository: string, requestedPaths: readonly string[]): Promise<CodeDocumentationSource[]>;
export function sourceRecordsFromFiles(files: Readonly<Record<string, string>>): CodeDocumentationSource[];
export function inspectCodeDocumentation(input: {
  readonly sources: readonly CodeDocumentationSource[];
  readonly owners?: Readonly<Record<string, CodeDocumentationOwner>>;
  readonly synchronizedDestinations?: ReadonlySet<string>;
  readonly diagnosticPaths?: ReadonlySet<string>;
}): CodeDocumentationDiagnostic[];
export function formatCodeDocumentationDiagnostics(diagnostics: readonly CodeDocumentationDiagnostic[]): string;
