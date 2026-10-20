export interface SizeThresholds { classMethods: number; classFields: number; functionLines: number }
export interface ClassCounts { methods: number; fields: number }
export interface FunctionCounts { lines: number }
export interface SizeMeasurement {
  classes: Record<string, ClassCounts>;
  functions: Record<string, FunctionCounts>;
  errors: string[];
}
export interface SizeBaseline {
  schema: string;
  thresholds?: SizeThresholds;
  classes?: Record<string, ClassCounts>;
  functions?: Record<string, FunctionCounts>;
}

export const SIZE_RATCHET_SCHEMA: "a1-size-ratchet-v1";
export const SIZE_THRESHOLDS: Readonly<SizeThresholds>;
export function maskTypeScript(source: string): string;
export function maskRust(source: string): string;
export function measureSource(path: string, source: string): {
  classes: Array<{ key: string } & ClassCounts>;
  functions: Array<{ key: string } & FunctionCounts>;
};
export function sizeRatchetSources(root: string): Promise<string[]>;
export function measureSizeRatchet(root: string, thresholds?: SizeThresholds): Promise<SizeMeasurement>;
export function inspectSizeRatchet(measured: SizeMeasurement, baseline: SizeBaseline | null | undefined): string[];
export function ratchetSizeBaseline(measured: SizeMeasurement, baseline: SizeBaseline | null, options?: { seed?: boolean }): Required<SizeBaseline>;
