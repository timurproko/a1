export const PREFLIGHT_SELECTION: ".artifacts/validation/local-impact.json";
export const PREFLIGHT_BUILD_RECEIPT: ".artifacts/validation/receipts/build.json";
export const PREFLIGHT_OPENSPEC: readonly string[];

export interface PreflightStep {
  id: string;
  executable: "npm" | "npx" | "node";
  arguments: string[];
  environment?: Record<string, string>;
}

export interface PreflightSelection {
  docsOnly: boolean;
  versionOnly: boolean;
  openspecTouched: boolean;
  documentation: { required: boolean };
  naming: { required: boolean };
  prCore: { tests: readonly string[] };
}

export function preflightSteps(selection: PreflightSelection): PreflightStep[];
