from haruhiloop_cli.engine import GameEngine


def test_crew_sync_soft_gate_penalty():
    engine = GameEngine()
    state = engine.create_new_state("crew-soft-gate")
    state.crew_sync = 40
    result = engine.step(state, "同步循环真相", 1)
    assert any("协同不足" in event for event in result.events)


def test_memory_residue_accumulates_after_day_cycle():
    engine = GameEngine()
    state = engine.create_new_state("memory-loop")
    state.flags.update({"truth_shared", "homework_done"})
    engine.step(state, "老实上课", 1)
    engine.step(state, "老实上课", 2)
    engine.step(state, "老实上课", 3)
    assert state.memory_residue["sync_recovery"] >= 1

