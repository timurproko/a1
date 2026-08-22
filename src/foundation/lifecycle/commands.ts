import type {
  LaunchInstanceId,
  LaunchInstanceOutcome,
  LaunchInstanceShutdownPolicy,
  LaunchInstanceStopReason,
  ProcessContainmentIdentity,
} from "./launch-instance.js";
import type { LaunchProfileId, NativeProcessIdentity, RequestId } from "./model.js";

export type SupervisorCommand =
  | {
      readonly type: "create-launch-instance";
      readonly requestId: RequestId;
      readonly instanceId: LaunchInstanceId;
      readonly profileId: LaunchProfileId;
      readonly shutdownPolicy: LaunchInstanceShutdownPolicy;
      readonly guardianIdentity: NativeProcessIdentity;
    }
  | {
      readonly type: "activate-launch-instance";
      readonly requestId: RequestId;
      readonly instanceId: LaunchInstanceId;
      readonly rootIdentity: NativeProcessIdentity;
      readonly containmentIdentity: ProcessContainmentIdentity;
    }
  | {
      readonly type: "begin-launch-instance-stop";
      readonly requestId: RequestId;
      readonly instanceId: LaunchInstanceId;
      readonly reason: LaunchInstanceStopReason;
    }
  | {
      readonly type: "complete-launch-instance";
      readonly requestId: RequestId;
      readonly instanceId: LaunchInstanceId;
      readonly terminalState: "completed" | "interrupted";
      readonly outcome: LaunchInstanceOutcome;
    }
  | {
      readonly type: "reconcile-launch-instance";
      readonly requestId: RequestId;
      readonly instanceId: LaunchInstanceId;
    }
  | { readonly type: "resynchronize"; readonly requestId: RequestId };

export interface LaunchInstanceStopIntent {
  readonly type: "stop-launch-instance";
  readonly requestId: RequestId;
  readonly instanceId: LaunchInstanceId;
  readonly reason: LaunchInstanceStopReason;
}
