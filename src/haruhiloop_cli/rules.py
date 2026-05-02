from __future__ import annotations

from haruhiloop_cli.models import Action, Ending, EventOutcome, GameState

# Table-driven action definitions keep content extensible.
# 键与 action_id 均为中文标识（展示与 CLI 序号 1–N 对应）。
ACTIONS: dict[str, Action] = {
    "老实上课": Action(
        action_id="老实上课",
        label="老实上课",
        description="按暑期日程正常到校上课。",
        delta_stability=2,
    ),
    "社团活动": Action(
        action_id="社团活动",
        label="社团活动",
        description="参与 SOS 团的日常事务。",
        delta_satisfaction=3,
        delta_stability=-2,
    ),
    "观察异常": Action(
        action_id="观察异常",
        label="观察异常",
        description="留意违和之处与时间循环的痕迹。",
        delta_clue_points=3,
        delta_stability=-3,
        add_flags=("anomaly_seen",),
    ),
    "整合线索": Action(
        action_id="整合线索",
        label="整合线索",
        description="核对传闻并把重复出现的细节串起来。",
        delta_clue_points=4,
        delta_satisfaction=-1,
        add_flags=("clue_chain_started",),
    ),
    "策划惊喜活动": Action(
        action_id="策划惊喜活动",
        label="策划惊喜活动",
        description="筹备有趣企划，对冲春日的无聊感。",
        delta_satisfaction=8,
        delta_stability=-1,
        add_flags=("festival_plan",),
    ),
    "完成暑假作业": Action(
        action_id="完成暑假作业",
        label="完成暑假作业",
        description="写完暑期作业，消解悬而未决的遗憾。",
        delta_satisfaction=2,
        delta_stability=4,
    ),
    "同步循环真相": Action(
        action_id="同步循环真相",
        label="同步循环真相",
        description="当面讨论循环，让大家行动一致。",
        delta_clue_points=2,
        delta_satisfaction=5,
        add_flags=("truth_shared",),
    ),
    "安抚春日": Action(
        action_id="安抚春日",
        label="安抚春日",
        description="在局势不稳时引导情绪，避免春日发火。",
        delta_satisfaction=6,
        delta_stability=3,
        add_flags=("haruhi_calmed",),
    ),
}

ORDERED_ACTION_IDS: tuple[str, ...] = tuple(ACTIONS.keys())


def resolve_action_ref(token: str) -> str:
    """将 CLI 输入解析为动作 ID：纯数字 1–N 表示第 N 个动作，否则须为已注册的中文动作名。"""
    t = token.strip()
    if t.isdigit():
        i = int(t)
        if 1 <= i <= len(ORDERED_ACTION_IDS):
            return ORDERED_ACTION_IDS[i - 1]
        raise ValueError(f"序号须在 1–{len(ORDERED_ACTION_IDS)} 之间：{t}")
    if t in ACTIONS:
        return t
    raise ValueError(f"未知动作：{t}")


def get_available_actions(_state: GameState) -> list[Action]:
    return list(ACTIONS.values())


def evaluate_events(state: GameState, action: Action) -> list[EventOutcome]:
    outcomes: list[EventOutcome] = []

    if state.current_action_streak >= 2:
        outcomes.append(
            EventOutcome(
                event_id="boredom_spike",
                description="重复同样的安排让春日更加厌倦。",
                delta_satisfaction=-2 * state.current_action_streak,
                delta_stability=-state.current_action_streak,
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

    if action.action_id == "同步循环真相" and state.crew_sync < 55:
        outcomes.append(
            EventOutcome(
                event_id="sync_without_alignment",
                description="团员协同不足，同步真相并未形成稳定合力。",
                delta_stability=-2,
                delta_satisfaction=-1,
            )
        )

    if (
        action.action_id == "策划惊喜活动"
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
    if (
        state.satisfaction >= 85
        and state.clue_points >= 10
        and {"festival_plan", "homework_done", "truth_shared"}.issubset(state.flags)
        and state.crew_sync >= 65
    ):
        return Ending(
            ending_id="haruhi_happy_new_world",
            title="春日满足的新世界线",
            description="春日得到回应，世界线转向更明亮的未来。",
        )

    if (
        state.clue_points >= 12
        and {"anomaly_seen", "homework_done", "truth_shared"}.issubset(state.flags)
        and state.stability >= 45
        and state.crew_sync >= 55
    ):
        return Ending(
            ending_id="kyon_breaks_loop",
            title="阿虚打破无尽八月",
            description="细小改变的累积终于对齐，循环被切开。",
        )

    if (
        state.stability <= 0
        or state.closed_space_stage >= 3
        or (state.satisfaction <= 5 and state.closed_space_count >= 2)
    ):
        return Ending(
            ending_id="shinirappears_unstable_world",
            title="神人于闭锁中出现",
            description="挫败撕裂现实，异常巨大的存在显现其中。",
        )

    return None
