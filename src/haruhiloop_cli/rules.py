from __future__ import annotations

from haruhiloop_cli.models import Ending, EventOutcome, GameState, Scene, SceneChoice
from haruhiloop_cli.ending_epilogues import epilogue_for

NAGATO_COLLAPSE_FATIGUE_THRESHOLD = 96

SCENES: dict[str, Scene] = {
    "clubroom": Scene(
        scene_id="clubroom",
        label="活动室",
        description="SOS 团活动室，意见与情绪最容易正面碰撞。",
        timeslots=("morning", "afternoon"),
        choices=(
            SceneChoice(
                scene_id="clubroom",
                choice_id="group_briefing",
                label="例行集合",
                description="统一今天计划，保持队伍基本节奏。",
                delta_stability=2,
                delta_satisfaction=1,
                route_progress={"koizumi": 1},
                affinity_delta={"koizumi": 1, "haruhi": 1},
                tags=("routine",),
            ),
            SceneChoice(
                scene_id="clubroom",
                choice_id="surprise_pitch",
                label="推进惊喜企划",
                description="继续打磨夏日企划，刺激春日的兴奋感。",
                delta_satisfaction=7,
                delta_stability=-1,
                add_flags=("festival_plan",),
                route_progress={"haruhi": 2},
                affinity_delta={"haruhi": 2},
                tags=("festival", "breakthrough"),
            ),
            SceneChoice(
                scene_id="clubroom",
                choice_id="haruhi_calm_talk",
                label="私下安抚春日",
                description="转移冲突焦点，压低闭锁空间风险。",
                delta_satisfaction=5,
                delta_stability=3,
                add_flags=("haruhi_calmed",),
                route_progress={"haruhi": 1},
                affinity_delta={"haruhi": 2, "kyon": 1},
                tags=("coordination",),
            ),
        ),
    ),
    "library": Scene(
        scene_id="library",
        label="图书馆",
        description="静态调查场，长门路线与世界线证据主要来源。",
        timeslots=("morning", "afternoon", "evening"),
        choices=(
            SceneChoice(
                scene_id="library",
                choice_id="nagato_crosscheck",
                label="向长门核对异常",
                description="校对异常样本，提升线索精度。",
                delta_clue_points=3,
                delta_stability=-2,
                delta_nagato_fatigue=10,
                add_flags=("anomaly_seen",),
                route_progress={"nagato": 2, "truth": 1},
                affinity_delta={"nagato": 2},
                tags=("investigation", "nagato"),
            ),
            SceneChoice(
                scene_id="library",
                choice_id="nagato_archives",
                label="借阅归档资料",
                description="调取旧记录构建循环证据链。",
                delta_clue_points=4,
                delta_satisfaction=-1,
                delta_nagato_fatigue=15,
                add_flags=("clue_chain_started",),
                route_progress={"nagato": 2, "truth": 1},
                affinity_delta={"nagato": 1},
                tags=("investigation", "nagato"),
            ),
            SceneChoice(
                scene_id="library",
                choice_id="solo_trace",
                label="独自整理线索",
                description="阿虚独立复盘，降低团队摩擦。",
                delta_clue_points=2,
                delta_stability=1,
                route_progress={"truth": 1},
                affinity_delta={"kyon": 1},
                tags=("investigation",),
            ),
        ),
    ),
    "city": Scene(
        scene_id="city",
        label="商店街",
        description="高噪声公共场景，适合社交推进与突发事件。",
        timeslots=("afternoon", "evening"),
        choices=(
            SceneChoice(
                scene_id="city",
                choice_id="material_procurement",
                label="采购活动物料",
                description="补齐企划执行资源，推进现场准备。",
                delta_satisfaction=4,
                delta_stability=-1,
                delta_clue_points=1,
                route_progress={"haruhi": 1},
                affinity_delta={"haruhi": 1, "mikuru": 1},
                tags=("festival", "breakthrough"),
            ),
            SceneChoice(
                scene_id="city",
                choice_id="mikuru_support",
                label="陪朝比奈踩点",
                description="缓解朝比奈临界压力，换取情报碎片。",
                delta_satisfaction=2,
                delta_stability=1,
                delta_clue_points=1,
                route_progress={"mikuru": 2},
                affinity_delta={"mikuru": 3},
                tags=("mikuru", "coordination"),
            ),
            SceneChoice(
                scene_id="city",
                choice_id="koizumi_debrief",
                label="与古泉交换情报",
                description="拉齐组织视角，建立协同边界。",
                delta_stability=3,
                delta_clue_points=2,
                route_progress={"koizumi": 2, "truth": 1},
                affinity_delta={"koizumi": 2},
                tags=("coordination", "truth_sync"),
            ),
        ),
    ),
    "home": Scene(
        scene_id="home",
        label="阿虚家",
        description="低刺激环境，适合补作业、整顿情绪。",
        timeslots=("evening",),
        choices=(
            SceneChoice(
                scene_id="home",
                choice_id="homework_focus",
                label="补习/作业推进",
                description="集中处理暑假作业，减少长期压力源。",
                delta_satisfaction=2,
                delta_stability=4,
                route_progress={"haruhi": 1},
                tags=("homework", "breakthrough"),
            ),
            SceneChoice(
                scene_id="home",
                choice_id="private_reflection",
                label="在家消磨并复盘",
                description="降低社交摩擦，沉淀线索结构。",
                delta_stability=2,
                delta_clue_points=1,
                route_progress={"truth": 1},
                affinity_delta={"kyon": 1},
                tags=("routine",),
            ),
            SceneChoice(
                scene_id="home",
                choice_id="group_call_sync",
                label="夜间群聊同步循环",
                description="通过远程交流统一风险判断。",
                delta_satisfaction=3,
                delta_clue_points=2,
                add_flags=("truth_shared",),
                route_progress={"truth": 2, "koizumi": 1},
                affinity_delta={"koizumi": 1, "haruhi": 1},
                tags=("truth_sync", "coordination"),
            ),
        ),
    ),
    "riverside": Scene(
        scene_id="riverside",
        label="河堤公园",
        description="夏日晚间情绪节点，容易触发关键分歧。",
        timeslots=("evening",),
        choices=(
            SceneChoice(
                scene_id="riverside",
                choice_id="stargazing_talk",
                label="与春日看夜空",
                description="通过共享体验拉高情绪阈值。",
                delta_satisfaction=6,
                delta_stability=1,
                route_progress={"haruhi": 2},
                affinity_delta={"haruhi": 3},
                tags=("haruhi_route",),
            ),
            SceneChoice(
                scene_id="riverside",
                choice_id="truth_discussion",
                label="面对面揭示循环",
                description="直接讨论循环真相，风险与收益都更高。",
                delta_satisfaction=4,
                delta_stability=-2,
                delta_clue_points=2,
                add_flags=("truth_shared",),
                route_progress={"truth": 3},
                affinity_delta={"haruhi": 1, "nagato": 1, "koizumi": 1},
                tags=("truth_sync", "high_risk"),
            ),
            SceneChoice(
                scene_id="riverside",
                choice_id="nagato_break",
                label="让长门休整",
                description="强制降载，换取短期稳定。",
                delta_stability=3,
                delta_nagato_fatigue=-6,
                route_progress={"nagato": 1},
                affinity_delta={"nagato": 2},
                tags=("nagato_relief",),
            ),
        ),
    ),
}

