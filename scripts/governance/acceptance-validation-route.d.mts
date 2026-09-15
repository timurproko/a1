export interface AcceptanceRouteFile {
  filename?: string;
  previous_filename?: string;
  status?: string;
}

export interface AcceptanceRouteDecision {
  acceptanceOnly: boolean;
  reason: string;
  headSha?: string;
  path?: string;
}

export function classifyAcceptanceValidationRoute(
  files: AcceptanceRouteFile[],
  changedFileCount: number,
): AcceptanceRouteDecision;

export function inspectAcceptanceValidationRoute(options: {
  event: unknown;
  repository: string;
  request(path: string): Promise<any>;
}): Promise<AcceptanceRouteDecision & { headSha: string }>;

export function routeAcceptanceValidationFromEnvironment(
  environment?: NodeJS.ProcessEnv,
  fetchImpl?: typeof fetch,
): Promise<AcceptanceRouteDecision>;
