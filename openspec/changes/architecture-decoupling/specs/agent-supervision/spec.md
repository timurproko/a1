## REMOVED Requirements

### Requirement: No background process coordinates A1 launches
**Reason**: This stub is all that remained of the capability after the single-agent pivot. The one directly attached process per launch, with coordination only through the session writer guard and the durable update transaction, is required by `a1-shell` ("Interactive launch forms run as one directly attached process") and `cli-self-update`.

**Migration**: None.
