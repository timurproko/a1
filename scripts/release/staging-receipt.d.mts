type JsonObject = Record<string, unknown>;
export const RECEIPT_ASSET: "a1-stable-staging-v1.json";
export function validateStableStagingReceipt(input: {
  receipt: JsonObject;
  release: JsonObject;
  workflowRun: JsonObject;
  tag: JsonObject;
  master: JsonObject;
  application: JsonObject;
  installer: JsonObject;
  applicationLatest: JsonObject;
  installerLatest: JsonObject;
  assetSha256: string;
}): Readonly<{ version: string; source: string; releaseId: number; releaseNotesSha256: string; note: string; assetName: string }>;
