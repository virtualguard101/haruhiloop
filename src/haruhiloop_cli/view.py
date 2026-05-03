from __future__ import annotations

from dataclasses import dataclass

from rich.align import Align
from rich.console import Console
from rich.panel import Panel
from rich.style import Style
from rich.table import Table

from haruhiloop_cli import i18n
from haruhiloop_cli.models import GameState, Scene, SceneChoice, StepRecord

console = Console()
CLASSIC_QUOTE_JP = "過ぎ去った時間は、決して取り戻せないのよ"
_GLITCH_CHARS = "・＊※＋×"


@dataclass(slots=True)
class QuoteVisualState:
    pulse_phase: int = 0
    closed_space_stage: int = 0
    nagato_fatigue: int = 0
    transition_frames: int = 0
    clock_tick: int = 0
    worldline_shift: int = 0
    day: int = 1
    loop_count: int = 1


def build_quote_visual_state(
    state: GameState,
    *,
    pulse_phase: int,
    transition_frames: int,
    clock_tick: int,
) -> QuoteVisualState:
    return QuoteVisualState(
        pulse_phase=pulse_phase,
        closed_space_stage=state.closed_space_stage,
        nagato_fatigue=state.nagato_fatigue,
        transition_frames=transition_frames,
        clock_tick=clock_tick,
        worldline_shift=state.worldline_shift,
        day=state.day,
        loop_count=state.loop_count,
    )


def make_metric_table(state: GameState) -> Table:
    ts = i18n.format_timeslot(state.timeslot)
    table = Table(title=f"运行 {state.run_id} | 第 {state.day} 天 · {ts}")
    table.add_column("指标")
    table.add_column("数值", justify="right")
    table.add_row("循环周目", str(state.loop_count))
    table.add_row("春日满意度", str(state.satisfaction))
    table.add_row("世界稳定度", str(state.stability))
    table.add_row("线索点数", str(state.clue_points))
    table.add_row("作业进度", f"{state.homework_progress}/3")
    if state.homework_parts_done:
        table.add_row("作业环节", i18n.format_homework_parts(state.homework_parts_done))
    table.add_row("团员协同", str(state.crew_sync))
    table.add_row("闭锁空间次数", str(state.closed_space_count))
    table.add_row("闭锁空间阶段", str(state.closed_space_stage))
    residue = state.memory_residue
    table.add_row(
        "记忆残留",
        f"索效+{residue.get('clue_efficiency', 0)} / 协同恢复+{residue.get('sync_recovery', 0)}",
    )
    table.add_row("扰动模式", i18n.format_mutator_mode(state.mutator_mode))
    table.add_row("世界线偏移", str(state.worldline_shift))
    table.add_row("长门疲劳度", str(state.nagato_fatigue))
    if state.flags:
        table.add_row("叙事标记", i18n.format_flags(state.flags))
    if state.is_finished:
        zh = i18n.format_ending_summary(state.ending_id)
        etitle = (state.ending_title or "").strip()
        table.add_row("结局", etitle or zh)
        if state.ending_epilogue:
            table.add_row("结局剧情", state.ending_epilogue)
    return table


def _trend_suffix(previous: int | None, current: int, *, show_flat: bool = False) -> str:
    trend = i18n.format_trend(previous, current)
    if trend == "初始":
        return ""
    if trend == "持平" and not show_flat:
        return ""
    return f"（{trend}）"


def make_metric_table_hybrid(state: GameState, prev_state: GameState | None = None) -> Table:
    ts = i18n.format_timeslot(state.timeslot)
    table = Table(title=f"运行 {state.run_id} | 第 {state.day} 天 · {ts}（混合叙事）")
    table.add_column("状态")
    table.add_column("观察", justify="right")
    ps = prev_state
    table.add_row(
        "循环周目",
        f"第 {state.loop_count} 周目{_trend_suffix(ps.loop_count if ps else None, state.loop_count)}",
    )
    table.add_row(
        "春日状态",
        f"{i18n.band_satisfaction(state.satisfaction)}"
        f"{_trend_suffix(ps.satisfaction if ps else None, state.satisfaction)}",
    )
    table.add_row(
        "世界状态",
        f"{i18n.band_stability(state.stability)}"
        f"{_trend_suffix(ps.stability if ps else None, state.stability)}",
    )
    table.add_row(
        "线索推进",
        f"{i18n.band_clue_progress(state.clue_points)}"
        f"{_trend_suffix(ps.clue_points if ps else None, state.clue_points)}",
    )
    table.add_row(
        "团员协同",
        f"{i18n.band_crew_sync(state.crew_sync)}"
        f"{_trend_suffix(ps.crew_sync if ps else None, state.crew_sync)}",
    )
    table.add_row(
        "长门状态",
        f"{i18n.band_nagato_fatigue(state.nagato_fatigue)}"
        f"{_trend_suffix(ps.nagato_fatigue if ps else None, state.nagato_fatigue)}",
    )
    table.add_row(
        "作业进度",
        f"{state.homework_progress}/3"
        f"{_trend_suffix(ps.homework_progress if ps else None, state.homework_progress)}",
    )
    if state.homework_parts_done:
        table.add_row("作业环节", i18n.format_homework_parts(state.homework_parts_done))
    if state.flags:
        table.add_row("叙事标记", i18n.format_flags(state.flags))
    if state.is_finished:
        zh = i18n.format_ending_summary(state.ending_id)
        etitle = (state.ending_title or "").strip()
        table.add_row("结局", etitle or zh)
        if state.ending_epilogue:
            table.add_row("结局剧情", state.ending_epilogue)
    return table


