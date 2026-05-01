from __future__ import annotations

import uuid
from collections import Counter

import typer

from haruhi_cli.engine import GameEngine
from haruhi_cli.policy import create_policy
from haruhi_cli import storage, view

app = typer.Typer(no_args_is_help=True, help="Haruhi Endless Eight time-loop simulator.")
engine = GameEngine()


def _new_run_id() -> str:
    return uuid.uuid4().hex[:8]


@app.command(
    "start",
    help="Start a new time-loop run and print the initial state panel.",
)
def start(run_id: str | None = typer.Option(None, help="Optional run id.")) -> None:
    rid = run_id or _new_run_id()
    state = engine.create_new_state(rid)
    storage.save_state(state)
    view.render_state(state, engine.available_actions(state))
    typer.echo(f"Started run: {rid}")


@app.command(
    "step",
    help="Advance one timeslot by applying a chosen action to an existing run.",
)
def step(
    run_id: str = typer.Option(..., help="Run id."),
    action: str = typer.Option(..., "--action", "-a", help="Action id to apply."),
) -> None:
    try:
        state = storage.load_state(run_id)
    except FileNotFoundError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc

    history = storage.load_history(run_id)
    try:
        result = engine.step(state=state, action_id=action, step_number=len(history) + 1)
    except ValueError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc

    storage.append_history(run_id, result.record)
    storage.save_state(result.state)
    view.render_step(result.record)
    view.render_state(result.state, engine.available_actions(result.state))


@app.command(
    "status",
    help="Show the latest state snapshot and available actions for a run.",
)
def status(run_id: str = typer.Option(..., help="Run id.")) -> None:
    try:
        state = storage.load_state(run_id)
    except FileNotFoundError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
    view.render_state(state, engine.available_actions(state))


@app.command(
    "history",
    help="Inspect step-by-step decision history from history.jsonl.",
)
def history(
    run_id: str = typer.Option(..., help="Run id."),
    last: int | None = typer.Option(None, help="Only show last N records."),
) -> None:
    try:
        storage.load_state(run_id)
    except FileNotFoundError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
    records = storage.load_history(run_id)
    view.render_history(records, last=last)


@app.command(
    "replay",
    help="Replay a run timeline and summarize why it succeeded or failed.",
)
def replay(run_id: str = typer.Option(..., help="Run id.")) -> None:
    try:
        state = storage.load_state(run_id)
    except FileNotFoundError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
    records = storage.load_history(run_id)
    view.render_replay(run_id, state, records)


@app.command(
    "simulate",
    help="Run many auto-play sessions with a policy to estimate ending distribution.",
)
def simulate(
    runs: int = typer.Option(50, help="Number of simulation runs."),
    max_steps: int = typer.Option(30, help="Max steps per run."),
    policy_name: str = typer.Option("greedy", "--policy", help="Policy: random or greedy."),
) -> None:
    if runs <= 0:
        typer.secho("runs must be > 0", fg=typer.colors.RED)
        raise typer.Exit(code=1)

    try:
        policy = create_policy(policy_name)
    except ValueError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc

    endings = Counter()
    unresolved = 0
    for index in range(runs):
        state = engine.create_new_state(f"sim-{index}")
        records = []
        for step_number in range(1, max_steps + 1):
            action = policy.choose_action(state, engine.available_actions(state), records)
            result = engine.step(state, action, step_number)
            records.append(result.record)
            if state.is_finished:
                endings[state.ending_id or "unknown"] += 1
                break
        if not state.is_finished:
            unresolved += 1

    typer.echo(f"Simulated runs: {runs}")
    typer.echo(f"Unresolved loops: {unresolved}")
    for ending_id, count in sorted(endings.items(), key=lambda item: item[1], reverse=True):
        ratio = count / runs * 100
        typer.echo(f"{ending_id}: {count} ({ratio:.1f}%)")


if __name__ == "__main__":
    app()
