from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

TIMESLOTS = ("morning", "afternoon", "evening")


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
    homework_progress: int = 0
    homework_parts_done: list[str] = field(default_factory=list)
    crew_sync: int = 45
    member_trust: dict[str, int] = field(
        default_factory=lambda: {
            "kyon": 55,
            "yuki": 50,
            "mikuru": 45,
            "koizumi": 48,
        }
    )
    closed_space_stage: int = 0
    memory_residue: dict[str, int] = field(
        default_factory=lambda: {"clue_efficiency": 0, "sync_recovery": 0}
    )
    mutator_mode: str = "ai"
    random_seed: int | None = None
    ai_temperature: float = 0.7
    worldline_mutation_profile: dict[str, float] = field(
        default_factory=lambda: {
            "satisfaction_factor": 1.0,
            "stability_factor": 1.0,
            "clue_factor": 1.0,
        }
    )
    nagato_fatigue: int = 0
    action_counts: dict[str, int] = field(default_factory=dict)
    category_counts: dict[str, int] = field(default_factory=dict)
    action_flavor_recent: dict[str, tuple[int, ...]] = field(default_factory=dict)
    ending_id: str | None = None
    ending_title: str | None = None
    ending_epilogue: str | None = None
    flags: set[str] = field(default_factory=set)
    recent_actions: list[str] = field(default_factory=list)
    current_action_streak: int = 0
    previous_action: str | None = None

    @property
    def timeslot(self) -> str:
        return TIMESLOTS[self.timeslot_index]

    @property
    def is_finished(self) -> bool:
        return self.ending_id is not None

    def snapshot(self) -> dict[str, Any]:
        data = asdict(self)
        data["flags"] = sorted(self.flags)
        data["homework_parts_done"] = sorted(self.homework_parts_done)
        data["timeslot"] = self.timeslot
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "GameState":
        parsed = dict(data)
        parsed["flags"] = set(parsed.get("flags", []))
        parsed["homework_parts_done"] = list(parsed.get("homework_parts_done", []))
        parsed["member_trust"] = {
            "kyon": 55,
            "yuki": 50,
            "mikuru": 45,
            "koizumi": 48,
            **dict(parsed.get("member_trust", {})),
        }
        parsed["memory_residue"] = {
            "clue_efficiency": 0,
            "sync_recovery": 0,
            **dict(parsed.get("memory_residue", {})),
        }
        parsed["worldline_mutation_profile"] = dict(
            parsed.get(
                "worldline_mutation_profile",
                {
                    "satisfaction_factor": 1.0,
                    "stability_factor": 1.0,
                    "clue_factor": 1.0,
                },
            )
        )
        parsed.pop("timeslot", None)
        parsed.setdefault("ending_epilogue", None)
        parsed.setdefault("nagato_fatigue", 0)
        parsed["action_counts"] = dict(parsed.get("action_counts", {}))
        parsed["category_counts"] = dict(parsed.get("category_counts", {}))
        _af = parsed.get("action_flavor_recent")
        if isinstance(_af, dict):
            parsed["action_flavor_recent"] = {
                str(k): tuple(int(x) for x in (v if isinstance(v, (list, tuple)) else ()))
                for k, v in _af.items()
            }
        else:
            parsed["action_flavor_recent"] = {}
        _legacy = parsed.pop("club_activity_flavor_recent", None)
        if _legacy not in (None, (), []):
            if isinstance(_legacy, list):
                tup = tuple(int(x) for x in _legacy)
            elif isinstance(_legacy, tuple):
                tup = tuple(int(x) for x in _legacy)
            else:
                tup = ()
            if tup:
                d = dict(parsed["action_flavor_recent"])
                d.setdefault("社团活动", tup)
                parsed["action_flavor_recent"] = d
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
    mutation_profile: dict[str, float] | None = None
    ending_id: str | None = None
    action_flavor: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StepRecord":
        payload = dict(data)
        payload.setdefault("action_flavor", None)
        return cls(**payload)

