from __future__ import annotations

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from haruhiloop_cli import i18n
from haruhiloop_cli.models import Action, GameState, StepRecord

console = Console()


def render_start_intro() -> None:
    """开局时展示玩法简介、目标与常用命令。"""
    body = """\
[bold]简介[/bold]
本模拟受《凉宫春日的忧郁》中「无尽的八月」启发：同一天反复轮转，你通过一次次微小选择推动数值与叙事标记变化，走向不同结局。

[bold]目标[/bold]
· 关注 [cyan]春日满意度[/cyan]、[cyan]世界稳定度[/cyan]、[cyan]线索点数[/cyan]；稳定过低易触发闭锁空间，情绪长期失衡会撕裂世界线。
· 通过线索、作业、真相同步与活动企划等组合，争取较好结局；放任无聊与不稳则可能迎来崩坏终局。

[bold]基本操作[/bold]
· 推进一步：[cyan]haruhi step 运行标识 动作[/cyan] —— 第二参数填动作 [cyan]序号 1–8[/cyan]（见下方表格），或与表中一致的[cyan]中文动作名[/cyan]。
· 看当前状态：[cyan]haruhi status 运行标识[/cyan]
· 看历史：[cyan]haruhi history 运行标识[/cyan]（可加 [cyan]--last N[/cyan]）
· 回放小结：[cyan]haruhi replay 运行标识[/cyan]
· 批量策略模拟：[cyan]haruhi simulate[/cyan]（估算结局分布，不影响手动存档）

开局后会打印你的[cyan]运行标识[/cyan]，请记下来并在后续命令中原样使用。"""
    console.print(Panel(body.strip(), title="Haruhi Loop — 开局说明", border_style="cyan"))


def render_state(state: GameState, actions: list[Action]) -> None:
    ts = i18n.format_timeslot(state.timeslot)
    table = Table(title=f"运行 {state.run_id} | 第 {state.day} 天 · {ts}")
    table.add_column("指标")
    table.add_column("数值", justify="right")
    table.add_row("循环周目", str(state.loop_count))
    table.add_row("春日满意度", str(state.satisfaction))
    table.add_row("世界稳定度", str(state.stability))
    table.add_row("线索点数", str(state.clue_points))
    table.add_row("闭锁空间次数", str(state.closed_space_count))
    table.add_row("世界线偏移", str(state.worldline_shift))
    if state.flags:
        table.add_row("叙事标记", i18n.format_flags(state.flags))
    if state.is_finished:
        etitle = state.ending_title or ""
        table.add_row("结局", f"{state.ending_id}（{etitle}）")
    console.print(table)

    action_table = Table(title="可用动作（step 时第二参数可填序号或下列中文名）")
    action_table.add_column("序号", justify="right")
    action_table.add_column("动作")
    action_table.add_column("倾向（情/稳/索）")
    action_table.add_column("说明")
    for index, action in enumerate(actions, start=1):
        impact = (
            f"情{action.delta_satisfaction:+d} "
            f"稳{action.delta_stability:+d} "
            f"索{action.delta_clue_points:+d}"
        )
        action_table.add_row(str(index), action.action_id, impact, action.description)
    console.print(action_table)


def render_step(record: StepRecord) -> None:
    lines = [
        f"动作：{record.action_id}",
        f"变化 | 春日满意度：{record.before['satisfaction']} → {record.after['satisfaction']}",
        f"变化 | 世界稳定度：{record.before['stability']} → {record.after['stability']}",
        f"变化 | 线索点数：{record.before['clue_points']} → {record.after['clue_points']}",
    ]
    if record.events:
        lines.append("触发事件：")
        lines.extend(f"· {item}" for item in record.events)
    if record.ending_id:
        zh = i18n.format_ending_summary(record.ending_id)
        lines.append(f"触发结局：{zh}（{record.ending_id}）")
    console.print(Panel("\n".join(lines), title=f"第 {record.step_number} 步"))


def render_history(records: list[StepRecord], last: int | None = None) -> None:
    selected = records[-last:] if last else records
    if not selected:
        console.print("尚无历史记录。")
        return
    table = Table(title=f"历史（共 {len(selected)} 条）")
    table.add_column("步数", justify="right")
    table.add_column("日 / 时段")
    table.add_column("动作")
    table.add_column("事件数")
    table.add_column("结局")
    for item in selected:
        slot = i18n.format_timeslot(item.timeslot)
        table.add_row(
            str(item.step_number),
            f"第{item.day}天·{slot}",
            item.action_label,
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
            reason = f"本局结束：{zh}（{latest.ending_id}）。"
        elif state.stability < 25:
            reason = "走势偏负：稳定度持续下滑。"
        elif state.satisfaction < 20:
            reason = "走势偏负：春日满意度长期处于危险低位。"
        console.print(Panel(reason, title="小结"))
