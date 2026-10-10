export const RELEASE_NOTES_ENTRY: "package/dist/features/owned-ui/resources/release-notes.json";
export function adoptValidatedCandidate(input: {
  candidate: Buffer;
  candidateIdentity: unknown;
  installer: Buffer;
  installerIdentity: unknown;
  source: string;
  tree: string;
  version: string;
  approvedNote: string;
}): { candidate: Buffer; installer: Buffer; noteChanged: boolean };
