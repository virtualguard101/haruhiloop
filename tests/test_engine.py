from haruhiloop_cli.engine import GameEngine
from haruhiloop_cli import rules


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
        "向长门核对异常",
        "向长门借资料",
        "同步循环真相",
        "完成暑假作业",
        "策划惊喜活动",
    ]
    state_a, history_a = run_sequence(actions)
    state_b, history_b = run_sequence(actions)

    assert state_a.snapshot() == state_b.snapshot()
    assert [item.to_dict() for item in history_a] == [item.to_dict() for item in history_b]


def test_closed_space_event_triggers_when_stability_low():
    engine = GameEngine()
    state = engine.create_new_state("closed-space")
    state.stability = 34
    result = engine.step(state, "向长门核对异常", 1)

    assert state.closed_space_count >= 1
    assert any("闭锁空间" in event for event in result.events)


def test_resolve_action_ref_index_and_chinese_name():
    assert rules.resolve_action_ref("3") == "向长门核对异常"
    assert rules.resolve_action_ref(" 3 ") == "向长门核对异常"
    assert rules.resolve_action_ref("向长门核对异常") == "向长门核对异常"
