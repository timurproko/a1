export type InputFrameCause = "initial" | "steady" | "dock-input" | "follow-shift" | "detached" | "geometry-change";
export interface InputFrameRegion { readonly rowStart: number; readonly rowEnd: number }
export interface InputCompositionFrame {
  readonly sequence: number;
  readonly frameId: number;
  readonly cause: InputFrameCause;
  readonly revision: number;
  readonly renderStart: number;
  readonly renderEnd: number;
  readonly writeStart: number;
  readonly writeEnd: number;
  readonly columns: number;
  readonly rows: number;
  readonly transcript: InputFrameRegion | null;
  readonly dock: InputFrameRegion | null;
}
export interface InputCheckpointFrames {
  readonly compositionStart: number;
  readonly compositionEnd: number;
  readonly renderStart: number;
  readonly renderEnd: number;
  readonly frames: readonly InputCompositionFrame[];
  readonly controlWrites: readonly number[];
}
