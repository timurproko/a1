export type PiProductionBoundaryCategory =
  | "dependency-package-file-read"
  | "private-package-path-construction"
  | "reflected-concrete-constructor"
  | "structural-concrete-session-substitute"
  | "ambient-pi-oracle";

export interface PiProductionBoundaryFinding {
  readonly category: PiProductionBoundaryCategory;
  readonly path: string;
  readonly line: number;
  readonly expression: string;
  readonly symbol?: string;
}

export function collectPiProductionBoundaryFindings(
  files: Readonly<Record<string, string>>,
): PiProductionBoundaryFinding[];

export function inspectPiProductionBoundary(
  files: Readonly<Record<string, string>>,
  baseline?: Record<string, any> | null,
): string[];
