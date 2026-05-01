from haruhi_cli.engine import GameEngine


def run_sequence(actions: list[str]):
    engine = GameEngine()
    state = engine.create_new_state("test")
    history = []
    for idx, action in enumerate(actions, start=1):
        result = engine.step(state, action, idx)
        history.append(result.record)
        if state.is_finished:
            break
    return state, history


def test_engine_is_deterministic_for_same_actions():
    actions = [
        "observe_anomaly",
        "collect_clue",
        "share_truth",
        "complete_homework",
        "plan_festival",
    ]
    state_a, history_a = run_sequence(actions)
    state_b, history_b = run_sequence(actions)

    assert state_a.snapshot() == state_b.snapshot()
    assert [item.to_dict() for item in history_a] == [item.to_dict() for item in history_b]


def test_closed_space_event_triggers_when_stability_low():
    engine = GameEngine()
    state = engine.create_new_state("closed-space")
    state.stability = 34
    result = engine.step(state, "observe_anomaly", 1)

    assert state.closed_space_count >= 1
    assert any("closed_space" in event for event in result.events)
