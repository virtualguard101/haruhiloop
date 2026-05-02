from __future__ import annotations

from haruhiloop_cli.models import EventOutcome, GameState, clamp


def apply_crew_sync(state: GameState, action_id: str) -> list[EventOutcome]:
    events: list[EventOutcome] = []
    if action_id == "同步循环真相":
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
    elif action_id in {"整合线索", "观察异常"}:
        state.crew_sync = clamp(state.crew_sync + 2)
        _boost_members(state, 1)
    elif action_id == "社团活动":
        state.crew_sync = clamp(state.crew_sync + 1)
    elif action_id == "策划惊喜活动":
        state.crew_sync = clamp(state.crew_sync + 3)
        _boost_members(state, 2)
    return events


def _boost_members(state: GameState, amount: int) -> None:
    for member in state.member_trust:
        state.member_trust[member] = clamp(state.member_trust[member] + amount)

