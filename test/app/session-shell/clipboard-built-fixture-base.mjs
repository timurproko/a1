import { installClipboardAcquisitionFixture } from "./clipboard-acquisition-fixture.mjs";

/** Cold emitted helpers with a process-local native fixture; never access the machine's clipboard. */
export async function runBuiltClipboardFixture(helper, mode = "native", trace) {
  installClipboardAcquisitionFixture(mode, "packaged native text", trace);
  await import(new URL(`../../../dist/app/session-shell/${helper}.js`, import.meta.url).href);
}
