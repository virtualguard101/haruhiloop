from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

# 一日一步：每步代表一整天的选择与结算，不再分早/午/晚。
TIMESLOTS = ("day",)


def clamp(value: int, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, value))


@dataclass(slots=True)
class Action:
    action_id: str
    label: str
    description: str
    delta_satisfaction: int = 0
    delta_stability: int = 0
    delta_clue_points: int = 0
    delta_nagato_fatigue: int = 0
    add_flags: tuple[str, ...] = ()


@dataclass(slots=True)
class EventOutcome:
    event_id: str
    description: str
    delta_satisfaction: int = 0
    delta_stability: int = 0
    delta_clue_points: int = 0
    add_flags: tuple[str, ...] = ()


@dataclass(slots=True)
class Ending:
    ending_id: str
    title: str
    description: str


@dataclass(slots=True)
class GameState:
    run_id: str
    day: int = 1
    timeslot_index: int = 0
    loop_count: int = 1
    satisfaction: int = 60
    stability: int = 70
    clue_points: int = 0
    closed_space_count: int = 0
    worldline_shift: int = 0
    nagato_fatigue: int = 0
    ending_id: str | None = None
    ending_title: str | None = None
    ending_epilogue: str | None = None
    flags: set[str] = field(default_factory=set)
    recent_actions: list[str] = field(default_factory=list)
    current_action_streak: int = 0
    previous_action: str | None = None

    @property
    def timeslot(self) -> str:
        idx = min(self.timeslot_index, len(TIMESLOTS) - 1)
        return TIMESLOTS[max(0, idx)]

    @property
    def is_finished(self) -> bool:
        return self.ending_id is not None

    def snapshot(self) -> dict[str, Any]:
        data = asdict(self)
        data["flags"] = sorted(self.flags)
        data["timeslot"] = self.timeslot
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "GameState":
        parsed = dict(data)
        parsed["flags"] = set(parsed.get("flags", []))
        parsed.pop("timeslot", None)
        # 旧存档若含多时段索引，统一按「全日」模型对齐。
        parsed["timeslot_index"] = 0
        parsed.setdefault("ending_epilogue", None)
        parsed.setdefault("nagato_fatigue", 0)
        return cls(**parsed)


@dataclass(slots=True)
class StepRecord:
    step_number: int
    day: int
    timeslot: str
    action_id: str
    action_label: str
    before: dict[str, Any]
    after: dict[str, Any]
    events: list[str]
    ending_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StepRecord":
        return cls(**data)

