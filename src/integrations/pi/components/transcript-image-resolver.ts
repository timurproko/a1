import type { OwnedUiImageAttachment, OwnedUiTranscriptBlock } from "../../../contracts/owned-ui/index.js";
import type { PiShellImageAssetResolver } from "./shell-shared-facade.js";

// Concurrency: a mounted block can outlive its engine revision while delivery is pending; retain its immutable assets through rebuilds.
export function createTranscriptImageResolver(source: PiShellImageAssetResolver | undefined, initial: OwnedUiTranscriptBlock) {
  let images = new Map<string, OwnedUiImageAttachment>();
  const update = (block: OwnedUiTranscriptBlock) => {
    const next = new Map<string, OwnedUiImageAttachment>();
    for (const reference of block.imageReferences ?? []) {
      const asset = source?.resolve(reference.assetId) ?? images.get(reference.assetId);
      if (asset != null) next.set(reference.assetId, asset);
    }
    images = next;
  };
  update(initial);
  return {
    resolve: (id: string) => images.get(id) ?? null,
    update,
    dispose: () => images.clear(),
  };
}
