# Haruhi Loop 新人引导

本文按当前代码实现编写，覆盖 CLI 与 Textual 两种入口。

## 1) 安装依赖

```bash
uv sync --extra dev
```

或：

```bash
pip install -e ".[dev]"
```

## 2) CLI 模式：开一局

```bash
uv run haruhi start
```

可选参数：

```bash
uv run haruhi start --mutator-mode ai --seed 42 --ai-temperature 0.9
```

你会得到运行标识（`run_id`），后续命令都用它。

## 3) CLI 模式：推进与查看

```bash
uv run haruhi step RUN --scene 1 --choice 2
uv run haruhi step RUN --scene 活动室 --choice 例行集合
uv run haruhi step RUN --scene 图书馆 --choice 向长门核对异常
```

- `--scene` 支持当前时段场景序号或场景名
- `--choice` 支持该场景下选项序号或选项名

查看状态与记录：

```bash
uv run haruhi status RUN
uv run haruhi history RUN --last 10
uv run haruhi replay RUN
```

## 4) TUI 模式：键盘游玩

```bash
uv run haruhi-play
```

按键：

- `1-9`：先选场景，再选选项
- `Enter`：确认执行当前场景+选项
- `r`：重置预选（回到选场景）
- `n`：新开一局
- `v`：切换混合叙事/详细数值视图
- `h`：帮助
- `q`：退出

说明：TUI 和 CLI 共用同一引擎与存档结构。

## 5) 批量模拟

```bash
uv run haruhi simulate --runs 100 --max-steps 30 --policy greedy
uv run haruhi simulate --runs 100 --policy random --mutator-mode ai --seed 7
```

关键参数：

- `--policy random|greedy`
- `--mutator-mode deterministic|ai`
- `--seed`
- `--ai-temperature`

## 6) 关注哪些指标

- `route_state.route_progress`：路线推进（haruhi/nagato/mikuru/koizumi/truth）
- `route_state.character_affinity`：角色好感
- `route_state.route_tension`：路线张力
- `satisfaction/stability/clue_points`：核心资源
- `homework_progress`：作业任务链进度
- `crew_sync`：团员协同
- `closed_space_stage` 与 `nagato_fatigue`：风险压力

## 7) 存档位置

```text
.haruhiloop_runs/<run_id>/
  state.json
  history.jsonl
```

## 8) 运行测试

```bash
uv run pytest -q
```
