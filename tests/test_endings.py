from haruhi_cli.engine import GameEngine


def test_ending_haruhi_happy_new_world():
    engine = GameEngine()
    state = engine.create_new_state("ending-happy")
    state.satisfaction = 84
    state.clue_points = 10
    state.flags.update({"festival_plan", "homework_done", "truth_shared"})

    result = engine.step(state, "calm_haruhi", 1)

    assert result.ending is not None
    assert result.ending.ending_id == "haruhi_happy_new_world"


def test_ending_kyon_breaks_loop():
    engine = GameEngine()
    state = engine.create_new_state("ending-break")
    state.clue_points = 11
    state.stability = 50
    state.flags.update({"anomaly_seen", "homework_done", "truth_shared"})

    result = engine.step(state, "observe_anomaly", 1)

    assert result.ending is not None
    assert result.ending.ending_id == "kyon_breaks_loop"


def test_ending_shinjin_emerges():
    engine = GameEngine()
    state = engine.create_new_state("ending-bad")
    state.satisfaction = 5
    state.stability = 0
    state.closed_space_count = 2

    result = engine.step(state, "attend_class", 1)

    assert result.ending is not None
    assert result.ending.ending_id == "shinirappears_unstable_world"
