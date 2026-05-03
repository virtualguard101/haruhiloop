from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

TIMESLOTS = ("morning", "afternoon", "evening")
CURRENT_SCHEMA_VERSION = 2


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
class SceneChoice:
    scene_id: str
    choice_id: str
    label: str
    description: str
    delta_satisfaction: int = 0
    delta_stability: int = 0
    delta_clue_points: int = 0
    delta_nagato_fatigue: int = 0
    add_flags: tuple[str, ...] = ()
    route_progress: dict[str, int] = field(default_factory=dict)
    affinity_delta: dict[str, int] = field(default_factory=dict)
    tags: tuple[str, ...] = ()


@dataclass(slots=True)
class Scene:
    scene_id: str
    label: str
    description: str
    timeslots: tuple[str, ...]
    choices: tuple[SceneChoice, ...]


@dataclass(slots=True)
class StepCommand:
    scene_id: str
    choice_id: str


@dataclass(slots=True)
class RouteState:
    active_route: str | None = None
    route_progress: dict[str, int] = field(default_factory=dict)
    character_affinity: dict[str, int] = field(
        default_factory=lambda: {
            "haruhi": 50,
            "nagato": 50,
            "mikuru": 50,
            "koizumi": 50,
            "kyon": 50,
        }
    )
    route_tension: int = 0


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
    schema_version: int = CURRENT_SCHEMA_VERSION
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
    route_state: RouteState = field(default_factory=RouteState)
    scene_choice_counts: dict[str, int] = field(default_factory=dict)
    scene_flavor_recent: dict[str, tuple[int, ...]] = field(default_factory=dict)
    ending_id: str | None = None
    ending_title: str | None = None
    ending_epilogue: str | None = None
    flags: set[str] = field(default_factory=set)
    recent_choices: list[str] = field(default_factory=list)
    current_choice_streak: int = 0
    previous_choice: str | None = None

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
        schema_version = int(parsed.get("schema_version", 0))
        if schema_version != CURRENT_SCHEMA_VERSION:
            raise ValueError(
                f"存档版本不兼容：{schema_version}（当前支持 {CURRENT_SCHEMA_VERSION}）。"
            )
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
        rs = parsed.get("route_state", {})
        if isinstance(rs, RouteState):
            parsed["route_state"] = rs
        else:
            rs_dict = dict(rs) if isinstance(rs, dict) else {}
            parsed["route_state"] = RouteState(
                active_route=rs_dict.get("active_route"),
                route_progress=dict(rs_dict.get("route_progress", {})),
                character_affinity={
                    "haruhi": 50,
                    "nagato": 50,
                    "mikuru": 50,
                    "koizumi": 50,
                    "kyon": 50,
                    **dict(rs_dict.get("character_affinity", {})),
                },
                route_tension=int(rs_dict.get("route_tension", 0)),
            )
        parsed.pop("timeslot", None)
        parsed.setdefault("ending_epilogue", None)
        parsed.setdefault("nagato_fatigue", 0)
        parsed["scene_choice_counts"] = dict(parsed.get("scene_choice_counts", {}))
        _af = parsed.get("scene_flavor_recent")
        if isinstance(_af, dict):
            parsed["scene_flavor_recent"] = {
                str(k): tuple(int(x) for x in (v if isinstance(v, (list, tuple)) else ()))
                for k, v in _af.items()
            }
        else:
            parsed["scene_flavor_recent"] = {}
        parsed["recent_choices"] = list(parsed.get("recent_choices", []))
        parsed["current_choice_streak"] = int(parsed.get("current_choice_streak", 0))
        parsed["previous_choice"] = parsed.get("previous_choice")
        return cls(**parsed)


@dataclass(slots=True)
class StepRecord:
    step_number: int
    day: int
    timeslot: str
    scene_id: str
    scene_label: str
    choice_id: str
    choice_label: str
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
        if "scene_id" not in payload and "action_id" in payload:
            payload["scene_id"] = "legacy_scene"
            payload["scene_label"] = "旧版动作"
            payload["choice_id"] = payload.get("action_id", "legacy_choice")
            payload["choice_label"] = payload.get("action_label", payload["choice_id"])
        payload.setdefault("action_flavor", None)
        return cls(**payload)

