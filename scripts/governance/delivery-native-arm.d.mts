import type { ArchiveReader } from "./openspec-archive-github.mjs";
export function nativeArmBindingBytes(binding: unknown): string;
export function nativeArmBindingDigest(binding: unknown): string;
export function nativeBindingPolicyActive(reader: ArchiveReader, base: string): Promise<boolean>;
export function verifyNativeArmBinding(reader: ArchiveReader, pull: any, options?: { required?: boolean; events?: any[]; permission?: string }): Promise<any>;
export function captureNativeArmBinding(options: { reader: ArchiveReader; pull: any; event: any; runId: number; policySha: string;
  verifySnapshot: (pull: any, implementation: any) => Promise<unknown>; publish: (body: string) => Promise<unknown> }): Promise<{ recorded: boolean; bindingDigest?: string; reason?: string }>;
