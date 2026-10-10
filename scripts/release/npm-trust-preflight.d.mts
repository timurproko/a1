export const MINIMUM_TRUSTED_PUBLISHING_NPM: "11.5.1";
export const NPM_PUBLISH_ENVIRONMENT: "npm-publish";
export function assertTrustedPublishingNpm(version: string): string;
export function callingWorkflow(workflowRef: string | undefined): { repository: string; file: string };
export function proveTrustedPublishing(input: {
  packages: readonly string[];
  env: Record<string, string | undefined>;
  fetch: (url: string | URL, init?: RequestInit) => Promise<Response>;
}): Promise<{ workflow: string; packages: string[] }>;
