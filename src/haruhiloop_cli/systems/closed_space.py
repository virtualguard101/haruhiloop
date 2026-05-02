from __future__ import annotations

from haruhiloop_cli.models import EventOutcome, GameState, clamp


def evaluate_closed_space_stage(state: GameState, action_id: str) -> list[EventOutcome]:
    outcomes: list[EventOutcome] = []
    if state.stability <= 35:
        state.closed_space_stage = min(3, state.closed_space_stage + 1)
    elif state.closed_space_stage > 0:
        state.closed_space_stage -= 1

    if state.closed_space_stage == 0:
        return outcomes

    outcomes.append(
        EventOutcome(
            event_id="closed_space_stage",
            description=f"闭锁空间危机等级提升至 {state.closed_space_stage} 阶。",
            delta_stability=-2 * state.closed_space_stage,
            add_flags=("closed_space_active",),
        )
    )
    if action_id in {"安抚春日", "同步循环真相"}:
        recovery = 2 + state.closed_space_stage
        outcomes.append(
            EventOutcome(
                event_id="closed_space_countermeasure",
                description="你与团员协同应对，暂时压制住闭锁空间扩张。",
                delta_stability=recovery,
                delta_satisfaction=1,
                add_flags=("closed_space_resolved",),
            )
        )
        state.closed_space_stage = max(0, state.closed_space_stage - 1)
    else:
        state.closed_space_count += 1
        state.worldline_shift += state.closed_space_stage
        state.satisfaction = clamp(state.satisfaction - state.closed_space_stage)

    return outcomes

