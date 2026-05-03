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
uv run haruhi step RUN 3
uv run haruhi step RUN 向长门核对异常
uv run haruhi step RUN 观察异常
```

- 支持序号 `1-8`
- 支持中文动作名
- 兼容别名：`观察异常` / `整合线索`

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

- `1-8`：预选动作
- `Enter`：确认执行
- `n`：新开一局
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

- `satisfaction`：春日情绪
- `stability`：世界稳定度
- `clue_points`：线索累计
- `homework_progress`：作业任务链进度
- `crew_sync`：团员协同
- `closed_space_stage`：闭锁危机阶段
- `nagato_fatigue`：长门疲劳暗线

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
