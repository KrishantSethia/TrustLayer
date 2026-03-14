from enum import Enum


class MilestoneStatus(str, Enum):
    LOCKED               = "LOCKED"
    IN_PROGRESS          = "IN_PROGRESS"
    AI_EVALUATING        = "AI_EVALUATING"
    AI_REJECTED          = "AI_REJECTED"
    AI_REJECTED_FINAL    = "AI_REJECTED_FINAL"
    AI_APPROVED_PENDING  = "AI_APPROVED_PENDING"
    DISPUTE_ACTIVE       = "DISPUTE_ACTIVE"
    COMPLETED_PAID       = "COMPLETED_PAID"
    REFUNDED_PENALIZED   = "REFUNDED_PENALIZED"


# ghost protocol bypasses this via direct DB update
TRANSITIONS: dict[MilestoneStatus, list[MilestoneStatus]] = {
    MilestoneStatus.LOCKED:              [MilestoneStatus.IN_PROGRESS],
    MilestoneStatus.IN_PROGRESS:         [MilestoneStatus.AI_EVALUATING],
    MilestoneStatus.AI_EVALUATING:       [MilestoneStatus.AI_APPROVED_PENDING,
                                          MilestoneStatus.AI_REJECTED],
    MilestoneStatus.AI_REJECTED:         [MilestoneStatus.AI_EVALUATING,      # resubmit
                                          MilestoneStatus.DISPUTE_ACTIVE],    # freelancer escalates
    MilestoneStatus.AI_REJECTED_FINAL:   [],                                  # terminal
    MilestoneStatus.AI_APPROVED_PENDING: [MilestoneStatus.COMPLETED_PAID,
                                          MilestoneStatus.DISPUTE_ACTIVE],   # employer veto
    MilestoneStatus.DISPUTE_ACTIVE:      [MilestoneStatus.COMPLETED_PAID,
                                          MilestoneStatus.IN_PROGRESS,        # freelancer can always resubmit
                                          MilestoneStatus.AI_REJECTED],       # escalation: employer wins, can still revise
    MilestoneStatus.COMPLETED_PAID:      [],
    MilestoneStatus.REFUNDED_PENALIZED:  [],
}


def assert_transition(current_status: str, new_status: MilestoneStatus) -> None:
    """Raises ValueError if transition is not allowed."""
    current = MilestoneStatus(current_status)
    if new_status not in TRANSITIONS[current]:
        raise ValueError(f"Illegal transition: {current} → {new_status}")
