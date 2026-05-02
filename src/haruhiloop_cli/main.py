from __future__ import annotations

import uuid
from collections import Counter
import random

import typer

from haruhiloop_cli import i18n
from haruhiloop_cli.engine import GameEngine
from haruhiloop_cli.policy import create_policy
from haruhiloop_cli import rules, storage, view

app = typer.Typer(
    no_args_is_help=True,
    help="《凉宫春日》无尽八月主题的时间循环命令行模拟器。",
)
engine = GameEngine()


def _new_run_id() -> str:
    return uuid.uuid4().hex[:8]


@app.command(
    "start",
    help="开始新的一局，并打印初始状态面板。",
)
def start(
    run_id: str | None = typer.Argument(None, help="可选；省略则随机生成运行标识。"),
    mutator_mode: str = typer.Option(
        "deterministic",
        "--mutator-mode",
        help="世界线扰动模式：deterministic（确定性）或 ai（受控非确定性）。",
    ),
    seed: int | None = typer.Option(None, "--seed", help="随机种子（用于复现实验）。"),
    ai_temperature: float = typer.Option(0.7, "--ai-temperature", help="AI 扰动温度（0.0-1.5）。"),
) -> None:
    if mutator_mode not in {"deterministic", "ai"}:
        typer.secho("mutator-mode 仅支持 deterministic 或 ai", fg=typer.colors.RED)
        raise typer.Exit(code=1)
    if ai_temperature < 0 or ai_temperature > 1.5:
        typer.secho("ai-temperature 必须在 0.0 到 1.5 之间", fg=typer.colors.RED)
        raise typer.Exit(code=1)
    rid = run_id or _new_run_id()
    state = engine.create_new_state(
        rid,
        mutator_mode=mutator_mode,
        random_seed=seed,
        ai_temperature=ai_temperature,
    )
    storage.save_state(state)
    view.render_start_intro()
    view.render_state(state, engine.available_actions(state))
    typer.echo(f"已开始运行：{rid}")


@app.command(
    "step",
    help="对已有运行推进一个时段：先写运行标识，再写动作（序号 1–8 或中文动作名）。",
)
def step(
    run_id: str = typer.Argument(..., help="运行标识。"),
    action_ref: str = typer.Argument(
        ...,
        metavar="动作",
        help="动作序号 1–8，或与面板「动作」列一致的中文名。",
    ),
) -> None:
    try:
        action_id = rules.resolve_action_ref(action_ref)
    except ValueError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc

    try:
        state = storage.load_state(run_id)
    except FileNotFoundError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc

    history = storage.load_history(run_id)
    try:
        result = engine.step(state=state, action_id=action_id, step_number=len(history) + 1)
    except ValueError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc

    storage.append_history(run_id, result.record)
    storage.save_state(result.state)
    view.render_step(result.record)
    view.render_state(result.state, engine.available_actions(result.state))


@app.command(
    "status",
    help="显示某一运行的最新状态快照与当前可用动作。",
)
def status(run_id: str = typer.Argument(..., help="运行标识。")) -> None:
    try:
        state = storage.load_state(run_id)
    except FileNotFoundError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
    view.render_state(state, engine.available_actions(state))


@app.command(
    "history",
    help="从 history.jsonl 查看逐步决策历史。",
)
def history(
    run_id: str = typer.Argument(..., help="运行标识。"),
    last: int | None = typer.Option(None, "--last", "-n", help="仅显示最近 N 条记录。"),
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
    help="回放某一运行的轨迹，并小结成败倾向。",
)
def replay(run_id: str = typer.Argument(..., help="运行标识。")) -> None:
    try:
        state = storage.load_state(run_id)
    except FileNotFoundError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
    records = storage.load_history(run_id)
    view.render_replay(run_id, state, records)


@app.command(
    "simulate",
    help="用策略批量自动运行多局，估算结局分布。",
)
def simulate(
    runs: int = typer.Option(50, help="模拟局数。"),
    max_steps: int = typer.Option(30, help="每局最多步数。"),
    policy_name: str = typer.Option(
        "greedy",
        "--policy",
        help="策略名称：random（随机）或 greedy（贪心）。",
    ),
    mutator_mode: str = typer.Option(
        "deterministic",
        "--mutator-mode",
        help="世界线扰动模式：deterministic 或 ai。",
    ),
    seed: int | None = typer.Option(None, "--seed", help="随机种子（用于复现实验）。"),
    ai_temperature: float = typer.Option(0.7, "--ai-temperature", help="AI 扰动温度（0.0-1.5）。"),
) -> None:
    if runs <= 0:
        typer.secho("模拟局数必须大于 0", fg=typer.colors.RED)
        raise typer.Exit(code=1)
    if mutator_mode not in {"deterministic", "ai"}:
        typer.secho("mutator-mode 仅支持 deterministic 或 ai", fg=typer.colors.RED)
        raise typer.Exit(code=1)
    if ai_temperature < 0 or ai_temperature > 1.5:
        typer.secho("ai-temperature 必须在 0.0 到 1.5 之间", fg=typer.colors.RED)
        raise typer.Exit(code=1)

    try:
        policy = create_policy(policy_name)
    except ValueError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
    if policy_name == "random" and seed is not None:
        random.seed(seed)

    endings = Counter()
    unresolved = 0
    for index in range(runs):
        run_seed = None if seed is None else seed + index
        state = engine.create_new_state(
            f"sim-{index}",
            mutator_mode=mutator_mode,
            random_seed=run_seed,
            ai_temperature=ai_temperature,
        )
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

    typer.echo(f"模拟局数：{runs}")
    typer.echo(f"未在步数内结算的循环：{unresolved}")
    for ending_id, count in sorted(endings.items(), key=lambda item: item[1], reverse=True):
        ratio = count / runs * 100
        label = i18n.format_ending_summary(ending_id)
        typer.echo(f"{label}（{ending_id}）：{count}（{ratio:.1f}%）")


if __name__ == "__main__":
    app()
