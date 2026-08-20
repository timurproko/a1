import { prerelease, valid } from "semver";
import { A1_PACKAGE_NAME } from "./release.js";

export interface StableReleaseEvidenceInput {
  readonly packageName: string;
  readonly version: string;
  readonly commit: string;
  readonly tag: string;
  readonly tarball: string;
  readonly integrity: string;
  readonly shasum: string;
  readonly recordedAt: string;
}

export interface StableReleaseEvidence extends StableReleaseEvidenceInput {
  readonly schema: "addone-stable-release-v1";
  readonly channel: "latest";
}

export interface StableRegistryState {
  readonly packageName: string | null;
  readonly version: string | null;
  readonly latest: string | null;
  readonly integrity: string | null;
  readonly shasum: string | null;
  readonly bins: readonly string[];
}

export interface StableRegistryVerificationOptions {
  readonly attempts?: number;
  readonly delayMs?: number;
  readonly delay?: (milliseconds: number) => Promise<void>;
}

export function createStableReleaseEvidence(input: StableReleaseEvidenceInput): StableReleaseEvidence {
  if (input.packageName !== A1_PACKAGE_NAME) throw new Error(`unexpected stable package: ${input.packageName}`);
  if (valid(input.version) === null || prerelease(input.version) !== null) throw new Error(`stable release requires an exact stable version: ${input.version}`);
  if (input.tag !== `v${input.version}`) throw new Error(`stable tag ${input.tag} does not match v${input.version}`);
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(input.integrity)) throw new Error("stable release integrity is malformed");
  if (!/^[a-f0-9]{40}$/.test(input.shasum)) throw new Error("stable release shasum is malformed");
  return { schema: "addone-stable-release-v1", channel: "latest", ...input };
}

export async function verifyStableRegistry(
  expected: StableReleaseEvidence,
  observe: () => Promise<StableRegistryState>,
  options: StableRegistryVerificationOptions = {},
): Promise<void> {
  const attempts = options.attempts ?? 12;
  const delayMs = options.delayMs ?? 2_000;
  const delay = options.delay ?? (async milliseconds => await new Promise(resolve => setTimeout(resolve, milliseconds)));
  if (!Number.isInteger(attempts) || attempts < 1) throw new Error(`invalid registry verification attempts: ${attempts}`);
  let state: StableRegistryState | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    state = await observe();
    if (state.packageName === expected.packageName
      && state.version === expected.version
      && state.latest === expected.version
      && state.integrity === expected.integrity
      && state.shasum === expected.shasum
      && state.bins.length === 1
      && state.bins[0] === "a1") return;
    if (attempt < attempts) await delay(delayMs);
  }
  throw new Error(`npm latest did not match accepted ${expected.packageName}@${expected.version} after ${attempts} attempts: ${JSON.stringify(state)}`);
}
