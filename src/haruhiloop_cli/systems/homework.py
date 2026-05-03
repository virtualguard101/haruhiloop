from __future__ import annotations

from haruhiloop_cli.models import EventOutcome, GameState, clamp

HOMEWORK_TARGET = 3
_PART_ORDER = ("worksheet", "essay", "submission")
_PART_LABELS = {
    "worksheet": "习题演算",
    "essay": "读书笔记",
    "submission": "集中提交",
}


def apply_homework_progress(state: GameState, choice_id: str) -> list[EventOutcome]:
    if choice_id != "homework_focus":
        return []

    if state.homework_progress >= HOMEWORK_TARGET:
        return [
            EventOutcome(
                event_id="homework_already_done",
                description="暑假作业已经提前完成，额外投入转化为整理复盘。",
                delta_clue_points=1,
                delta_stability=1,
            )
        ]

    part_id = _PART_ORDER[state.homework_progress]
    state.homework_progress += 1
    state.homework_parts_done.append(part_id)
    state.satisfaction = clamp(state.satisfaction + 1)
    state.stability = clamp(state.stability + 2)

    events = [
        EventOutcome(
            event_id="homework_progress",
            description=f"完成作业环节：{_PART_LABELS[part_id]}。",
            delta_stability=1,
            delta_clue_points=1,
        )
    ]
    if state.homework_progress >= HOMEWORK_TARGET:
        state.flags.add("homework_done")
        events.append(
            EventOutcome(
                event_id="homework_completed",
                description="暑期作业全数完成，循环中的重大心结被解除。",
                delta_satisfaction=3,
                delta_stability=4,
                add_flags=("homework_done",),
            )
        )
    return events


def maybe_trigger_homework_pressure(state: GameState) -> list[EventOutcome]:
    if state.timeslot != "evening":
        return []
    if state.homework_progress == 0:
        return [
            EventOutcome(
                event_id="homework_pressure",
                description="夜色临近却仍未动笔，作业压力在团内蔓延。",
                delta_satisfaction=-2,
                delta_stability=-1,
            )
        ]
    return []

