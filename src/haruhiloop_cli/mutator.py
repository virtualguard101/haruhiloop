from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Protocol

from haruhiloop_cli.models import GameState


PROFILE_KEYS = ("satisfaction_factor", "stability_factor", "clue_factor")


@dataclass(slots=True)
class MutationProfile:
    satisfaction_factor: float = 1.0
    stability_factor: float = 1.0
    clue_factor: float = 1.0

    def to_dict(self) -> dict[str, float]:
        return {
            "satisfaction_factor": self.satisfaction_factor,
            "stability_factor": self.stability_factor,
            "clue_factor": self.clue_factor,
        }


class WorldlineMutator(Protocol):
    def mutate(self, state: GameState) -> MutationProfile: ...


class DeterministicMutator:
    def mutate(self, state: GameState) -> MutationProfile:
        # Deterministic profile based only on persisted state.
        loop_bias = min(0.08, state.loop_count * 0.005)
        stability_bias = 0.05 if state.stability <= 40 else 0.0
        clue_bias = min(0.1, state.memory_residue.get("clue_efficiency", 0) * 0.02)
        return MutationProfile(
            satisfaction_factor=1.0 - loop_bias,
            stability_factor=1.0 - stability_bias,
            clue_factor=1.0 + clue_bias,
        )


class AIMutator:
    def __init__(self, seed: int | None = None, temperature: float = 0.7) -> None:
        self._rng = random.Random(seed)
        self._temperature = max(0.0, temperature)

    def mutate(self, state: GameState) -> MutationProfile:
        spread = max(0.02, min(0.25, self._temperature * 0.2))
        raw = MutationProfile(
            satisfaction_factor=1.0 + self._rng.uniform(-spread, spread),
            stability_factor=1.0 + self._rng.uniform(-spread, spread),
            clue_factor=1.0 + self._rng.uniform(-spread, spread),
        )
        if state.closed_space_stage > 0:
            raw.stability_factor -= 0.03
        if state.crew_sync >= 65:
            raw.satisfaction_factor += 0.02
        return raw


def validate_profile(profile: MutationProfile | dict[str, float]) -> dict[str, float]:
    if isinstance(profile, MutationProfile):
        payload = profile.to_dict()
    else:
        payload = dict(profile)
    validated: dict[str, float] = {}
    for key in PROFILE_KEYS:
        value = float(payload.get(key, 1.0))
        validated[key] = max(0.8, min(1.2, value))
    return validated


def build_mutator(mode: str, seed: int | None = None, temperature: float = 0.7) -> WorldlineMutator:
    if mode == "deterministic":
        return DeterministicMutator()
    if mode == "ai":
        return AIMutator(seed=seed, temperature=temperature)
    raise ValueError(f"未知扰动模式：{mode}")

