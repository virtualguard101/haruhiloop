from haruhiloop_cli import action_flavor_zh
from haruhiloop_cli.engine import GameEngine
from haruhiloop_cli import rules
from haruhiloop_cli.models import GameState


def test_mikuru_critical_uses_dialogue_pool_for_club_activity():
    engine = GameEngine()
    state = engine.create_new_state("mk", mutator_mode="deterministic", random_seed=5)
    state.crew_sync = 40
    t = engine.step(state, "社团活动", 1).record.action_flavor
    assert t is not None
    assert t.strip().startswith("朝比奈：")
    assert "「" not in t and "」" not in t


def test_mikuru_critical_also_by_worldline_shift():
    engine = GameEngine()
    state = engine.create_new_state("mk2", mutator_mode="deterministic", random_seed=5)
    state.crew_sync = 60
    state.worldline_shift = 58
    t = engine.step(state, "社团活动", 1).record.action_flavor
    assert t.strip().startswith("朝比奈：")


def test_mikuru_not_critical_uses_normal_club_flavor():
    engine = GameEngine()
    state = engine.create_new_state("mk3", mutator_mode="deterministic", random_seed=5)
    state.crew_sync = 55
    state.worldline_shift = 0
    t = engine.step(state, "社团活动", 1).record.action_flavor
    assert not t.strip().startswith("朝比奈：")


def test_mikuru_critical_no_three_identical():
    state = GameState(run_id="mk4", random_seed=2)
    state.crew_sync = 35
    texts: list[str] = []
    for step in range(1, 200):
        state.action_counts["社团活动"] = state.action_counts.get("社团活动", 0) + 1
        texts.append(action_flavor_zh.pick_action_flavor(state, "社团活动", step))
    for a, b, c in zip(texts, texts[1:], texts[2:]):
        assert not (a == b == c)


def test_nagato_fatigue_ge_80_uses_fatigue_flavor_pool_for_longmen_actions():
    engine = GameEngine()
    state = engine.create_new_state("nf", mutator_mode="deterministic", random_seed=11)
    state.nagato_fatigue = 75
    t = engine.step(state, "向长门核对异常", 1).record.action_flavor
    assert t is not None
    assert t.strip().startswith("长门：")
    assert "「" not in t and "」" not in t
    assert any(m in t for m in ("别催", "别动", "跟不上", "别聊天", "返工"))


def test_nagato_fatigue_below_80_uses_normal_flavor_for_check():
    engine = GameEngine()
    state = engine.create_new_state("nf2", mutator_mode="deterministic", random_seed=11)
    state.nagato_fatigue = 69
    t = engine.step(state, "向长门核对异常", 1).record.action_flavor
    assert t is not None
    assert not t.strip().startswith("长门：")
    assert "别催" not in t and "跟不上" not in t and "返工" not in t


def test_nagato_fatigue_flavor_no_three_identical():
    state = GameState(run_id="nfs", random_seed=3)
    state.nagato_fatigue = 90
    texts: list[str] = []
    for step in range(1, 300):
        state.action_counts["向长门核对异常"] = state.action_counts.get("向长门核对异常", 0) + 1
        texts.append(action_flavor_zh.pick_action_flavor(state, "向长门核对异常", step))
    for a, b, c in zip(texts, texts[1:], texts[2:]):
        assert not (a == b == c)


def test_legacy_club_flavor_recent_migrates_to_dict():
    s = GameState.from_dict({"run_id": "legacy", "club_activity_flavor_recent": [2, 2]})
    assert s.action_flavor_recent.get("社团活动") == (2, 2)


def test_all_actions_have_ten_flavor_variants():
    for aid in rules.ORDERED_ACTION_IDS:
        assert aid in action_flavor_zh.ACTION_FLAVOR_VARIANTS
        assert len(action_flavor_zh.ACTION_FLAVOR_VARIANTS[aid]) == 10


def test_club_activity_flavor_deterministic():
    engine = GameEngine()
    a = engine.create_new_state("same-run", mutator_mode="deterministic", random_seed=123)
    b = engine.create_new_state("same-run", mutator_mode="deterministic", random_seed=123)
    fa = engine.step(a, "社团活动", 1).record.action_flavor
    fb = engine.step(b, "社团活动", 1).record.action_flavor
    assert fa == fb
    assert fa is not None


