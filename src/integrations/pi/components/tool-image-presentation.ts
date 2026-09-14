import { convertToPng } from "@earendil-works/pi-coding-agent";
import { getCapabilities, Image, Text, type Component } from "#pi-tui";
import { piTheme } from "./theme.js";

interface ImageSource { readonly data: string; readonly mimeType: string }
interface Entry {
  readonly source: ImageSource;
  state: "waiting" | "converting" | "ready" | "unavailable";
  converted?: ImageSource;
}
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_IMAGES = 16;
const bytes = (data: string) => Math.floor(data.length * 3 / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);

/**
 * Own only current attachment presentation; tool renderers still receive original result content.
 * Unlike pinned 0.84.2's index cache, entries follow immutable source bytes and stale completions
 * cannot republish. At most one conversion runs per mount; queued work is only the current set.
 */
export class ToolImagePresentation {
  #entries: Entry[] = [];
  #visible = false;
  #disposed = false;
  #active = false;

  constructor(
    private readonly changed: () => void,
    private readonly convert: typeof convertToPng = convertToPng,
  ) {}

  update(content: readonly { type: string; data?: string; mimeType?: string }[], show: boolean): void {
    if (this.#disposed) return;
    const previous = this.#entries;
    const next: Entry[] = [];
    for (const part of content) {
      if (part.type !== "image" || !part.data || !part.mimeType) continue;
      const source = { data: part.data, mimeType: part.mimeType };
      const same = (entry: Entry) => entry.source.data === source.data && entry.source.mimeType === source.mimeType;
      next.push(next.find(same) ?? previous.find(same) ?? { source, state: "waiting" });
      if (next.length === MAX_IMAGES) break;
    }
    this.#entries = next;
    this.#visible = show && getCapabilities().images !== null;
    this.#pump();
  }

  /** Public Image remains responsible for Kitty/iTerm protocol and dimension-aware fallback. */
  components(width: number): Component[] {
    if (this.#disposed || !this.#visible) return [];
    return this.#entries.map(entry => {
      const source = entry.source;
      if (getCapabilities().images === "kitty" && source.mimeType !== "image/png") {
        if (entry.converted === undefined) return new Text(piTheme().fg("muted",
          entry.state === "unavailable" ? `[Image unavailable: ${source.mimeType}]` : `[Image converting: ${source.mimeType}]`), 1, 0);
      }
      const image = getCapabilities().images === "kitty" ? entry.converted ?? source : source;
      return new Image(image.data, image.mimeType, { fallbackColor: text => piTheme().fg("toolOutput", text) },
        { maxWidthCells: width });
    });
  }

  dispose(): void {
    this.#disposed = true;
    this.#entries = [];
  }

  #pump(): void {
    if (this.#disposed || this.#active || !this.#visible || getCapabilities().images !== "kitty") return;
    const entry = this.#entries.find(value => value.source.mimeType !== "image/png" && value.state === "waiting");
    if (entry === undefined) return;
    entry.state = "converting";
    this.#active = true;
    // Concurrency: defer codec entry until the caller's synchronous component mutation finishes.
    void Promise.resolve().then(() => this.#disposed || !this.#entries.includes(entry)
      ? null : this.convert(entry.source.data, entry.source.mimeType)).catch(() => null).then(converted => {
      this.#active = false;
      if (this.#disposed) return;
      if (this.#entries.includes(entry)) {
        // Invariant: limits match the existing 16 references / 20 MiB per image, not a new aggregate cap.
        if (converted !== null && converted.mimeType === "image/png" && bytes(converted.data) <= MAX_BYTES) {
          entry.converted = converted;
          entry.state = "ready";
        } else entry.state = "unavailable";
        this.changed();
      }
      this.#pump();
    });
  }
}
