import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { protectPromptChipWrapping, type PromptChipWrapProtection } from "../../../contracts/owned-ui/index.js";

/** Keeps fitting chips atomic and presents an oversized chip as one width-bounded ellipsized token. */
export function protectPiPromptChipPresentation(text: string, width: number): PromptChipWrapProtection {
  const available = Math.max(1, width);
  return protectPromptChipWrapping(text, chip => truncateChip(chip, available));
}

function truncateChip(chip: string, width: number): string {
  if (visibleWidth(chip) <= width) return chip;
  if (width < 3) return "…";
  return `${truncateToWidth(chip.slice(0, -1), width - 2, "")}…]`;
}
