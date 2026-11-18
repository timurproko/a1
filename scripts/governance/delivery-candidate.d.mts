export interface IntegrationIdentity {
  repository: string;
  pr: number;
  head: string;
  base: string;
  bodyDigest: string;
  acceptanceDigest: string;
}
export function integrationDigest(value: unknown): string;
export function integrationIdentity(pull: unknown): IntegrationIdentity;
export function sameIntegrationIdentity(left: unknown, right: unknown): boolean;
