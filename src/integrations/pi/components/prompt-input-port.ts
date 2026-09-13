export interface PiShellPromptInputGeometry {
  readonly prefixWidth: number;
  readonly innerWidth: number;
  readonly paddingX: number;
  readonly contentWidth: number;
  readonly layoutWidth: number;
}

export interface PiShellPromptInputBody {
  readonly rows: readonly string[];
  readonly topRule?: string | undefined;
  readonly bottomRule?: string | undefined;
  readonly after?: readonly string[];
}

export interface PiShellPromptInputPresentation {
  geometry(width: number, padding?: number): PiShellPromptInputGeometry;
  styleRule(text: string): string;
  render(width: number, body: (innerWidth: number) => PiShellPromptInputBody, ruled?: boolean, padding?: number): string[];
}
