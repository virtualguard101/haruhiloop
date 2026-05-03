from __future__ import annotations

import uuid
from collections import Counter
import random

import typer

from haruhiloop_cli import i18n
from haruhiloop_cli.engine import GameEngine
from haruhiloop_cli.policy import create_policy
from haruhiloop_cli import rules, storage, view
from haruhiloop_cli.models import StepCommand

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
    state = engine.create_new_state(
        rid,
        mutator_mode=mutator_mode,
        random_seed=seed,
        ai_temperature=ai_temperature,
    )
    storage.save_state(state)
    view.render_start_intro()
    scenes = engine.available_scenes(state)
    selected_scene = scenes[0] if scenes else None
    choices = engine.available_choices(state, selected_scene.scene_id) if selected_scene else []
    view.render_state(state, scenes, choices, selected_scene.label if selected_scene else "—")
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
        state = storage.load_state(run_id)
    except (FileNotFoundError, ValueError) as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc

    history = storage.load_history(run_id)
    try:
        scene_id = rules.resolve_scene_ref(state, scene)
        choice_id = rules.resolve_choice_ref(state, scene_id, choice)
        result = engine.step(
            state=state,
            command=StepCommand(scene_id=scene_id, choice_id=choice_id),
            step_number=len(history) + 1,
        )
    except ValueError as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc

    storage.append_history(run_id, result.record)
    storage.save_state(result.state)
    view.render_step(result.record)
    scenes = engine.available_scenes(result.state)
    selected_scene = next((s for s in scenes if s.scene_id == result.record.scene_id), scenes[0] if scenes else None)
    choices = engine.available_choices(result.state, selected_scene.scene_id) if selected_scene else []
    view.render_state(result.state, scenes, choices, selected_scene.label if selected_scene else "—")


@app.command(
    "status",
    help="显示某一运行的最新状态快照与当前可用场景/选项。",
)
def status(run_id: str = typer.Argument(..., help="运行标识。")) -> None:
    try:
        state = storage.load_state(run_id)
    except (FileNotFoundError, ValueError) as exc:
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
    scenes = engine.available_scenes(state)
    selected_scene = scenes[0] if scenes else None
    choices = engine.available_choices(state, selected_scene.scene_id) if selected_scene else []
    view.render_state(state, scenes, choices, selected_scene.label if selected_scene else "—")


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
    except (FileNotFoundError, ValueError) as exc:
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
    except (FileNotFoundError, ValueError) as exc:
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
            scenes = engine.available_scenes(state)
            if not scenes:
                break
            choice_map = {scene.scene_id: engine.available_choices(state, scene.scene_id) for scene in scenes}
            command = policy.choose_command(state, scenes, choice_map, records)
            result = engine.step(state, command, step_number)
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
        typer.echo(f"{label}：{count}（{ratio:.1f}%）")


if __name__ == "__main__":
    app()
