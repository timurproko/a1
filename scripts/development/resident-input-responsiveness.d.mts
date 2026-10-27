export function fixtureRoleEntrySource(artifact: string): string;
export function createResidentFixtureRoot(prefix: string): Promise<string>;
export function writeFixtureRoleEntry(root: string, artifact: string): Promise<string>;
export function assertOptimizedFixture(addon: { readonly fixtureBuildProfile?: () => string }): "release";
export interface InputResponseSnapshot {
  readonly complete: boolean;
  readonly markerOccurrences: number;
  readonly markerDigest: string;
}
export function assertMatchingInputBaseline(direct: InputResponseSnapshot, resident: InputResponseSnapshot,
  expectedMarkers?: number): { readonly markerOccurrences: number; readonly semanticDigest: string; readonly matched: true };
export interface InputResponseSummary {
  readonly count: number;
  readonly p95Ms: number | null;
  readonly maximumMs: number | null;
}
export function summarizeInputResponses(direct: readonly number[], resident: readonly number[]): {
  readonly direct: InputResponseSummary;
  readonly resident: InputResponseSummary;
  readonly allowedOverheadMs: number;
  readonly faults: readonly string[];
  readonly passed: boolean;
};
export interface InputResponseFrame {
  readonly snapshot: InputResponseSnapshot;
  readonly receivedAt: number;
}
export function firstCompletedResponse(frames: readonly InputResponseFrame[], final: InputResponseSnapshot): InputResponseFrame | undefined;
export function matchedResponseIndex(hashes: readonly string[], snapshot: InputResponseSnapshot,
  lastMatched: number, sentCount: number): number;
export interface InputFixtureEndpoint {
  readonly terminal: {
    write(bytes: string): void;
    onData(listener: (data: string) => void): { dispose(): void };
  };
  output(): string;
}
export function submitFixturePrompt(addon: Parameters<typeof measureRealInputResponsiveness>[0]["addon"],
  endpoint: InputFixtureEndpoint, prompt: string, resident: boolean): Promise<void>;
export function measureRealInputResponsiveness(options: {
  readonly addon: {
    readonly TerminalFrameObserver: new (columns: number, rows: number, skipRows: number) => {
      observe(bytes: Uint8Array, marker: string): InputResponseSnapshot;
      containsAsciiLiteral(literal: string): boolean;
    };
  };
  readonly direct: InputFixtureEndpoint;
  readonly resident: InputFixtureEndpoint;
  readonly prepareWheel: (endpoint: InputFixtureEndpoint) => Promise<void>;
}): Promise<{
  readonly samplesPerWorkload: number;
  readonly cadenceMs: number;
  readonly geometry: { readonly columns: number; readonly childRows: number };
  readonly workloads: Record<string, ReturnType<typeof summarizeInputResponses>>;
  readonly faults: readonly string[];
  readonly passed: boolean;
}>;
