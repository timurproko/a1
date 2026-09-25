export function repairPackedExecutableModes(tarball: Buffer, executablePaths: string[]): { bytes: Buffer; repaired: string[] };
export function repairNativeExecutableModes(tarball: Buffer): { bytes: Buffer; repaired: string[] };
