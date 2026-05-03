from haruhiloop_cli.engine import GameEngine
from haruhiloop_cli.models import StepCommand


def test_ending_haruhi_happy_new_world():
    engine = GameEngine()
    state = engine.create_new_state("ending-happy")
    state.satisfaction = 84
    state.clue_points = 10
    state.crew_sync = 65
    state.route_state.route_progress.update({"haruhi": 6, "truth": 4})
    state.route_state.character_affinity["haruhi"] = 62
    state.flags.update({"festival_plan", "homework_done", "truth_shared", "haruhi_calmed"})

    result = engine.step(state, StepCommand(scene_id="clubroom", choice_id="group_briefing"), 1)

    assert result.ending is not None
    assert result.ending.ending_id == "haruhi_happy_new_world"


def test_ending_kyon_breaks_loop():
    engine = GameEngine()
    state = engine.create_new_state("ending-break")
    state.clue_points = 11
    state.stability = 50
    state.crew_sync = 56
    state.route_state.route_progress.update({"truth": 5, "nagato": 3})
    state.flags.update({"anomaly_seen", "homework_done", "truth_shared"})

    result = engine.step(state, StepCommand(scene_id="library", choice_id="nagato_crosscheck"), 1)

    assert result.ending is not None
    assert result.ending.ending_id == "kyon_breaks_loop"


def test_ending_shinjin_emerges():
    engine = GameEngine()
    state = engine.create_new_state("ending-bad")
    state.satisfaction = 5
    state.stability = 0
    state.closed_space_count = 2

    result = engine.step(state, StepCommand(scene_id="clubroom", choice_id="group_briefing"), 1)

    assert result.ending is not None
    assert result.ending.ending_id == "shinirappears_unstable_world"


def test_ending_consensus_paradise():
    engine = GameEngine()
    state = engine.create_new_state("ending-consensus")
    state.satisfaction = 70
    state.stability = 55
    state.clue_points = 10
    state.route_state.route_progress.update({"koizumi": 4, "truth": 3})
    state.flags.update({"hope_signal", "truth_shared", "homework_done"})

    result = engine.step(state, StepCommand(scene_id="clubroom", choice_id="group_briefing"), 1)

    assert result.ending is not None
    assert result.ending.ending_id == "consensus_paradise"


def test_ending_meltdown_pact():
    engine = GameEngine()
    state = engine.create_new_state("ending-meltdown")
    state.satisfaction = 50
    state.stability = 18
    state.closed_space_count = 1
    state.route_state.route_progress["truth"] = 4
    state.route_state.route_tension = 6
    state.flags.add("truth_shared")

    result = engine.step(state, StepCommand(scene_id="library", choice_id="nagato_crosscheck"), 1)

    assert result.ending is not None
    assert result.ending.ending_id == "meltdown_pact"


def test_ending_observer_bailout():
    engine = GameEngine()
    state = engine.create_new_state("ending-observer")
    state.satisfaction = 50
    state.stability = 60
    state.clue_points = 10
    state.worldline_shift = 50
    state.route_state.route_progress.update({"truth": 2})
    state.flags.add("anomaly_seen")

    result = engine.step(state, StepCommand(scene_id="clubroom", choice_id="group_briefing"), 1)

    assert result.ending is not None
    assert result.ending.ending_id == "observer_bailout"


def test_ending_nagato_collapse_priority():
    engine = GameEngine()
    state = engine.create_new_state("ending-nagato")
    state.nagato_fatigue = 96
    state.route_state.route_progress["nagato"] = 6
    state.satisfaction = 90
    state.clue_points = 20
    state.flags.update({"festival_plan", "homework_done", "truth_shared"})

    result = engine.step(state, StepCommand(scene_id="clubroom", choice_id="group_briefing"), 1)

    assert result.ending is not None
    assert result.ending.ending_id == "nagato_collapse"


def test_nagato_collapse_needs_investigation_count():
    engine = GameEngine()
    state = engine.create_new_state("ending-nagato-gated")
    state.nagato_fatigue = 100
    state.route_state.route_progress["nagato"] = 5

    result = engine.step(state, StepCommand(scene_id="clubroom", choice_id="group_briefing"), 1)

    assert result.ending is None
