import { registerHooks } from "node:module";
import { tsImport } from "tsx/esm/api";

// Security: exercise the production native route without reading or changing the machine's clipboard.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@mariozechner/clipboard") return {
      shortCircuit: true,
      url: "data:text/javascript," + encodeURIComponent(`export async function setText(text) {
        if (text === 'denied') throw new Error('denied');
        if (text === 'busy') { for (;;) {} }
      }`),
    };
    return next(specifier, context);
  },
});
await tsImport(new URL("../../../../src/integrations/pi/session-ui/response-copy-helper.ts", import.meta.url).href, import.meta.url);
