import { registerHooks } from "node:module";
import { tsImport } from "tsx/esm/api";

// Security: exercise the production native route without reading or changing the machine's clipboard.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@mariozechner/clipboard") return {
      shortCircuit: true,
      url: "data:text/javascript," + encodeURIComponent(`let attempts = 0;
        export async function setText(text) {
          if (text === 'denied' || text === 'platform-denied') throw new Error('denied');
          if (text === 'transient' && attempts++ < 2) throw Object.assign(new Error('clipboard busy'), { code: 'EBUSY' });
          if (text === 'busy') { for (;;) {} }
        }`),
    };
    return next(specifier, context);
  },
});
await tsImport(new URL("../../../src/app/session-shell/response-copy-helper.ts", import.meta.url).href, import.meta.url);
