## REMOVED Requirements

### Requirement: Every interactive command owns an independent launch instance
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.

### Requirement: A launch instance owns its complete runtime process tree
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.

### Requirement: Instance closure terminates all instance-owned runtime processes
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.

### Requirement: Cleanup is exact and isolated
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.

### Requirement: Terminal behavior remains owned by the shared UI runtime
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.

### Requirement: Runtime ownership ends even when control infrastructure remains idle
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.

### Requirement: Explicit session selection belongs to the originating launch instance
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.

### Requirement: Native lifecycle code runs inside the Node runtime
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.

### Requirement: A development launch's checkout processes end with it
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.

### Requirement: The exit watcher finishes quietly once the terminal is restored
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.

### Requirement: A launch attaches to its own healthy resident host
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.

### Requirement: Later launches recover automatically after forced process loss
**Reason**: Launch-instance ownership, process containment, the launch guardian, the process-guardian addon, the exit watcher, and resident attach requirements are removed. The OS ends the directly attached `a1` process with its terminal, as upstream Pi behaves.

**Migration**: None. Tool subprocesses the agent detached from the console may outlive a closed terminal exactly as they do under upstream Pi.
