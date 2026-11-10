/**
 * Provenance: @earendil-works/pi-coding-agent 1.5.1 (MIT), commit dd30101cfc5b0609411dd80b6f93adbc14db14cf,
 * packages/coding-agent/src/modes/interactive/components/themed-text.ts.
 * Modifications: Integrated invalidation-aware text into A1's owned startup header and notices;
 * repository formatting only.
 * Deviations: none.
 */
import { Text } from "@earendil-works/pi-tui";

/** Rebuilds theme-colored text after invalidation rather than retaining stale ANSI colors. */
export class ThemedText extends Text {
  private readonly build: () => string;
  private stale = true;

  constructor(build: () => string, paddingX = 1, paddingY = 1) {
    super("", paddingX, paddingY);
    this.build = build;
  }

  override invalidate(): void {
    super.invalidate();
    this.stale = true;
  }

  override render(width: number): string[] {
    if (this.stale) {
      this.stale = false;
      this.setText(this.build());
    }
    return super.render(width);
  }
}
