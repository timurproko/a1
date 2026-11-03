import type { readProgressObservations } from "./resident-progress-observations.mjs";
type Report = Awaited<ReturnType<typeof readProgressObservations>>;
export function createProgressObservationReader(
  directory: string,
  runId: string,
): () => Promise<Report>;
export function readVerifiedProgressObservations(
  directory: string,
  runId: string,
  reader: () => Promise<Report>,
): Promise<Report>;