_ROW_HIGHLIGHT = Style(bold=True, reverse=True)


def make_scene_table(
    scenes: list[Scene],
    *,
    subtitle: str = "",
    highlight_index: int | None = None,
) -> Table:
    title = "可用场景" + subtitle
    scene_table = Table(title=title)
    scene_table.add_column("序号", justify="right")
    scene_table.add_column("场景")
    scene_table.add_column("说明")
    for index, scene in enumerate(scenes, start=1):
        row_style = _ROW_HIGHLIGHT if highlight_index == index else None
        scene_table.add_row(
            str(index),
            scene.label,
            scene.description,
            style=row_style,
        )
    return scene_table


def make_choice_table(
    choices: list[SceneChoice],
    *,
    subtitle: str = "",
    highlight_index: int | None = None,
) -> Table:
    title = "可用选项" + subtitle
    choice_table = Table(title=title)
    choice_table.add_column("序号", justify="right")
    choice_table.add_column("选项")
    choice_table.add_column("说明")
    for index, choice in enumerate(choices, start=1):
        row_style = _ROW_HIGHLIGHT if highlight_index == index else None
        choice_table.add_row(
            str(index),
            choice.label,
            choice.description,
            style=row_style,
        )
    return choice_table


def make_scene_selector_panel(
    scenes: list[Scene],
    *,
    highlight_index: int | None = None,
) -> Panel:
    lines: list[str] = []
    if not scenes:
        lines.append("[dim]当前时段暂无可用场景。[/dim]")
    for index, scene in enumerate(scenes, start=1):
        selected = highlight_index == index
        if selected:
            lines.append(f"[bold reverse]▶ [{index}] {scene.label}[/bold reverse]")
            lines.append(f"[bold reverse]   {scene.description}[/bold reverse]")
        else:
            lines.append(f"  [{index}] {scene.label}")
            lines.append(f"     {scene.description}")
        lines.append("")
    body = "\n".join(lines).rstrip()
    return Panel(body or " ", title="场景选择（按数字键）", border_style="cyan")


def make_choice_selector_panel(
    choices: list[SceneChoice],
    *,
    scene_label: str,
    highlight_index: int | None = None,
) -> Panel:
    lines: list[str] = [f"[dim]当前场景：{scene_label}[/dim]", ""]
    if not choices:
        lines.append("[dim]请先选择场景。[/dim]")
    for index, choice in enumerate(choices, start=1):
        selected = highlight_index == index
        if selected:
            lines.append(f"[bold reverse]▶ [{index}] {choice.label}[/bold reverse]")
            lines.append(f"[bold reverse]   {choice.description}[/bold reverse]")
        else:
            lines.append(f"  [{index}] {choice.label}")
            lines.append(f"     {choice.description}")
        lines.append("")
    lines.append("[dim]数字键选中，Enter 确认，r 重置。[/dim]")
    body = "\n".join(lines).rstrip()
    return Panel(body or " ", title="行动选项", border_style="magenta")


