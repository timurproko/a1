import { PromptInput, caretCell, faint } from "../../src/ui/components/index.js";
import { piTheme, piShellVisibleWidth, piShellTruncateToWidth } from "../../src/integrations/pi/components/index.js";

export function promptInputPresentation() {
  return {
    input: new PromptInput({ fg: (token, text) => piTheme().fg(token, text) }, {
      measure: piShellVisibleWidth, truncate: piShellTruncateToWidth,
    }),
    styleSuggestion: faint,
    styleSuggestionCaret: caretCell,
  };
}
