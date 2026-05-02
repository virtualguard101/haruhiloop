from __future__ import annotations

import random
from typing import Protocol

from haruhiloop_cli.models import Action, GameState, StepRecord


class Policy(Protocol):
    def choose_action(
        self, state: GameState, actions: list[Action], history: list[StepRecord]
    ) -> str: ...


class RandomPolicy:
    def choose_action(
        self, state: GameState, actions: list[Action], history: list[StepRecord]
    ) -> str:
        _ = state, history
        return random.choice(actions).action_id


class GreedyPolicy:
    def choose_action(
        self, state: GameState, actions: list[Action], history: list[StepRecord]
    ) -> str:
        _ = history

        def score(action: Action) -> int:
            value = (
                2 * action.delta_satisfaction
                + 2 * action.delta_stability
                + 3 * action.delta_clue_points
            )
            if state.stability < 40 and action.action_id in {"安抚春日", "完成暑假作业"}:
                value += 8
            if state.satisfaction < 45 and action.action_id in {"策划惊喜活动", "安抚春日"}:
                value += 8
            if state.clue_points > 8 and action.action_id == "同步循环真相":
                value += 6
            return value

        best = max(actions, key=score)
        return best.action_id


def create_policy(policy_name: str) -> Policy:
    if policy_name == "random":
        return RandomPolicy()
    if policy_name == "greedy":
        return GreedyPolicy()
    raise ValueError(f"未知策略：{policy_name}")
