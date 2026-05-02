from haruhiloop_cli.models import GameState
from haruhiloop_cli.mutator import DeterministicMutator, validate_profile


def test_validate_profile_clamps_range():
    profile = validate_profile(
        {"satisfaction_factor": 2.0, "stability_factor": 0.1, "clue_factor": 1.05}
    )
    assert profile["satisfaction_factor"] == 1.2
    assert profile["stability_factor"] == 0.8
    assert profile["clue_factor"] == 1.05


def test_deterministic_mutator_depends_on_state():
    mutator = DeterministicMutator()
    base = GameState(run_id="a")
    stressed = GameState(run_id="b", loop_count=10, stability=30)
    profile_a = mutator.mutate(base).to_dict()
    profile_b = mutator.mutate(stressed).to_dict()
    assert profile_a != profile_b
