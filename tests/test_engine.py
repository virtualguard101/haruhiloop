from haruhiloop_cli.engine import GameEngine
from haruhiloop_cli import rules
from haruhiloop_cli.models import StepCommand


def run_sequence(commands: list[StepCommand]):
    engine = GameEngine()
    state = engine.create_new_state("test", mutator_mode="deterministic", random_seed=11)
    history = []
    for idx, command in enumerate(commands, start=1):
        result = engine.step(state, command, idx)
        history.append(result.record)
        if state.is_finished:
            break
    return state, history


def test_engine_is_deterministic_for_same_scene_choice_sequence():
    commands = [
        StepCommand(scene_id="library", choice_id="nagato_crosscheck"),
        StepCommand(scene_id="library", choice_id="nagato_archives"),
        StepCommand(scene_id="home", choice_id="group_call_sync"),
        StepCommand(scene_id="clubroom", choice_id="surprise_pitch"),
        StepCommand(scene_id="city", choice_id="material_procurement"),
    ]
    state_a, history_a = run_sequence(commands)
    state_b, history_b = run_sequence(commands)
    assert state_a.snapshot() == state_b.snapshot()
    assert [item.to_dict() for item in history_a] == [item.to_dict() for item in history_b]


def test_closed_space_event_triggers_when_stability_low():
    engine = GameEngine()
    state = engine.create_new_state("closed-space")
    state.stability = 34
    result = engine.step(state, StepCommand(scene_id="library", choice_id="nagato_crosscheck"), 1)
    assert state.closed_space_stage >= 1
    assert any("闭锁空间" in event for event in result.events)


def test_scene_and_choice_reference_resolution():
    engine = GameEngine()
    state = engine.create_new_state("resolve")
    scene_id = rules.resolve_scene_ref(state, "1")
    assert scene_id in {scene.scene_id for scene in engine.available_scenes(state)}
    choice_id = rules.resolve_choice_ref(state, scene_id, "1")
    assert choice_id in {choice.choice_id for choice in engine.available_choices(state, scene_id)}


def test_homework_flag_after_three_homework_focus_steps():
    engine = GameEngine()
    state = engine.create_new_state("homework-chain")
    state.timeslot_index = 2
    for step in range(1, 4):
        engine.step(state, StepCommand(scene_id="home", choice_id="homework_focus"), step)
        state.timeslot_index = 2
    assert state.homework_progress == 3
    assert "homework_done" in state.flags


def test_step_record_contains_scene_and_choice_labels():
    engine = GameEngine()
    state = engine.create_new_state("record-fields", mutator_mode="ai", random_seed=7)
    result = engine.step(state, StepCommand(scene_id="clubroom", choice_id="group_briefing"), 1)
    assert result.record.scene_id == "clubroom"
    assert result.record.choice_id == "group_briefing"
    assert result.record.scene_label
    assert result.record.choice_label
