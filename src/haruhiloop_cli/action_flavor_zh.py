"""场景/选项叙事反馈（不参与数值判定）。"""

from __future__ import annotations

import hashlib
import random

from haruhiloop_cli.models import GameState

SCENE_CHOICE_FLAVORS: dict[str, tuple[str, ...]] = {
    "clubroom.group_briefing": (
        "春日把白板拍得很响：今天谁迟到谁负责搬道具。",
        "古泉提议先梳理流程，朝比奈赶紧把便签颜色分好。",
        "你把会议压到十五分钟，活动室终于没再吵起来。",
    ),
    "clubroom.surprise_pitch": (
        "春日盯着草案越看越兴奋：这次一定要比上一轮更炸。",
        "你把惊喜节点写成三段式，古泉难得没唱反调。",
        "朝比奈念彩排词时卡壳，春日反而笑了出来。",
    ),
    "library.nagato_crosscheck": (
        "长门把样本对齐后只说了三个字：还是同一天。",
        "你报出时间戳，长门在页边写下新的偏移注记。",
        "图书馆的空调声太大，长门却准确听见了你的犹豫。",
    ),
    "home.homework_focus": (
        "你把作业摊满桌面，先从最短那栏下手。",
        "笔尖刮纸的声音持续了半小时，终于勾掉一块心结。",
        "最后一页写完时，你才发现天已经彻底黑了。",
    ),
}

FALLBACK_FLAVORS: tuple[str, ...] = (
    "这一步没有显著波澜，但循环的纹路又被改写了一点。",
    "你按下了一个新的分岔，谁也不知道代价会落在哪个人身上。",
    "看似平常的安排，正在悄悄改变下一轮的起点。",
)


def _seed(state: GameState, scene_id: str, choice_id: str, step_number: int) -> int:
    count = state.scene_choice_counts.get(choice_id, 0)
    parts = [state.run_id, scene_id, choice_id, str(step_number), str(count)]
    if state.random_seed is not None:
        parts.append(str(state.random_seed))
    digest = hashlib.sha256("\0".join(parts).encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "little")


def pick_choice_flavor(state: GameState, scene_id: str, choice_id: str, step_number: int) -> str | None:
    key = f"{scene_id}.{choice_id}"
    variants = SCENE_CHOICE_FLAVORS.get(key, FALLBACK_FLAVORS)
    recent = tuple(state.scene_flavor_recent.get(key, ()))
    banned: int | None = None
    if len(recent) >= 2 and recent[-1] == recent[-2]:
        banned = recent[-1]
    selectable = [i for i in range(len(variants)) if i != banned] if banned is not None else list(range(len(variants)))
    rng = random.Random(_seed(state, scene_id, choice_id, step_number))
    idx = rng.choice(selectable)
    state.scene_flavor_recent[key] = (recent[-1], idx) if len(recent) >= 1 else (idx,)
    return variants[idx]
