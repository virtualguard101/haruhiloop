from haruhiloop_cli import action_flavor_zh
from haruhiloop_cli.engine import GameEngine
from haruhiloop_cli.models import GameState, StepCommand


def test_flavor_is_generated_for_scene_choice():
    state = GameState(run_id="flavor-basic", random_seed=3)
    text = action_flavor_zh.pick_choice_flavor(state, "clubroom", "group_briefing", 1)
    assert text is not None
    assert len(text.strip()) > 10


def test_flavor_is_deterministic_for_same_seeded_state():
    engine = GameEngine()
    a = engine.create_new_state("same-run", mutator_mode="deterministic", random_seed=123)
    b = engine.create_new_state("same-run", mutator_mode="deterministic", random_seed=123)
    ra = engine.step(a, StepCommand(scene_id="clubroom", choice_id="group_briefing"), 1).record.action_flavor
    rb = engine.step(b, StepCommand(scene_id="clubroom", choice_id="group_briefing"), 1).record.action_flavor
    assert ra == rb


def test_flavor_no_three_identical_for_same_choice():
    state = GameState(run_id="flavor-streak", random_seed=7)
    texts: list[str] = []
    for step in range(1, 120):
        state.scene_choice_counts["group_briefing"] = state.scene_choice_counts.get("group_briefing", 0) + 1
        text = action_flavor_zh.pick_choice_flavor(state, "clubroom", "group_briefing", step)
        assert text is not None
        texts.append(text)
    for a, b, c in zip(texts, texts[1:], texts[2:]):
        assert not (a == b == c)


def test_engine_step_record_contains_choice_flavor():
    engine = GameEngine()
    state = engine.create_new_state("flavor-record")
    result = engine.step(state, StepCommand(scene_id="library", choice_id="nagato_crosscheck"), 1)
    assert result.record.action_flavor is not None
