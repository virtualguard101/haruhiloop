from __future__ import annotations

from dataclasses import dataclass

from haruhi_cli.models import Action, Ending, GameState, StepRecord, TIMESLOTS, clamp
from haruhi_cli import rules


@dataclass(slots=True)
class StepResult:
    state: GameState
    record: StepRecord
    action: Action
    events: list[str]
    ending: Ending | None


class GameEngine:
    def create_new_state(self, run_id: str) -> GameState:
        return GameState(run_id=run_id)

    def available_actions(self, state: GameState) -> list[Action]:
        return rules.get_available_actions(state)

    def step(self, state: GameState, action_id: str, step_number: int) -> StepResult:
        if state.is_finished:
            raise ValueError(f"Run already finished with ending: {state.ending_id}")

        action = rules.ACTIONS.get(action_id)
        if action is None:
            raise ValueError(f"Unknown action: {action_id}")

        before = state.snapshot()
        state.satisfaction = clamp(state.satisfaction + action.delta_satisfaction)
        state.stability = clamp(state.stability + action.delta_stability)
        state.clue_points = clamp(state.clue_points + action.delta_clue_points)
        state.flags.update(action.add_flags)
        self._update_streak(state, action_id)
        state.recent_actions.append(action_id)
        state.recent_actions = state.recent_actions[-8:]
        state.worldline_shift += abs(action.delta_satisfaction) + abs(action.delta_clue_points)

        triggered = rules.evaluate_events(state, action)
        event_labels: list[str] = []
        for event in triggered:
            state.satisfaction = clamp(state.satisfaction + event.delta_satisfaction)
            state.stability = clamp(state.stability + event.delta_stability)
            state.clue_points = clamp(state.clue_points + event.delta_clue_points)
            state.flags.update(event.add_flags)
            event_labels.append(f"{event.event_id}: {event.description}")
            if event.event_id == "closed_space":
                state.closed_space_count += 1
                state.worldline_shift += 3

        ending = rules.evaluate_ending(state)
        if ending is not None:
            state.ending_id = ending.ending_id
            state.ending_title = ending.title

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
            ending_id=state.ending_id,
        )
        return StepResult(state=state, record=record, action=action, events=event_labels, ending=ending)

    @staticmethod
    def _update_streak(state: GameState, action_id: str) -> None:
        if state.previous_action == action_id:
            state.current_action_streak += 1
        else:
            state.current_action_streak = 0
        state.previous_action = action_id

    @staticmethod
    def _advance_time(state: GameState) -> None:
        if state.timeslot_index == len(TIMESLOTS) - 1:
            state.timeslot_index = 0
            state.day += 1
            state.loop_count += 1
            # Slow drift emphasizes infinite-loop pressure.
            state.satisfaction = clamp(state.satisfaction - 1)
            state.stability = clamp(state.stability - 1)
        else:
            state.timeslot_index += 1
