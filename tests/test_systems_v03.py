from haruhiloop_cli.engine import GameEngine
from haruhiloop_cli.models import StepCommand


def test_crew_sync_soft_gate_penalty():
    engine = GameEngine()
    state = engine.create_new_state("crew-soft-gate")
    state.crew_sync = 40
    state.timeslot_index = 2
    result = engine.step(state, StepCommand(scene_id="home", choice_id="group_call_sync"), 1)
    assert any("协同不足" in event for event in result.events)


def test_memory_residue_accumulates_after_day_cycle():
    engine = GameEngine()
    state = engine.create_new_state("memory-loop")
    state.flags.update({"truth_shared", "homework_done"})
    engine.step(state, StepCommand(scene_id="clubroom", choice_id="group_briefing"), 1)
    engine.step(state, StepCommand(scene_id="clubroom", choice_id="group_briefing"), 2)
    engine.step(state, StepCommand(scene_id="riverside", choice_id="stargazing_talk"), 3)
    assert state.memory_residue["sync_recovery"] >= 1