def get_available_scenes(state: GameState) -> list[Scene]:
    ts = state.timeslot
    return [scene for scene in SCENES.values() if ts in scene.timeslots]


def get_scene(scene_id: str) -> Scene | None:
    return SCENES.get(scene_id)


def get_available_choices(state: GameState, scene_id: str) -> list[SceneChoice]:
    _ = state
    scene = SCENES.get(scene_id)
    if scene is None:
        return []
    return list(scene.choices)


def resolve_scene_ref(state: GameState, token: str) -> str:
    t = token.strip()
    scenes = get_available_scenes(state)
    if t.isdigit():
        i = int(t)
        if 1 <= i <= len(scenes):
            return scenes[i - 1].scene_id
        raise ValueError(f"场景序号须在 1–{len(scenes)} 之间：{t}")
    for scene in scenes:
        if t in {scene.scene_id, scene.label}:
            return scene.scene_id
    raise ValueError(f"未知场景：{t}")


def resolve_choice_ref(state: GameState, scene_id: str, token: str) -> str:
    t = token.strip()
    choices = get_available_choices(state, scene_id)
    if t.isdigit():
        i = int(t)
        if 1 <= i <= len(choices):
            return choices[i - 1].choice_id
        raise ValueError(f"选项序号须在 1–{len(choices)} 之间：{t}")
    for choice in choices:
        if t in {choice.choice_id, choice.label}:
            return choice.choice_id
    raise ValueError(f"未知选项：{t}")


def find_choice(scene_id: str, choice_id: str) -> SceneChoice | None:
    scene = SCENES.get(scene_id)
    if scene is None:
        return None
    for choice in scene.choices:
        if choice.choice_id == choice_id:
            return choice
    return None


def choice_has_tag(choice: SceneChoice, tag: str) -> bool:
    return tag in choice.tags


def _route_progress_at_least(state: GameState, route_id: str, minimum: int) -> bool:
    return state.route_state.route_progress.get(route_id, 0) >= minimum


def _affinity_at_least(state: GameState, character_id: str, minimum: int) -> bool:
    return state.route_state.character_affinity.get(character_id, 0) >= minimum


