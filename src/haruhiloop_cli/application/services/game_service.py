from __future__ import annotations

import random
from collections import Counter
from dataclasses import dataclass

from haruhiloop_cli.domain.engine.game_engine import GameEngine, StepResult
from haruhiloop_cli.domain.model.models import GameState, Scene, SceneChoice, StepCommand, StepRecord
from haruhiloop_cli.domain.rules.policy import create_policy
from haruhiloop_cli.domain.rules.rules import resolve_choice_ref, resolve_scene_ref
from haruhiloop_cli.infrastructure.persistence import storage


@dataclass(slots=True)
class RunViewState:
    state: GameState
    scenes: list[Scene]
    selected_scene: Scene | None
    choices: list[SceneChoice]


@dataclass(slots=True)
class StepViewState:
    result: StepResult
    scenes: list[Scene]
    selected_scene: Scene | None
    choices: list[SceneChoice]


@dataclass(slots=True)
class SimulationSummary:
    runs: int
    unresolved: int
    endings: Counter[str]


class GameService:
    def __init__(self, engine: GameEngine | None = None) -> None:
        self.engine = engine or GameEngine()

    def start_run(
        self,
        run_id: str,
        *,
        mutator_mode: str,
        seed: int | None,
        ai_temperature: float,
    ) -> RunViewState:
        state = self.engine.create_new_state(
            run_id,
            mutator_mode=mutator_mode,
            random_seed=seed,
            ai_temperature=ai_temperature,
        )
        storage.save_state(state)
        return self._build_run_view(state)

    def step_run(self, run_id: str, scene_ref: str, choice_ref: str) -> StepViewState:
        state = storage.load_state(run_id)
        history = storage.load_history(run_id)
        scene_id = resolve_scene_ref(state, scene_ref)
        choice_id = resolve_choice_ref(state, scene_id, choice_ref)
        result = self.engine.step(
            state=state,
            command=StepCommand(scene_id=scene_id, choice_id=choice_id),
            step_number=len(history) + 1,
        )
        storage.append_history(run_id, result.record)
        storage.save_state(result.state)

        current = self._build_run_view(result.state)
        selected_scene = next(
            (scene for scene in current.scenes if scene.scene_id == result.record.scene_id),
            current.selected_scene,
        )
        choices = self.engine.available_choices(result.state, selected_scene.scene_id) if selected_scene else []
        return StepViewState(
            result=result,
            scenes=current.scenes,
            selected_scene=selected_scene,
            choices=choices,
        )

    def status(self, run_id: str) -> RunViewState:
        state = storage.load_state(run_id)
        return self._build_run_view(state)

    def history(self, run_id: str) -> list[StepRecord]:
        storage.load_state(run_id)
        return storage.load_history(run_id)

    def replay(self, run_id: str) -> tuple[GameState, list[StepRecord]]:
        state = storage.load_state(run_id)
        records = storage.load_history(run_id)
        return state, records

    def simulate(
        self,
        *,
        runs: int,
        max_steps: int,
        policy_name: str,
        mutator_mode: str,
        seed: int | None,
        ai_temperature: float,
    ) -> SimulationSummary:
        policy = create_policy(policy_name)
        if policy_name == "random" and seed is not None:
            random.seed(seed)

        endings: Counter[str] = Counter()
        unresolved = 0
        for index in range(runs):
            run_seed = None if seed is None else seed + index
            state = self.engine.create_new_state(
                f"sim-{index}",
                mutator_mode=mutator_mode,
                random_seed=run_seed,
                ai_temperature=ai_temperature,
            )
            records: list[StepRecord] = []
            for step_number in range(1, max_steps + 1):
                scenes = self.engine.available_scenes(state)
                if not scenes:
                    break
                choice_map = {scene.scene_id: self.engine.available_choices(state, scene.scene_id) for scene in scenes}
                command = policy.choose_command(state, scenes, choice_map, records)
                result = self.engine.step(state, command, step_number)
                records.append(result.record)
                if state.is_finished:
                    endings[state.ending_id or "unknown"] += 1
                    break
            if not state.is_finished:
                unresolved += 1

        return SimulationSummary(runs=runs, unresolved=unresolved, endings=endings)

    def _build_run_view(self, state: GameState) -> RunViewState:
        scenes = self.engine.available_scenes(state)
        selected_scene = scenes[0] if scenes else None
        choices = self.engine.available_choices(state, selected_scene.scene_id) if selected_scene else []
        return RunViewState(
            state=state,
            scenes=scenes,
            selected_scene=selected_scene,
            choices=choices,
        )

