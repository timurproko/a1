import type { WorkerOptions } from "node:worker_threads";

export const emittedPasteHelper = new URL("../../dist/integrations/pi/session-ui/paste-helper.js", import.meta.url);

/** Preserves an explicit helper; otherwise selects the build's real cold emitted paste helper. */
export function coldPasteHelper(helper?: URL): URL { return helper ?? emittedPasteHelper; }

const imageSource = new URL("../../src/integrations/pi/session-ui/image-worker.ts", import.meta.url);
const clientSource = new URL("../../src/integrations/pi/session-ui/image-preparation-client.ts", import.meta.url);
const imageBootstrap = `import('tsx/esm/api').then(({ tsImport }) => tsImport(${JSON.stringify(imageSource.href)}, ${JSON.stringify(clientSource.href)}))`;
const emittedImageWorker = new URL("../../dist/integrations/pi/session-ui/image-worker.js", import.meta.url);

/** Selects the build's real cold worker instead of test-only TS transpilation; unrelated workers are untouched. */
export function coldClipboardWorker(entry: string | URL, options?: WorkerOptions): { entry: string | URL; options: WorkerOptions | undefined; selected: boolean } {
  if (entry === imageBootstrap && options?.eval === true) {
    return { entry: emittedImageWorker, options: { ...options, eval: false }, selected: true };
  }
  return { entry, options, selected: false };
}
