/** Observational inventory and timing report; not a validation receipt. */
export function createValidationCostReport(options: {
  sourceHead: string;
  ledger: { test: string; owner: string; fastOwner: string | null }[];
  run?: { headSha: string; jobs: any[]; createdAt?: string; updatedAt?: string } | null;
  log?: string;
}): any;
