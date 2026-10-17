export function roleTestNames(source: string): string[];
export function parsePartition(value: string | undefined): { skip: true } | { index: number; count: number } | null;
export function partitionRoleTests(names: readonly string[], partition: { index: number; count: number }): string[];
