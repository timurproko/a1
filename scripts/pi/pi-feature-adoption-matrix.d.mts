export const MATRIX_SCHEMA: string;
export const DISPOSITIONS: readonly string[];

export interface UpstreamFeatureRow { readonly id: string; readonly kind: string; readonly feature: string; readonly version?: string; readonly summary?: string }
export interface FeatureMatrixRow extends UpstreamFeatureRow {
  readonly since?: string;
  readonly disposition: string;
  readonly behavior?: string;
  readonly test?: string;
  readonly deviation?: string;
  readonly reason?: string;
  readonly note?: string;
}
export interface FeatureMatrix { readonly schema: string; readonly pinned: { readonly version: string }; readonly changelogSince?: string; readonly rows: readonly FeatureMatrixRow[] }
export interface MatrixRefreshReport { readonly created: readonly string[]; readonly retired: readonly string[]; readonly restored: readonly string[] }
export interface ChangelogFeature { readonly version: string; readonly title: string; readonly slug: string; readonly summary: string }

export function upstreamFeatureRows(input: { manifests: Readonly<Record<string, readonly string[]>>; presentedSettings?: readonly string[]; changelog?: string; changelogSince?: string }): UpstreamFeatureRow[];
export function changelogNewFeatures(markdown: string, since?: string): ChangelogFeature[];
export function refreshMatrix(previous: FeatureMatrix | null | undefined, upstreamRows: readonly UpstreamFeatureRow[], options: { version: string; changelogSince?: string }): { matrix: FeatureMatrix; report: MatrixRefreshReport };
export function validateMatrix(matrix: unknown, context: { upstreamRows: readonly UpstreamFeatureRow[]; behaviorIds: ReadonlySet<string>; deviationIds: ReadonlySet<string>; testExists: (path: string) => boolean }): string[];
export function matrixReviewItems(report: MatrixRefreshReport): string[];
export function compareVersions(left: string, right: string): number;
