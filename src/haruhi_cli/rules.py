from __future__ import annotations

from haruhi_cli.models import Action, Ending, EventOutcome, GameState

# Table-driven action definitions keep content extensible.
ACTIONS: dict[str, Action] = {
    "attend_class": Action(
        action_id="attend_class",
        label="Attend Class",
        description="Follow the normal summer schedule.",
        delta_stability=2,
    ),
    "club_activity": Action(
        action_id="club_activity",
        label="Club Activity",
        description="Join SOS club routine work.",
        delta_satisfaction=3,
        delta_stability=-2,
    ),
    "observe_anomaly": Action(
        action_id="observe_anomaly",
        label="Observe Anomaly",
        description="Look for unusual details and time-loop traces.",
        delta_clue_points=3,
        delta_stability=-3,
        add_flags=("anomaly_seen",),
    ),
    "collect_clue": Action(
        action_id="collect_clue",
        label="Collect Clue",
        description="Validate hints and connect repeating details.",
        delta_clue_points=4,
        delta_satisfaction=-1,
        add_flags=("clue_chain_started",),
    ),
    "plan_festival": Action(
        action_id="plan_festival",
        label="Plan Surprise Event",
        description="Create a fun project to reduce Haruhi's boredom.",
        delta_satisfaction=8,
        delta_stability=-1,
        add_flags=("festival_plan",),
    ),
    "complete_homework": Action(
        action_id="complete_homework",
        label="Finish Homework",
        description="Complete summer homework and break unresolved regret.",
        delta_satisfaction=2,
        delta_stability=4,
        add_flags=("homework_done",),
    ),
    "share_truth": Action(
        action_id="share_truth",
        label="Share Loop Truth",
        description="Openly discuss the loop and align everyone.",
        delta_clue_points=2,
        delta_satisfaction=5,
        add_flags=("truth_shared",),
    ),
    "calm_haruhi": Action(
        action_id="calm_haruhi",
        label="Calm Haruhi",
        description="Guide mood away from irritation during instability.",
        delta_satisfaction=6,
        delta_stability=3,
        add_flags=("haruhi_calmed",),
    ),
}


def get_available_actions(_state: GameState) -> list[Action]:
    return list(ACTIONS.values())


def evaluate_events(state: GameState, action: Action) -> list[EventOutcome]:
    outcomes: list[EventOutcome] = []

    if state.current_action_streak >= 2:
        outcomes.append(
            EventOutcome(
                event_id="boredom_spike",
                description="Repeated routine amplifies Haruhi's boredom.",
                delta_satisfaction=-2 * state.current_action_streak,
                delta_stability=-state.current_action_streak,
            )
        )

    if state.timeslot == "evening":
        outcomes.append(
            EventOutcome(
                event_id="day_end_drift",
                description="Another loop ends with unresolved friction.",
                delta_satisfaction=-2,
                delta_stability=-1,
            )
        )

    if state.satisfaction <= 30 and "anomaly_seen" not in state.flags:
        outcomes.append(
            EventOutcome(
                event_id="restless_search",
                description="Low mood forces a suspicious detour.",
                delta_stability=-3,
                add_flags=("anomaly_seen",),
            )
        )

    if state.stability <= 35:
        outcomes.append(
            EventOutcome(
                event_id="closed_space",
                description="Closed Space manifests and reality destabilizes.",
                delta_stability=-8,
                delta_satisfaction=-4,
                add_flags=("closed_space_active",),
            )
        )
        if action.action_id in {"calm_haruhi", "share_truth"}:
            outcomes.append(
                EventOutcome(
                    event_id="closed_space_stabilized",
                    description="Coordinated action suppresses immediate collapse.",
                    delta_stability=8,
                    delta_satisfaction=3,
                    add_flags=("closed_space_resolved",),
                )
            )

    if (
        action.action_id == "plan_festival"
        and "homework_done" in state.flags
        and "truth_shared" in state.flags
    ):
        outcomes.append(
            EventOutcome(
                event_id="hope_signal",
                description="A coherent plan shifts everyone toward a new worldline.",
                delta_satisfaction=6,
                delta_stability=5,
                delta_clue_points=2,
                add_flags=("hope_signal",),
            )
        )

    return outcomes


def evaluate_ending(state: GameState) -> Ending | None:
    if (
        state.satisfaction >= 85
        and state.clue_points >= 10
        and {"festival_plan", "homework_done", "truth_shared"}.issubset(state.flags)
    ):
        return Ending(
            ending_id="haruhi_happy_new_world",
            title="Haruhi Happy New World",
            description="Haruhi is fulfilled and the worldline opens to a brighter timeline.",
        )

    if (
        state.clue_points >= 12
        and {"anomaly_seen", "homework_done", "truth_shared"}.issubset(state.flags)
        and state.stability >= 45
    ):
        return Ending(
            ending_id="kyon_breaks_loop",
            title="Kyon Breaks the Endless August",
            description="Subtle accumulated changes align and the loop is finally broken.",
        )

    if state.stability <= 0 or (state.satisfaction <= 5 and state.closed_space_count >= 2):
        return Ending(
            ending_id="shinirappears_unstable_world",
            title="Shinjin Emerges in the Closed Space",
            description="Haruhi's frustration tears reality and giant entities appear.",
        )

    return None
