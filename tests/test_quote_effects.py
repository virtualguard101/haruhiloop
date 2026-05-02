from haruhiloop_cli.models import GameState
from haruhiloop_cli.view import _apply_noise, build_quote_visual_state


def test_build_quote_visual_state_copies_runtime_fields():
    state = GameState(
        run_id="quote-state",
        day=3,
        loop_count=4,
        closed_space_stage=2,
        nagato_fatigue=71,
        worldline_shift=9,
    )
    visual = build_quote_visual_state(
        state,
        pulse_phase=1,
        transition_frames=2,
        clock_tick=7,
    )
    assert visual.day == 3
    assert visual.loop_count == 4
    assert visual.closed_space_stage == 2
    assert visual.nagato_fatigue == 71
    assert visual.transition_frames == 2
    assert visual.clock_tick == 7
    assert visual.worldline_shift == 9


def test_apply_noise_keeps_length_and_changes_chars_when_enabled():
    text = "過ぎ去った時間は、決して取り戻せないのよ"
    no_noise = _apply_noise(text, noise_level=0, seed=3)
    noisy = _apply_noise(text, noise_level=2, seed=3)
    assert no_noise == text
    assert len(noisy) == len(text)
    assert noisy != text
