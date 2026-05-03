from __future__ import annotations

import random
from typing import Protocol

from haruhiloop_cli.models import GameState, Scene, SceneChoice, StepCommand, StepRecord


class Policy(Protocol):
    def choose_command(
        self, state: GameState, scenes: list[Scene], choice_map: dict[str, list[SceneChoice]], history: list[StepRecord]
    ) -> StepCommand: ...


class RandomPolicy:
    def choose_command(
        self, state: GameState, scenes: list[Scene], choice_map: dict[str, list[SceneChoice]], history: list[StepRecord]
    ) -> StepCommand:
        _ = state, history
        scene = random.choice(scenes)
        choice = random.choice(choice_map[scene.scene_id])
        return StepCommand(scene_id=scene.scene_id, choice_id=choice.choice_id)


class GreedyPolicy:
    def choose_command(
        self, state: GameState, scenes: list[Scene], choice_map: dict[str, list[SceneChoice]], history: list[StepRecord]
    ) -> StepCommand:
        _ = history

        def score(choice: SceneChoice) -> int:
            value = (
                2 * choice.delta_satisfaction
                + 2 * choice.delta_stability
                + 3 * choice.delta_clue_points
            )
            if state.stability < 40 and ("coordination" in choice.tags or "nagato_relief" in choice.tags):
                value += 8
            if state.satisfaction < 45 and ("festival" in choice.tags or "haruhi_route" in choice.tags):
                value += 8
            if state.clue_points > 8 and "truth_sync" in choice.tags:
                value += 6
            return value

        all_choices: list[SceneChoice] = []
        for scene in scenes:
            all_choices.extend(choice_map.get(scene.scene_id, []))
        best = max(all_choices, key=score)
        return StepCommand(scene_id=best.scene_id, choice_id=best.choice_id)


def create_policy(policy_name: str) -> Policy:
    if policy_name == "random":
        return RandomPolicy()
    if policy_name == "greedy":
        return GreedyPolicy()
    raise ValueError(f"未知策略：{policy_name}")