def evaluate_events(state: GameState, choice: SceneChoice) -> list[EventOutcome]:
    outcomes: list[EventOutcome] = []

    if state.current_choice_streak >= 2:
        outcomes.append(
            EventOutcome(
                event_id="boredom_spike",
                description="重复同样的安排让春日更加厌倦。",
                delta_satisfaction=-2 * state.current_choice_streak,
                delta_stability=-state.current_choice_streak,
            )
        )

    if state.timeslot == "evening":
        outcomes.append(
            EventOutcome(
                event_id="day_end_drift",
                description="这一天又在未解的心结里结束。",
                delta_satisfaction=-2,
                delta_stability=-1,
            )
        )

    if state.satisfaction <= 30 and "anomaly_seen" not in state.flags:
        outcomes.append(
            EventOutcome(
                event_id="restless_search",
                description="情绪低落迫使她转向可疑的岔路。",
                delta_stability=-3,
                add_flags=("anomaly_seen",),
            )
        )

    if choice_has_tag(choice, "truth_sync") and state.crew_sync < 55:
        outcomes.append(
            EventOutcome(
                event_id="sync_without_alignment",
                description="团员协同不足，同步真相并未形成稳定合力。",
                delta_stability=-2,
                delta_satisfaction=-1,
            )
        )

    if (
        choice_has_tag(choice, "festival")
        and "homework_done" in state.flags
        and "truth_shared" in state.flags
        and state.crew_sync >= 60
    ):
        outcomes.append(
            EventOutcome(
                event_id="hope_signal",
                description="计划逐渐成形，大家的世界线开始偏移向更好的方向。",
                delta_satisfaction=6,
                delta_stability=5,
                delta_clue_points=2,
                add_flags=("hope_signal",),
            )
        )

    return outcomes


def evaluate_ending(state: GameState) -> Ending | None:
    """多结局按优先级判定：路线进度 + 关键叙事标记 + 状态阈值。"""
    if (
        state.nagato_fatigue >= NAGATO_COLLAPSE_FATIGUE_THRESHOLD
        and _route_progress_at_least(state, "nagato", 6)
    ):
        return Ending(
            ending_id="nagato_collapse",
            title="长门有希的崩坏",
            description=epilogue_for("nagato_collapse"),
        )

    if (
        _route_progress_at_least(state, "haruhi", 6)
        and _route_progress_at_least(state, "truth", 4)
        and _affinity_at_least(state, "haruhi", 62)
        and
        state.satisfaction >= 85
        and state.clue_points >= 10
        and {"festival_plan", "homework_done", "truth_shared", "haruhi_calmed"}.issubset(state.flags)
        and state.crew_sync >= 65
    ):
        return Ending(
            ending_id="haruhi_happy_new_world",
            title="晴空下的新周目",
            description=epilogue_for("haruhi_happy_new_world"),
        )

    if (
        _route_progress_at_least(state, "koizumi", 4)
        and _route_progress_at_least(state, "truth", 3)
        and
        state.satisfaction >= 68
        and state.stability >= 52
        and state.clue_points >= 9
        and {"hope_signal", "truth_shared", "homework_done"}.issubset(state.flags)
    ):
        return Ending(
            ending_id="consensus_paradise",
            title="共识温室",
            description=epilogue_for("consensus_paradise"),
        )

    if (
        _route_progress_at_least(state, "truth", 5)
        and _route_progress_at_least(state, "nagato", 3)
        and
        state.clue_points >= 12
        and {"anomaly_seen", "homework_done", "truth_shared"}.issubset(state.flags)
        and state.stability >= 45
        and state.crew_sync >= 55
    ):
        return Ending(
            ending_id="kyon_breaks_loop",
            title="切口与回声",
            description=epilogue_for("kyon_breaks_loop"),
        )

    if (
        _route_progress_at_least(state, "truth", 4)
        and
        "truth_shared" in state.flags
        and state.stability <= 20
        and state.satisfaction >= 38
        and state.closed_space_count >= 1
        and state.route_state.route_tension >= 6
    ):
        return Ending(
            ending_id="meltdown_pact",
            title="真相暴晒协议",
            description=epilogue_for("meltdown_pact"),
        )

    if (
        _route_progress_at_least(state, "haruhi", 5)
        and
        "festival_plan" in state.flags
        and "truth_shared" not in state.flags
        and state.satisfaction >= 76
        and state.clue_points <= 7
    ):
        return Ending(
            ending_id="hollow_celebration",
            title="空洞庆典",
            description=epilogue_for("hollow_celebration"),
        )

    if (
        _route_progress_at_least(state, "nagato", 5)
        and
        state.clue_points >= 16
        and 0 < state.stability <= 38
        and {"anomaly_seen", "clue_chain_started", "truth_shared"}.issubset(state.flags)
    ):
        return Ending(
            ending_id="archive_bound",
            title="归档囚徒",
            description=epilogue_for("archive_bound"),
        )

    if (
        _route_progress_at_least(state, "truth", 2)
        and
        state.worldline_shift >= 48
        and state.clue_points >= 9
        and state.satisfaction <= 52
        and "anomaly_seen" in state.flags
    ):
        return Ending(
            ending_id="observer_bailout",
            title="观测者脱钩",
            description=epilogue_for("observer_bailout"),
        )

    if (
        state.stability <= 0
        or state.closed_space_stage >= 3
        or (state.satisfaction <= 5 and state.closed_space_count >= 2)
    ):
        return Ending(
            ending_id="shinirappears_unstable_world",
            title="结构体崩解",
            description=epilogue_for("shinirappears_unstable_world"),
        )

    return None
