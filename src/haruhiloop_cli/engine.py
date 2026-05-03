from __future__ import annotations

from dataclasses import dataclass

from haruhiloop_cli.models import Action, Ending, GameState, StepRecord, TIMESLOTS, clamp
from haruhiloop_cli import action_flavor_zh, i18n, rules
from haruhiloop_cli.mutator import build_mutator, validate_profile
from haruhiloop_cli.systems.closed_space import evaluate_closed_space_stage
from haruhiloop_cli.systems.crew import apply_crew_sync
from haruhiloop_cli.systems.homework import apply_homework_progress, maybe_trigger_homework_pressure
from haruhiloop_cli.systems.memory import apply_memory_residue, apply_residue_decay, inject_residue_bonus


@dataclass(slots=True)
class StepResult:
    state: GameState
    record: StepRecord
    action: Action
    events: list[str]
    ending: Ending | None


class GameEngine:
    def create_new_state(
        self,
        run_id: str,
        *,
        mutator_mode: str = "ai",
        random_seed: int | None = None,
        ai_temperature: float = 0.7,
    ) -> GameState:
        state = GameState(
            run_id=run_id,
            mutator_mode=mutator_mode,
            random_seed=random_seed,
            ai_temperature=ai_temperature,
        )
        state.worldline_mutation_profile = self._compute_profile(state)
        return state

    def available_actions(self, state: GameState) -> list[Action]:
        return rules.get_available_actions(state)

    def step(self, state: GameState, action_id: str, step_number: int) -> StepResult:
        if state.is_finished:
            label = i18n.format_ending_summary(state.ending_id)
            raise ValueError(f"本局已结束，结局：{label}")

        action = rules.ACTIONS.get(action_id)
        if action is None:
            raise ValueError(f"未知动作：{action_id}")

        before = state.snapshot()
        profile = state.worldline_mutation_profile or self._compute_profile(state)
        sat_factor = profile.get("satisfaction_factor", 1.0)
        stab_factor = profile.get("stability_factor", 1.0)
        clue_factor = profile.get("clue_factor", 1.0)

        state.satisfaction = clamp(state.satisfaction + round(action.delta_satisfaction * sat_factor))
        state.stability = clamp(state.stability + round(action.delta_stability * stab_factor))
        state.clue_points = clamp(state.clue_points + round(action.delta_clue_points * clue_factor))
        state.nagato_fatigue = clamp(state.nagato_fatigue + action.delta_nagato_fatigue)
        state.flags.update(action.add_flags)
        self._update_streak(state, action_id)
        state.action_counts[action_id] = state.action_counts.get(action_id, 0) + 1
        for category_id in rules.action_categories_for(action_id):
            state.category_counts[category_id] = state.category_counts.get(category_id, 0) + 1
        action_flavor = action_flavor_zh.pick_action_flavor(state, action_id, step_number)
        state.recent_actions.append(action_id)
        state.recent_actions = state.recent_actions[-8:]
        state.worldline_shift += abs(action.delta_satisfaction) + abs(action.delta_clue_points)

        triggered = []
        triggered.extend(apply_homework_progress(state, action_id))
        triggered.extend(apply_crew_sync(state, action_id))
        triggered.extend(rules.evaluate_events(state, action))
        triggered.extend(evaluate_closed_space_stage(state, action_id))
        triggered.extend(maybe_trigger_homework_pressure(state))

        inject_residue_bonus(state)
        event_labels: list[str] = []
        for event in triggered:
            state.satisfaction = clamp(state.satisfaction + event.delta_satisfaction)
            state.stability = clamp(state.stability + event.delta_stability)
            state.clue_points = clamp(state.clue_points + event.delta_clue_points)
            state.flags.update(event.add_flags)
            event_labels.append(i18n.format_event_line(event))

        ending = rules.evaluate_ending(state)
        if ending is not None:
            state.ending_id = ending.ending_id
            state.ending_title = ending.title
            state.ending_epilogue = ending.description

        self._advance_time(state)

        record = StepRecord(
            step_number=step_number,
            day=before["day"],
            timeslot=before["timeslot"],
            action_id=action.action_id,
            action_label=action.label,
            before=before,
            after=state.snapshot(),
            events=event_labels,
            mutation_profile=dict(profile),
            ending_id=state.ending_id,
            action_flavor=action_flavor,
        )
        return StepResult(state=state, record=record, action=action, events=event_labels, ending=ending)

    def _compute_profile(self, state: GameState) -> dict[str, float]:
        seed = state.random_seed
        if state.mutator_mode == "ai" and seed is not None:
            seed = seed + state.day * 97 + state.loop_count * 193
        mutator = build_mutator(
            state.mutator_mode,
            seed=seed,
            temperature=state.ai_temperature,
        )
        try:
            raw_profile = mutator.mutate(state)
            return validate_profile(raw_profile)
        except Exception:
            fallback = build_mutator("deterministic")
            return validate_profile(fallback.mutate(state))

    @staticmethod
    def _update_streak(state: GameState, action_id: str) -> None:
        if state.previous_action == action_id:
            state.current_action_streak += 1
        else:
            state.current_action_streak = 0
        state.previous_action = action_id

    def _advance_time(self, state: GameState) -> None:
        if state.timeslot_index == len(TIMESLOTS) - 1:
            apply_memory_residue(state)
            state.timeslot_index = 0
            state.day += 1
            state.loop_count += 1
            # Slow drift emphasizes infinite-loop pressure.
            state.satisfaction = clamp(state.satisfaction - 1)
            state.stability = clamp(state.stability - 1)
            apply_residue_decay(state)
            state.worldline_mutation_profile = self._compute_profile(state)
        else:
            state.timeslot_index += 1
