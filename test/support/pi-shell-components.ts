import type { OwnedUiShellComponents } from "../../src/contracts/owned-ui/index.js";
import { createPiShellComponents } from "../../src/integrations/pi/session-presenters/components.js";

/** The Pi shell components with the vendor selectors loaded on first use, as composition supplies them. */
export const PI_SHELL_COMPONENTS: OwnedUiShellComponents = createPiShellComponents(() =>
  import("../../src/integrations/pi/components/lazy-selectors.js").then(module => module.piShellLazySelectors));
