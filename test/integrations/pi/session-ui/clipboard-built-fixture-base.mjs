import { registerHooks } from "node:module";

/** Cold emitted helpers with a process-local native fixture; never access the machine's clipboard. */
export async function runBuiltClipboardFixture(helper) {
  registerHooks({ resolve(specifier, context, next) {
    if (specifier === "@mariozechner/clipboard") return { shortCircuit: true, url: "data:text/javascript," + encodeURIComponent(`
      export function hasImage() { return false; }
      export function availableFormats() { return ['text']; }
      export async function getText() { return 'packaged native text'; }
      export async function setText(text) { if (text !== 'packaged native text') throw Error('incorrect fixture payload'); }
    `) };
    return next(specifier, context);
  } });
  await import(new URL(`../../../../dist/integrations/pi/session-ui/${helper}.js`, import.meta.url).href);
}
