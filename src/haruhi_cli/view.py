from __future__ import annotations

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from haruhi_cli.models import Action, GameState, StepRecord

console = Console()


def render_state(state: GameState, actions: list[Action]) -> None:
    table = Table(title=f"Run {state.run_id} | Day {state.day} {state.timeslot}")
    table.add_column("Metric")
    table.add_column("Value", justify="right")
    table.add_row("Loop Count", str(state.loop_count))
    table.add_row("Satisfaction", str(state.satisfaction))
    table.add_row("Stability", str(state.stability))
    table.add_row("Clue Points", str(state.clue_points))
    table.add_row("Closed Space Count", str(state.closed_space_count))
    table.add_row("Worldline Shift", str(state.worldline_shift))
    if state.flags:
        table.add_row("Flags", ", ".join(sorted(state.flags)))
    if state.is_finished:
        table.add_row("Ending", f"{state.ending_id} ({state.ending_title})")
    console.print(table)

    action_table = Table(title="Available Actions")
    action_table.add_column("Action ID")
    action_table.add_column("Label")
    action_table.add_column("Impact")
    action_table.add_column("Description")
    for action in actions:
        impact = (
            f"S{action.delta_satisfaction:+d} "
            f"T{action.delta_stability:+d} "
            f"C{action.delta_clue_points:+d}"
        )
        action_table.add_row(action.action_id, action.label, impact, action.description)
    console.print(action_table)


def render_step(record: StepRecord) -> None:
    lines = [
        f"Action: {record.action_id} ({record.action_label})",
        f"Before -> After | satisfaction: {record.before['satisfaction']} -> {record.after['satisfaction']}",
        f"Before -> After | stability: {record.before['stability']} -> {record.after['stability']}",
        f"Before -> After | clue_points: {record.before['clue_points']} -> {record.after['clue_points']}",
    ]
    if record.events:
        lines.append("Events:")
        lines.extend(f"- {item}" for item in record.events)
    if record.ending_id:
        lines.append(f"Ending triggered: {record.ending_id}")
    console.print(Panel("\n".join(lines), title=f"Step {record.step_number}"))


def render_history(records: list[StepRecord], last: int | None = None) -> None:
    selected = records[-last:] if last else records
    if not selected:
        console.print("No history records yet.")
        return
    table = Table(title=f"History ({len(selected)} records)")
    table.add_column("Step", justify="right")
    table.add_column("Day/Slot")
    table.add_column("Action")
    table.add_column("Events")
    table.add_column("Ending")
    for item in selected:
        table.add_row(
            str(item.step_number),
            f"D{item.day}:{item.timeslot}",
            item.action_id,
            str(len(item.events)),
            item.ending_id or "-",
        )
    console.print(table)


def render_replay(run_id: str, state: GameState, records: list[StepRecord]) -> None:
    console.print(Panel(f"Replay for run {run_id}", title="Replay"))
    render_history(records)
    if records:
        latest = records[-1]
        reason = "Loop still active."
        if latest.ending_id:
            reason = f"Run ended with {latest.ending_id}."
        elif state.stability < 25:
            reason = "Failure trend: stability collapsing."
        elif state.satisfaction < 20:
            reason = "Failure trend: Haruhi satisfaction remains critically low."
        console.print(Panel(reason, title="Summary"))
