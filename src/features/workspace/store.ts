import {
  ControlStore,
  DEFAULT_WORKSPACE_ID,
  type StoredWorkspaceAgent,
} from "../../foundation/storage/index.js";
import { WorkspaceReducer, type WorkspaceAgentState, type WorkspaceView } from "./reducer.js";

export class WorkspaceStore {
  readonly #store: ControlStore;

  constructor(path: string) {
    this.#store = new ControlStore(path);
  }

  load(): WorkspaceReducer {
    const records = this.#store.loadWorkspaceAgentRecords();
    const agents = records.map(record => toWorkspaceAgent(record));
    return new WorkspaceReducer(
      DEFAULT_WORKSPACE_ID,
      agents,
      this.#store.loadSelectedWorkspaceAgentId(),
      this.#store.loadWorkspaceRevision(),
    );
  }

  save(reducer: WorkspaceReducer): void {
    const view = reducer.view();
    this.saveView(view);
  }

  saveView(view: WorkspaceView): void {
    const records = view.agents.map((agent): StoredWorkspaceAgent => ({
      agent: {
        id: agent.id,
        displayName: agent.displayName,
        adapterId: agent.adapterId,
        runtime: agent.runtime,
        lifecycle: agent.lifecycle,
        capability: agent.capability,
        createdAt: agent.createdAt,
        recoveryReferenceId: agent.recoveryReferenceId,
      },
      presentation: {
        unreadActivity: agent.unreadActivity,
        attention: agent.attention,
        failure: agent.failure,
      },
    }));
    this.#store.replaceWorkspaceAgentRecords(records, view.selectedAgentId, view.revision);
  }

  close(): void {
    this.#store.close();
  }
}

function toWorkspaceAgent(record: StoredWorkspaceAgent): WorkspaceAgentState {
  return {
    ...record.agent,
    unreadActivity: record.presentation.unreadActivity,
    attention: record.presentation.attention,
    failure: record.presentation.failure,
  };
}