def test_each_action_gets_flavor_on_first_step():
    engine = GameEngine()
    for aid in rules.ORDERED_ACTION_IDS:
        state = engine.create_new_state(f"fl-{aid}", mutator_mode="deterministic", random_seed=1)
        result = engine.step(state, aid, 1)
        assert not state.is_finished, aid
        assert result.record.action_flavor is not None
        assert len(result.record.action_flavor.strip()) > 20


def test_club_activity_never_three_identical_flavors_in_row():
    """不与完整局内结局判定耦合：只验证抽取器在伪随机下不出现三连相同正文。"""
    state = GameState(run_id="streak-only", random_seed=7)
    texts: list[str] = []
    for step in range(1, 500):
        state.action_counts[action_flavor_zh.CLUB_ACTION_ID] = (
            state.action_counts.get(action_flavor_zh.CLUB_ACTION_ID, 0) + 1
        )
        text, _ = action_flavor_zh.pick_club_activity_flavor(state, step)
        texts.append(text)
    for a, b, c in zip(texts, texts[1:], texts[2:]):
        assert not (a == b == c)


def test_club_activity_integration_no_immediate_triple():
    engine = GameEngine()
    state = engine.create_new_state("triple-int", mutator_mode="deterministic", random_seed=0)
    t1 = engine.step(state, "社团活动", 1).record.action_flavor
    t2 = engine.step(state, "社团活动", 2).record.action_flavor
    t3 = engine.step(state, "社团活动", 3).record.action_flavor
    assert t1 and t2 and t3
    assert not (t1 == t2 == t3)


def _state_high_pressure_tier0() -> GameState:
    s = GameState(run_id="kyon0", random_seed=1)
    s.stability = 50
    s.satisfaction = 50
    s.worldline_shift = 54
    return s


def test_kyon_collapse_inner_monologue_no_name_prefix():
    engine = GameEngine()
    for i in range(80):
        state = engine.create_new_state(f"kyon-hw-{i}", mutator_mode="deterministic", random_seed=3)
        # step 内会先套用动作的 Δ 满意/稳定，再抽 flavor；完成暑假作业为 +2/+4，初值须预留。
        state.stability = 46
        state.satisfaction = 46
        state.worldline_shift = 54
        t = engine.step(state, "完成暑假作业", 1).record.action_flavor
        assert t is not None
        if not t.strip().startswith("「"):
            continue
        assert "」" in t
        assert "长门：" not in t and "朝比奈：" not in t
        assert "阿虚：" not in t
        return
    raise AssertionError("expected inner pool hit within 80 run_id flips")


def test_kyon_collapse_tier2_when_pressure_maxed():
    engine = GameEngine()
    for i in range(80):
        state = engine.create_new_state(f"kyon2-{i}", mutator_mode="deterministic", random_seed=3)
        state.stability = 20
        state.satisfaction = 20
        state.worldline_shift = 60
        state.nagato_fatigue = 40
        state.homework_progress = 3
        state.crew_sync = 25
        t = engine.step(state, "老实上课", 1).record.action_flavor
        assert t is not None
        if "随便吧" in t or "躺平" in t or "放空" in t or "爱循环" in t or "不想劝" in t:
            return
    raise AssertionError("expected tier-2 inner hit within 80 run_id flips")


def test_kyon_yields_to_nagato_fatigue_pool():
    engine = GameEngine()
    state = engine.create_new_state("kyon-vs-n", mutator_mode="deterministic", random_seed=3)
    state.stability = 30
    state.satisfaction = 30
    state.worldline_shift = 50
    state.nagato_fatigue = 85
    t = engine.step(state, "向长门核对异常", 1).record.action_flavor
    assert t is not None
    assert t.strip().startswith("长门：")


def test_kyon_yields_to_mikuru_critical_pool():
    engine = GameEngine()
    state = engine.create_new_state("kyon-vs-m", mutator_mode="deterministic", random_seed=3)
    state.stability = 30
    state.satisfaction = 30
    state.worldline_shift = 60
    state.crew_sync = 35
    t = engine.step(state, "社团活动", 1).record.action_flavor
    assert t is not None
    assert t.strip().startswith("朝比奈：")


def test_kyon_collapse_no_three_identical_same_tier():
    state = _state_high_pressure_tier0()
    texts: list[str] = []
    for step in range(1, 250):
        state.action_counts["完成暑假作业"] = state.action_counts.get("完成暑假作业", 0) + 1
        texts.append(action_flavor_zh.pick_action_flavor(state, "完成暑假作业", step))
    for a, b, c in zip(texts, texts[1:], texts[2:]):
        assert not (a == b == c)


