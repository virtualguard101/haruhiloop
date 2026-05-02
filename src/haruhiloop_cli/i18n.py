"""中文界面文案与展示用映射（内部 ID 仍为英文以保证存档与逻辑稳定）。"""

from __future__ import annotations

from haruhiloop_cli.models import EventOutcome

TIMESLOT_LABELS: dict[str, str] = {
    "day": "全天",
    "morning": "早晨",
    "afternoon": "午后",
    "evening": "傍晚",
}

FLAG_LABELS: dict[str, str] = {
    "anomaly_seen": "已察觉异常",
    "clue_chain_started": "线索链已展开",
    "festival_plan": "惊喜活动计划",
    "homework_done": "暑假作业已完成",
    "truth_shared": "已向众人揭示循环",
    "haruhi_calmed": "已安抚春日情绪",
    "closed_space_active": "闭锁空间展开中",
    "closed_space_resolved": "闭锁空间已抑制",
    "hope_signal": "希望信号",
}

ENDING_SUMMARY_LABELS: dict[str, str] = {
    "haruhi_happy_new_world": "晴空下的新周目",
    "consensus_paradise": "共识温室",
    "kyon_breaks_loop": "切口与回声",
    "meltdown_pact": "真相暴晒协议",
    "hollow_celebration": "空洞庆典",
    "archive_bound": "归档囚徒",
    "observer_bailout": "观测者脱钩",
    "shinirappears_unstable_world": "结构体崩解",
    "nagato_collapse": "长门有希的崩坏",
    "unknown": "未知结局",
}

EVENT_NAMES_ZH: dict[str, str] = {
    "boredom_spike": "重复日常引发的厌倦",
    "day_end_drift": "一日将尽的摩擦余波",
    "restless_search": "低落情绪下的可疑绕行",
    "sync_without_alignment": "协同不足导致同步失效",
    "homework_progress": "作业进度推进",
    "homework_completed": "作业全部完成",
    "homework_pressure": "作业压力累积",
    "homework_already_done": "作业复盘余量",
    "closed_space_stage": "闭锁空间危机阶段",
    "closed_space_countermeasure": "闭锁空间应对",
    "hope_signal": "希望信号",
}


def format_timeslot(timeslot: str) -> str:
    return TIMESLOT_LABELS.get(timeslot, timeslot)


def format_flags(flags: set[str] | list[str]) -> str:
    items = sorted(flags)
    return ", ".join(FLAG_LABELS.get(f, f) for f in items)


def format_event_line(event: EventOutcome) -> str:
    name = EVENT_NAMES_ZH.get(event.event_id, event.event_id)
    return f"{name}：{event.description}"


def format_ending_summary(ending_id: str | None) -> str:
    if not ending_id:
        return ENDING_SUMMARY_LABELS["unknown"]
    return ENDING_SUMMARY_LABELS.get(ending_id, ending_id)
