export interface DevelopmentValidationMatrixEntry {
  group: "core" | "resource" | "pi" | "promoted" | "package" | "startup" | "compatibility" | "containment";
  label: string;
  os: "windows-2025" | "ubuntu-24.04" | "macos-15";
  platform: "win32" | "linux" | "darwin";
  architecture: "x64" | "arm64";
  node: 22 | 24;
  build: boolean;
  guardian: boolean;
  defender: boolean;
  binary: "process-guardian.exe" | "process-guardian";
}

export interface ValidationJobSelection {
  schema: "a1-validation-job-selection-v3";
  head: string;
  selectionId: string;
  job: string;
  platform: string;
  architecture: string;
  node: number;
  active: boolean;
  owners: string[];
  deferredOwners: string[];
  scopes: string[];
  tests: string[];
}

export const DEVELOPMENT_VALIDATION_MATRIX: readonly DevelopmentValidationMatrixEntry[];
export function validationJobGroup(owner: string, platform: string): DevelopmentValidationMatrixEntry["group"];
export function resolveValidationJob(options: {
  impact: any;
  registry: { owners: any[] };
  job: string;
  platform: string;
  architecture: string;
  node: number;
}): ValidationJobSelection;
export function selectDevelopmentValidationMatrix(options: {
  impact: any;
  registry: { owners: any[] };
  matrix?: readonly DevelopmentValidationMatrixEntry[];
}): { include: DevelopmentValidationMatrixEntry[]; inactive: DevelopmentValidationMatrixEntry[] };
