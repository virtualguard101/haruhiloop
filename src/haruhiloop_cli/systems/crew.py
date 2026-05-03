from __future__ import annotations

from haruhiloop_cli.models import EventOutcome, GameState, clamp


def apply_crew_sync(state: GameState, choice_id: str) -> list[EventOutcome]:
    events: list[EventOutcome] = []
    if choice_id in {"group_call_sync", "truth_discussion"}:
        if state.crew_sync >= 60:
            state.crew_sync = clamp(state.crew_sync + 4)
            _boost_members(state, 3)
            events.append(
                EventOutcome(
                    event_id="crew_sync_breakthrough",
                    description="同步真相效果显著，团员间的默契明显上升。",
                    delta_clue_points=2,
                    delta_stability=2,
                )
            )
        else:
            state.crew_sync = clamp(state.crew_sync + 1)
            _boost_members(state, 1)
            events.append(
                EventOutcome(
                    event_id="crew_sync_friction",
                    description="信息同步受阻，部分成员仍对循环半信半疑。",
                    delta_satisfaction=-1,
                    delta_stability=-2,
                )
            )
    elif choice_id in {"nagato_archives", "nagato_crosscheck", "solo_trace"}:
        state.crew_sync = clamp(state.crew_sync + 2)
        _boost_members(state, 1)
    elif choice_id in {"group_briefing", "material_procurement"}:
        state.crew_sync = clamp(state.crew_sync + 1)
    elif choice_id == "surprise_pitch":
        state.crew_sync = clamp(state.crew_sync + 3)
        _boost_members(state, 2)
    return events


def _boost_members(state: GameState, amount: int) -> None:
    for member in state.member_trust:
        state.member_trust[member] = clamp(state.member_trust[member] + amount)