def _state_ensemble_closed_space() -> GameState:
    s = GameState(run_id="ens-cs", random_seed=1)
    s.closed_space_stage = 2
    return s


def test_ensemble_burst_triggers_on_closed_space_stage():
    engine = GameEngine()
    state = engine.create_new_state("ens1", mutator_mode="deterministic", random_seed=9)
    state.closed_space_stage = 2
    t = engine.step(state, "社团活动", 1).record.action_flavor
    assert t is not None
    assert "春日｜" in t
    assert "长门｜" in t
    assert "朝比奈｜" in t
    assert "古泉｜" in t
    assert "阿虚｜" in t
    assert "长门：" not in t
    assert "朝比奈：" not in t


def test_ensemble_burst_happy_runway():
    s = GameState(run_id="ens-hw", random_seed=2)
    s.flags.update({"festival_plan", "homework_done", "truth_shared"})
    s.satisfaction = 76
    s.crew_sync = 62
    s.clue_points = 8
    s.category_counts["breakthrough"] = 2
    s.category_counts["coordination"] = 1
    t = action_flavor_zh.pick_action_flavor(s, "策划惊喜活动", 1)
    assert t is not None
    assert "春日｜" in t


def test_ensemble_overrides_nagato_fatigue_and_mikuru_critical():
    s = GameState(run_id="ens-ov", random_seed=2)
    s.closed_space_stage = 2
    s.nagato_fatigue = 85
    s.crew_sync = 35
    s.worldline_shift = 60
    t1 = action_flavor_zh.pick_action_flavor(s, "向长门核对异常", 1)
    t2 = action_flavor_zh.pick_action_flavor(s, "社团活动", 2)
    assert "春日｜" in t1 and "春日｜" in t2
    assert not t1.strip().startswith("长门：")
    assert not t2.strip().startswith("朝比奈：")


def test_ensemble_not_active_when_flags_below_happy_runway():
    s = GameState(run_id="ens-off", random_seed=2)
    s.flags.update({"festival_plan", "homework_done", "truth_shared"})
    s.satisfaction = 74
    s.crew_sync = 62
    s.clue_points = 8
    s.category_counts["breakthrough"] = 2
    s.category_counts["coordination"] = 1
    t = action_flavor_zh.pick_action_flavor(s, "社团活动", 1)
    assert t is not None
    assert "春日｜" not in t


def test_easter_never_on_first_total_action_count():
    """本局第一次动作（累计次数和为 1）不触发佐佐木/朝比奈（大）覆盖。"""
    for i in range(200):
        rid = f"egg0-{i}"
        s = GameState(run_id=rid, random_seed=i)
        s.action_counts["社团活动"] = 1
        t = action_flavor_zh.pick_action_flavor(s, "社团活动", 1)
        assert t is not None
        assert not t.startswith("佐佐木：")
        assert not t.startswith("朝比奈（大）：")


def test_easter_sasaki_and_mikuru_adult_exist_with_second_total_action():
    """累计≥2 时，在若干 run_id 下应能刷出两种彩蛋（各约 1% 量级，用搜索避免脆片）。"""
    found_s = found_m = False
    for rid_i in range(8000):
        rid = f"egg1-{rid_i:05d}"
        s = GameState(run_id=rid, random_seed=rid_i % 97)
        s.action_counts["社团活动"] = 1
        s.action_counts["老实上课"] = 1
        t = action_flavor_zh.pick_action_flavor(s, "完成暑假作业", 2)
        if t.startswith("佐佐木："):
            found_s = True
        if t.startswith("朝比奈（大）："):
            found_m = True
        if found_s and found_m:
            break
    assert found_s and found_m


def test_easter_does_not_apply_to_special_pools():
    s = GameState(run_id="egg-sp", random_seed=1)
    s.action_counts["社团活动"] = 2
    s.closed_space_stage = 2
    t = action_flavor_zh.pick_action_flavor(s, "社团活动", 2)
    assert "春日｜" in t
    assert not t.startswith("佐佐木：")


def test_ensemble_burst_global_streak_no_three_identical():
    state = _state_ensemble_closed_space()
    texts: list[str] = []
    for step in range(1, 200):
        state.action_counts["社团活动"] = state.action_counts.get("社团活动", 0) + 1
        texts.append(action_flavor_zh.pick_action_flavor(state, "社团活动", step))
    for a, b, c in zip(texts, texts[1:], texts[2:]):
        assert not (a == b == c)