def render_start_intro() -> None:
    """开局时展示玩法简介、目标与常用命令。"""
    body = """\
[bold]简介[/bold]
本模拟受《凉宫春日的忧郁》中「无尽的八月」启发：同一天反复轮转，你通过一次次微小选择推动数值与叙事标记变化，走向不同结局。

[bold]目标[/bold]
· 关注 [cyan]春日满意度[/cyan]、[cyan]世界稳定度[/cyan]、[cyan]线索点数[/cyan]；稳定过低易触发闭锁空间，情绪长期失衡会撕裂世界线。
· 通过线索、作业、真相同步与活动企划等组合，争取较好结局；放任无聊与不稳则可能迎来崩坏终局。

[bold]基本操作[/bold]
· 推进一步：[cyan]haruhi step 运行标识 --scene 场景 --choice 选项[/cyan] —— 场景/选项均可填序号或中文名。
· 看当前状态：[cyan]haruhi status 运行标识[/cyan]
· 看历史：[cyan]haruhi history 运行标识[/cyan]（可加 [cyan]--last N[/cyan]）
· 回放小结：[cyan]haruhi replay 运行标识[/cyan]
· 批量策略模拟：[cyan]haruhi simulate[/cyan]（估算结局分布，不影响手动存档）

开局后会打印你的[cyan]运行标识[/cyan]，请记下来并在后续命令中原样使用。"""
    console.print(Panel(body.strip(), title="Haruhi Loop — 开局说明", border_style="cyan"))
    console.print(make_classic_quote_panel())


def make_worldline_status_panel(visual_state: QuoteVisualState) -> Panel:
    seconds = visual_state.day * 60 + visual_state.clock_tick
    shown = seconds - 1 if visual_state.clock_tick % 5 == 0 else seconds
    reverse_mark = " << rewind" if visual_state.clock_tick % 5 == 0 else ""
    line = (
        f"WORLDLINE LOOP {visual_state.loop_count:03d} | "
        f"DAY {visual_state.day:03d} | "
        f"T+{shown:04d}s{reverse_mark} | "
        f"SHIFT {visual_state.worldline_shift:03d}"
    )
    if visual_state.transition_frames > 0:
        line += " | TRANSITION"
    return Panel(Align.center(line), title="观测层", border_style="blue")


def make_classic_quote_panel(
    visual_state: QuoteVisualState | None = None,
    *,
    pulse_phase: int = 0,
) -> Panel:
    state = visual_state or QuoteVisualState(pulse_phase=pulse_phase)
    border = "magenta"
    if state.closed_space_stage >= 2:
        border = "red" if state.pulse_phase % 2 == 0 else "bright_red"
    elif state.pulse_phase % 2 == 1:
        border = "bright_magenta"

    jp_style = "italic white" if state.pulse_phase % 2 == 0 else "italic bright_white"
    noise_level = 0
    if state.nagato_fatigue >= 85:
        noise_level = 3
    elif state.nagato_fatigue >= 70:
        noise_level = 2
    elif state.nagato_fatigue >= 55:
        noise_level = 1

    quote_text = _apply_noise(CLASSIC_QUOTE_JP, noise_level=noise_level, seed=state.clock_tick + state.day)
    # Keep a single-line quote while preserving a subtle breathing drift.
    drift_left = " " if state.pulse_phase % 2 == 0 else "  "
    drift_right = "  " if state.pulse_phase % 2 == 0 else " "
    block = f"[{jp_style}]{drift_left}{quote_text}{drift_right}[/{jp_style}]"
    title = ""
    if state.transition_frames > 0:
        title = "名台词 · WORLDLINE SHIFT"
    return Panel(Align.center(block, vertical="middle"), title=title, border_style=border)


def _apply_noise(text: str, *, noise_level: int, seed: int) -> str:
    if noise_level <= 0:
        return text
    chars = list(text)
    step = max(4, 10 - noise_level * 2)
    for idx in range((seed + noise_level) % step, len(chars), step):
        if chars[idx] != " ":
            chars[idx] = _GLITCH_CHARS[(idx + seed) % len(_GLITCH_CHARS)]
    return "".join(chars)


def render_state(state: GameState, scenes: list[Scene], choices: list[SceneChoice], selected_scene_label: str) -> None:
    console.print(make_metric_table(state))
    if state.closed_space_stage > 0:
        console.print(
            Panel(
                "闭锁空间处于活跃阶段：优先尝试「安抚春日」或「同步循环真相」以压制扩张。",
                title="危机提示",
                border_style="red",
            )
        )
    console.print(
        make_scene_table(scenes, subtitle="（step 时 --scene 可填序号或中文名）"),
    )
    console.print(
        make_choice_table(
            choices,
            subtitle=f"（当前场景：{selected_scene_label}；--choice 可填序号或中文名）",
        )
    )


def _narrative_change(previous: int, current: int, *, up: str, down: str, flat: str) -> str:
    if current > previous:
        return up
    if current < previous:
        return down
    return flat


