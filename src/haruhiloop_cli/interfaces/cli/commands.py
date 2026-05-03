from __future__ import annotations

import uuid

import typer

from haruhiloop_cli.narrative import i18n
from haruhiloop_cli.application.services.game_service import GameService
from haruhiloop_cli.domain.rules.policy import create_policy
from haruhiloop_cli.interfaces.tui import view_renderers as view

app = typer.Typer(
    no_args_is_help=True,
    help="《凉宫春日》无尽八月主题的时间循环命令行模拟器。",
)
service = GameService()


def _new_run_id() -> str:
    return uuid.uuid4().hex[:8]


@app.command(
    "start",
    help="开始新的一局，并打印初始状态面板。",
)
def start(
    run_id: str | None = typer.Argument(None, help="可选；省略则随机生成运行标识。"),
    mutator_mode: str = typer.Option(
        "ai",
        "--mutator-mode",
        help="世界线扰动模式：ai（默认）或 deterministic（确定性）。",
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
    run_view = service.start_run(
        rid,
        mutator_mode=mutator_mode,
        seed=seed,
        ai_temperature=ai_temperature,
    )
    view.render_start_intro()
    view.render_state(
        run_view.state,
        run_view.scenes,
        run_view.choices,
        run_view.selected_scene.label if run_view.selected_scene else "—",
    )
    typer.echo(f"已开始运行：{rid}")


@app.command(
    "step",
    help="对已有运行推进一个时段：先指定场景，再指定该场景下的选项。",
)
def step(
    run_id: str = typer.Argument(..., help="运行标识。"),
    scene: str = typer.Option(..., "--scene", help="场景序号或场景名。"),
    choice: str = typer.Option(..., "--choice", help="选项序号或选项名（基于所选场景）。"),
) -> None:
    try:
        step_view = service.step_run(run_id, scene, choice)
    except (FileNotFoundError, ValueError) as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc

    view.render_step(step_view.result.record)
    view.render_state(
        step_view.result.state,
        step_view.scenes,
        step_view.choices,
        step_view.selected_scene.label if step_view.selected_scene else "—",
    )


@app.command(
    "status",
    help="显示某一运行的最新状态快照与当前可用场景/选项。",
)
def status(run_id: str = typer.Argument(..., help="运行标识。")) -> None:
    try:
        run_view = service.status(run_id)
    except (FileNotFoundError, ValueError) as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
    view.render_state(
        run_view.state,
        run_view.scenes,
        run_view.choices,
        run_view.selected_scene.label if run_view.selected_scene else "—",
    )


@app.command(
    "history",
    help="从 history.jsonl 查看逐步决策历史。",
)
def history(
    run_id: str = typer.Argument(..., help="运行标识。"),
    last: int | None = typer.Option(None, "--last", "-n", help="仅显示最近 N 条记录。"),
) -> None:
    try:
        records = service.history(run_id)
    except (FileNotFoundError, ValueError) as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
    view.render_history(records, last=last)


@app.command(
    "replay",
    help="回放某一运行的轨迹，并小结成败倾向。",
)
def replay(run_id: str = typer.Argument(..., help="运行标识。")) -> None:
    try:
        state, records = service.replay(run_id)
    except (FileNotFoundError, ValueError) as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
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
        "ai",
        "--mutator-mode",
        help="世界线扰动模式：ai（默认）或 deterministic。",
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
        create_policy(policy_name)
        summary = service.simulate(
            runs=runs,
            max_steps=max_steps,
            policy_name=policy_name,
            mutator_mode=mutator_mode,
            seed=seed,
            ai_temperature=ai_temperature,
        )
    except ValueError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc

    typer.echo(f"模拟局数：{summary.runs}")
    typer.echo(f"未在步数内结算的循环：{summary.unresolved}")
    for ending_id, count in sorted(summary.endings.items(), key=lambda item: item[1], reverse=True):
        ratio = count / summary.runs * 100
        label = i18n.format_ending_summary(ending_id)
        typer.echo(f"{label}：{count}（{ratio:.1f}%）")


if __name__ == "__main__":
    app()

