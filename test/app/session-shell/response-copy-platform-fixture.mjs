import { registerHooks } from "node:module";
import { tsImport } from "tsx/esm/api";

// Security: simulate an absent optional native binding and an available platform writer without
// reading or changing the machine's clipboard.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@mariozechner/clipboard") return {
      shortCircuit: true,
      url: "data:text/javascript," + encodeURIComponent("throw new Error('native binding unavailable')"),
    };
    return next(specifier, context);
  },
});
await tsImport(new URL("../../../src/app/session-shell/response-copy-helper.ts", import.meta.url).href, import.meta.url);