def make_step_panel(record: StepRecord, *, narrative_mode: bool = False) -> Panel:
    lines = [
        f"场景：{record.scene_label}",
        f"选择：{record.choice_label}",
    ]
    if record.action_flavor:
        lines.append(record.action_flavor.strip())
    if narrative_mode:
        sat_before = int(record.before.get("satisfaction", 0))
        sat_after = int(record.after.get("satisfaction", sat_before))
        stab_before = int(record.before.get("stability", 0))
        stab_after = int(record.after.get("stability", stab_before))
        clue_before = int(record.before.get("clue_points", 0))
        clue_after = int(record.after.get("clue_points", clue_before))
        nagato_before = int(record.before.get("nagato_fatigue", 0))
        nagato_after = int(record.after.get("nagato_fatigue", nagato_before))
        lines.extend(
            [
                "阶段变化：",
                f"· 春日情绪：{_narrative_change(sat_before, sat_after, up='有所回升', down='明显下滑', flat='维持原状')}",
                f"· 世界状态：{_narrative_change(stab_before, stab_after, up='趋于稳定', down='出现裂痕', flat='暂无变化')}",
                f"· 线索推进：{_narrative_change(clue_before, clue_after, up='有新进展', down='线索受阻', flat='推进停滞')}",
                f"· 长门负担：{_narrative_change(nagato_before, nagato_after, up='进一步加重', down='略有缓和', flat='保持不变')}",
            ]
        )
    else:
        lines.extend(
            [
                f"变化 | 春日满意度：{record.before['satisfaction']} → {record.after['satisfaction']}",
                f"变化 | 世界稳定度：{record.before['stability']} → {record.after['stability']}",
                f"变化 | 线索点数：{record.before['clue_points']} → {record.after['clue_points']}",
                f"变化 | 长门疲劳：{record.before.get('nagato_fatigue', 0)} → {record.after.get('nagato_fatigue', 0)}",
            ]
        )
    if record.mutation_profile and not narrative_mode:
        profile = record.mutation_profile
        sat_k = i18n.MUTATION_PROFILE_KEY_LABELS.get("satisfaction_factor", "情绪系数")
        stab_k = i18n.MUTATION_PROFILE_KEY_LABELS.get("stability_factor", "稳定系数")
        clue_k = i18n.MUTATION_PROFILE_KEY_LABELS.get("clue_factor", "线索系数")
        lines.append(
            "扰动系数 | "
            f"{sat_k}x{profile.get('satisfaction_factor', 1.0):.2f} "
            f"{stab_k}x{profile.get('stability_factor', 1.0):.2f} "
            f"{clue_k}x{profile.get('clue_factor', 1.0):.2f}"
        )
    if record.events:
        lines.append("触发事件：")
        lines.extend(f"· {item}" for item in record.events)
    if record.ending_id:
        zh = i18n.format_ending_summary(record.ending_id)
        lines.append(f"触发结局：{zh}")
        ep = record.after.get("ending_epilogue") if isinstance(record.after, dict) else None
        if ep:
            lines.append("")
            lines.append("[bold]结局剧情[/bold]")
            lines.append(str(ep))
    return Panel("\n".join(lines), title=f"第 {record.step_number} 步")


def render_step(record: StepRecord) -> None:
    console.print(make_step_panel(record))


def render_history(records: list[StepRecord], last: int | None = None) -> None:
    selected = records[-last:] if last else records
    if not selected:
        console.print("尚无历史记录。")
        return
    table = Table(title=f"历史（共 {len(selected)} 条）")
    table.add_column("步数", justify="right")
    table.add_column("日 / 时段")
    table.add_column("场景/选择")
    table.add_column("事件数")
    table.add_column("结局")
    for item in selected:
        slot = i18n.format_timeslot(item.timeslot)
        table.add_row(
            str(item.step_number),
            f"第{item.day}天·{slot}",
            f"{item.scene_label} / {item.choice_label}",
            str(len(item.events)),
            i18n.format_ending_summary(item.ending_id) if item.ending_id else "—",
        )
    console.print(table)


def render_replay(run_id: str, state: GameState, records: list[StepRecord]) -> None:
    console.print(Panel(f"回放运行：{run_id}", title="回放"))
    render_history(records)
    if records:
        latest = records[-1]
        reason = "循环仍在继续。"
        if latest.ending_id:
            zh = i18n.format_ending_summary(latest.ending_id)
            reason = f"本局结束：{zh}。"
        elif state.stability < 25:
            reason = "走势偏负：稳定度持续下滑。"
        elif state.satisfaction < 20:
            reason = "走势偏负：春日满意度长期处于危险低位。"
        console.print(Panel(reason, title="小结"))
