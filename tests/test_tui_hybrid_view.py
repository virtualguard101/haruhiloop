from rich.console import Console

from haruhiloop_cli.models import GameState, SceneChoice, StepRecord
from haruhiloop_cli.play_app import _toggle_view_mode
from haruhiloop_cli import i18n, view


def _render_text(renderable: object) -> str:
    console = Console(record=True, width=120)
    console.print(renderable)
    return console.export_text()


def test_hybrid_metric_table_hides_internal_rows_and_shows_trend():
    prev = GameState(
        run_id="hybrid",
        day=2,
        timeslot_index=1,
        loop_count=2,
        satisfaction=55,
        stability=60,
        clue_points=5,
        crew_sync=46,
        nagato_fatigue=38,
        homework_progress=1,
    )
    state = GameState(
        run_id="hybrid",
        day=2,
        timeslot_index=1,
        loop_count=3,
        satisfaction=62,
        stability=57,
        clue_points=7,
        crew_sync=52,
        nagato_fatigue=49,
        homework_progress=2,
        worldline_shift=44,
        closed_space_count=2,
        closed_space_stage=2,
        flags={"truth_shared"},
    )
    table = view.make_metric_table_hybrid(state, prev_state=prev)
    text = _render_text(table)
    assert "春日状态" in text
    assert "世界状态" in text
    assert "线索推进" in text
    assert "长门状态" in text
    assert "上升" in text or "下降" in text
    assert "世界线偏移" not in text
    assert "闭锁空间阶段" not in text
    assert "闭锁空间次数" not in text
    assert "扰动模式" not in text
    assert "记忆残留" not in text


def test_step_panel_splits_narrative_and_numeric_feedback():
    record = StepRecord(
        step_number=4,
        day=2,
        timeslot="afternoon",
        scene_id="clubroom",
        scene_label="活动室",
        choice_id="group_briefing",
        choice_label="例行集合",
        before={
            "satisfaction": 50,
            "stability": 58,
            "clue_points": 6,
            "nagato_fatigue": 35,
        },
        after={
            "satisfaction": 54,
            "stability": 55,
            "clue_points": 8,
            "nagato_fatigue": 39,
        },
        events=["团员协同突破：讨论效率提升"],
        mutation_profile={"satisfaction_factor": 1.1, "stability_factor": 0.9, "clue_factor": 1.2},
        ending_id=None,
        action_flavor="春日｜就现在。抬手。",
    )
    narrative_text = _render_text(view.make_step_panel(record, narrative_mode=True))
    numeric_text = _render_text(view.make_step_panel(record, narrative_mode=False))
    assert "阶段变化" in narrative_text
    assert "→" not in narrative_text
    assert "扰动系数" not in narrative_text
    assert "→" in numeric_text
    assert "扰动系数" in numeric_text


def test_toggle_view_mode_switches_between_hybrid_and_numeric():
    assert _toggle_view_mode("hybrid") == "numeric"
    assert _toggle_view_mode("numeric") == "hybrid"


def test_i18n_trend_and_band_helpers():
    assert i18n.format_trend(30, 40) == "上升"
    assert i18n.format_trend(30, 20) == "下降"
    assert i18n.format_trend(30, 30) == "持平"
    assert i18n.band_stability(80) == "平稳"
    assert i18n.band_stability(10) == "崩解边缘"


def test_galgame_choice_selector_panel_shows_selected_entry():
    choices = [
        SceneChoice(
            scene_id="clubroom",
            choice_id="group_briefing",
            label="例行集合",
            description="统一今天计划，保持队伍基本节奏。",
            delta_satisfaction=1,
            delta_stability=2,
        ),
        SceneChoice(
            scene_id="clubroom",
            choice_id="surprise_pitch",
            label="推进惊喜企划",
            description="继续打磨夏日企划，刺激春日的兴奋感。",
            delta_satisfaction=7,
            delta_stability=-1,
        ),
    ]
    panel_text = _render_text(view.make_choice_selector_panel(choices, scene_label="活动室", highlight_index=2))
    assert "行动选项" in panel_text
    assert "推进惊喜企划" in panel_text
    assert "数字键选中，Enter 确认，r 重置" in panel_text
