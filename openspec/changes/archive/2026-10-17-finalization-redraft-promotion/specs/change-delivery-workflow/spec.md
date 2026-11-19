# Spec Delta

## ADDED Requirements

### Requirement: Trusted automation re-promotes a complete finalized draft
When a finalized version-3 pull request is returned to draft with every Implementation item still checked, trusted finalization SHALL run on that conversion and SHALL mark it ready again once its body fence names the exact head as finalized and the tree holds exactly that archived form with no active change. It SHALL keep every other promotion check and SHALL NOT write the branch while promoting.

#### Scenario: Finalized pull request returned to draft
- **WHEN** a maintainer or agent converts a finalized, fully checked pull request to draft
- **THEN** trusted automation SHALL mark it ready again
- **AND** the following reconciliation SHALL find it already finalized and change nothing

#### Scenario: Fence no longer matches the tree
- **WHEN** the body fence names the head as finalized but the tree lacks that archive or holds the active change again
- **THEN** trusted automation SHALL leave the pull request draft
- **AND** the finalization run SHALL fail with the stable reason `draft-finalization-redraft-form`
