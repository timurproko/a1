export {
  certifyMaterializedRelease,
  ensureSupervisor,
  recordParentCertifiedRelease,
  releaseEnvironment,
  releaseVerifiedIdleOwner,
  runBootstrap,
  startSupervisor,
  waitForProcessExit,
  waitForVerifiedEndpoint,
} from "./bootstrap.js";
export type { BootstrapOptions, SupervisorStartupAttempt } from "./bootstrap.js";
export { selectCohortLaunch } from "./cohort-selection.js";
export type { CohortLaunchDecision, OwnershipProbe } from "./cohort-selection.js";
export { CohortStateStore, RELEASE_COHORT_SCHEMA, emptyState, planProtectedReleases } from "./cohort-state.js";
export type {
  ActiveReleaseTransactionReference,
  CohortState,
  EndpointOwnership,
  ExternalReleaseHold,
  ExternalReleaseHoldAuthority,
  OrphanReleaseDisposition,
  ProtectedReleaseInputs,
  ProtectedReleasePlan,
  ReleaseApproval,
  ReleaseCleanupDiagnostic,
  ReleaseCleanupDisposition,
  ReleaseCleanupStage,
  ReleaseCleanupState,
  ReleaseCleanupWorkerRun,
  ReleaseCleanupWorkerStatus,
  ReleaseCleanupWorkerSummary,
  ReleaseRecord,
  ReleaseReferences,
  ReleaseRetentionReconciliation,
  SupervisorEndpointMetadata,
} from "./cohort-state.js";
export {
  DEPENDENCY_LAYER_MANIFEST,
  DEPENDENCY_LAYER_SCHEMA,
  RUNTIME_PAYLOAD_INVENTORY,
  dependencyLayerCertificationPath,
  dependencyReference,
  generateDependencyRuntimePayload,
  legacyDependencyLayerCertificationPath,
  materializeDependencyLayer,
  readCertifiedDependencyLayer,
  selectDependencyRuntimePayload,
  selectPublishedDependencyRuntimePayload,
  verifyDependencyLayer,
} from "./dependency-layer.js";
export type {
  DependencyLayerIdentity,
  DependencyLayerOperationEvent,
  DependencyLayerReference,
  GeneratedRuntimePayload,
  MaterializeDependencyLayerOptions,
  MaterializedDependencyLayer,
  PublishedRuntimeFileClassification,
  PublishedRuntimePayload,
  ReadCertifiedDependencyLayerOptions,
  RuntimePayloadExclusion,
  RuntimePayloadInventory,
  SelectedRuntimePayload,
} from "./dependency-layer.js";
export { listRecordedEndpoints, liveReleaseIds, probeOwnership, readEndpointMetadata, removeEndpointArtifacts, sweepDeadEndpoints } from "./endpoints.js";
export type { RecordedEndpoint } from "./endpoints.js";
export { cleanupProvenIdleOwner, cleanupVerifiedOwner, processIsAlive } from "./process-cleanup.js";
export type { CleanupDiagnostics } from "./process-cleanup.js";
export {
  PRODUCT_PACKAGE_NAME,
  createReleaseIdentity,
  deriveReleaseIdentity,
  digestManifestFiles,
  discoverReleasePayload,
  packageRootFromModule,
  releaseFileIdentity,
  resolveWithin,
} from "./release.js";
export type { DiscoverReleasePayloadOptions, DiscoveredReleasePayload, ReleaseFileIdentity, ReleaseIdentity } from "./release.js";
export { collectRelease, prepareReleaseCleanup, runBoundedReleaseCleanup, runReleaseCleanupWorker, scheduleReleaseCleanup } from "./release-gc.js";
export type { ReleaseCleanupLimits, ReleaseCleanupOperations, ReleaseCleanupOptions, ReleaseCleanupResult, ReleaseCleanupWorkerOptions } from "./release-gc.js";
export {
  RELEASE_MANIFEST_FILENAME,
  assertImmutableExecutionRoot,
  consumeMaterializationProof,
  materializeRelease,
  readCertifiedReleaseManifest,
  readMaterializedRelease,
  resolveReleaseEntryPoint,
  verifyMaterializedRelease,
} from "./release-store.js";
export type {
  CertifiedReleaseRecord,
  MaterializeReleaseOptions,
  MaterializedRelease,
  ReadCertifiedReleaseManifestOptions,
  ReleaseContentOperation,
  ReleaseContentOperationEvent,
  VerifyMaterializedReleaseOptions,
} from "./release-store.js";
export { createRestartSeal, readRestartCertifiedRelease, releaseCertificationDocument, restartSealDigest } from "./restart-certification.js";
export type { RestartSeal, RestartValidationEvent } from "./restart-certification.js";
export { STABLE_RELEASE_SCHEMA, createStableReleaseEvidence, verifyStableRegistry } from "./stable-release.js";
export type { StableRegistryState, StableRegistryVerificationOptions, StableReleaseEvidence, StableReleaseEvidenceInput } from "./stable-release.js";
export {
  PACKAGE_UNLOCK_PATIENCE_MS,
  PRODUCT_PACKAGE,
  assertUpdatePerformanceBudget,
  createNpmProcessRunner,
  createUpdateLifecycleCoordinator,
  isPackageLockError,
  lockedPackageDiagnostic,
  planUpdateOwnership,
  renderUpdateProgressBar,
  runSelfUpdate,
} from "./update.js";
export type {
  ProcessRequest,
  ProcessResult,
  SelfUpdateOptions,
  UpdateActivationPhase,
  UpdateChannel,
  UpdateFileMetadata,
  UpdateFileSystem,
  UpdateLifecycleCoordinator,
  UpdateMaterializationProgress,
  UpdateMeasuredPhase,
  UpdateOutput,
  UpdateOwnershipAction,
  UpdatePackageReplacementInput,
  UpdatePerformanceEvidence,
  UpdatePhaseTimingEvent,
  UpdateProcessRunner,
  UpdateTransactionJournal,
  UpdateUnlockPatience,
} from "./update.js";
export {
  UPDATE_ACTIVATION_CONTRACT,
  UPDATE_ACTIVATION_ENTRY,
  UPDATE_ACTIVATION_MANIFEST_FIELD,
  activateInstalledRelease,
  delegateActivation,
  readActivationContracts,
  runActivationEntry,
} from "./update-activation.js";
export type { UpdateActivationCallbacks, UpdateActivationEvent, UpdateActivationRequest } from "./update-activation.js";
export { selectSupervisorLaunchReleaseId, selectUpdateLaunchRelease } from "./update-launch.js";
export {
  UPDATE_RECOVERY_SCHEMA,
  cleanupUpdateRecoveryCapsules,
  inspectUpdateLauncherSet,
  npmPrefixForGlobalRoot,
  prepareUpdateRecoveryCapsule,
  readUpdateRecoveryCapsule,
  removeUpdateRecoveryCapsule,
  runProtectedPackageReplacement,
  updateLauncherPaths,
  updateNpmInstallArguments,
} from "./update-recovery.js";
export type { ProtectedPackageReplacementOptions, ProtectedPackageReplacementResult, UpdateRecoveryCapsule, UpdateRecoveryResult } from "./update-recovery.js";
export { UPDATE_JOURNAL_SCHEMA, UpdateTransactionStore } from "./update-transaction.js";
export type { UpdateRecoveryState, UpdateTransaction, UpdateTransactionPhase } from "./update-transaction.js";
export { warmMaterializedRelease } from "./warmup.js";
