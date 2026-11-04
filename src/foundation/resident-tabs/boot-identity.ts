/** Seconds a legacy clock-derived boot identity may drift and still name the same boot. */
const LEGACY_BOOT_TOLERANCE_SECONDS = 2;
const LEGACY_MACOS_BOOT = /^macos-boot:(\d+):\d+$/u;

/**
 * Mirrors the native boot matching rule. Legacy `macos-boot:<sec>:<usec>` records drift on clock
 * corrections, so two of them match within the tolerance; only the native host can prove one
 * against a current identity.
 */
export function sameBootIdentity(left: string, right: string): boolean {
  if (left === right) return true;
  const first = LEGACY_MACOS_BOOT.exec(left)?.[1];
  const second = LEGACY_MACOS_BOOT.exec(right)?.[1];
  return first !== undefined && second !== undefined
    && Math.abs(Number(first) - Number(second)) <= LEGACY_BOOT_TOLERANCE_SECONDS;
}
