<div align="center">

# Haruhi Loop CLI

[English](README.md)
[简体中文](README_zh-CN.md)

一个受《凉宫春日的忧郁》中“无尽的八月”启发的时间循环模拟器（CLI + TUI）。

</div>

## 项目概览

当前项目同时提供两种入口：

- `haruhi`：Typer 命令行接口
- `haruhi-play`：Textual 键盘交互界面

模拟核心保持状态机可回放。确定性模式下，相同初始状态与动作序列会得到相同结果。

## 工程架构

项目已完成第一阶段工程化分层重构，采用以下层次：

- `interfaces`：CLI/TUI 入口与渲染适配
- `application`：用例编排服务（`start/step/status/replay/simulate`）
- `domain`：引擎、规则、系统机制、模型
- `infrastructure`：存档持久化
- `narrative`：i18n 与叙事文案资源

详细说明见 `docs/arch.md`。

## 玩法机制

- 时间按 `morning -> afternoon -> evening` 推进，傍晚后进入下一天
- v0.3 机制：作业任务链、团员协同、闭锁危机阶段、循环记忆残留
- v0.4 机制：世界线扰动 profile（`deterministic` / `ai`）
- 合并玩法：长门疲劳暗线、多世界线结局与结局长剧情

## 快速开始

```bash
uv sync --extra dev
uv run haruhi start
uv run haruhi-play
```

没有 `uv` 时：

```bash
pip install -e ".[dev]"
haruhi --help
haruhi-play
```

## 核心命令示例

将 `RUN` 替换为运行标识。

```bash
uv run haruhi start
uv run haruhi start RUN
uv run haruhi start --mutator-mode ai --seed 42 --ai-temperature 0.9

uv run haruhi step RUN 3
uv run haruhi step RUN 向长门核对异常
uv run haruhi step RUN 观察异常

uv run haruhi status RUN
uv run haruhi history RUN --last 10
uv run haruhi replay RUN
uv run haruhi simulate --runs 100 --max-steps 30 --policy greedy
uv run haruhi simulate --runs 100 --policy random --mutator-mode ai --seed 7
```

兼容提示：`观察异常`、`整合线索` 仍可输入，会映射为新动作名称。

## 动作列表（序号 1–8）

| 序号 | 动作 | 含义 |
|---:|---|---|
| 1 | 老实上课 | 保守推进，稳态偏正 |
| 2 | 社团活动 | 缓解无聊但有稳定代价 |
| 3 | 向长门核对异常 | 快速增线索，增加长门疲劳 |
| 4 | 向长门借资料 | 更强线索收益，更高疲劳代价 |
| 5 | 策划惊喜活动 | 提升满意度，推动希望信号 |
| 6 | 完成暑假作业 | 推动作业任务链，达标后写入 `homework_done` |
| 7 | 同步循环真相 | 协同值不足时会有惩罚事件 |
| 8 | 安抚春日 | 危机时的稳定化手段 |

## TUI 台词沉浸效果

TUI 中围绕日文台词 `過ぎ去った時間は、決して取り戻せないのよ` 提供：

- 常驻居中台词层（主字 + 残影）
- 低频呼吸闪烁
- 倒放时钟感世界线状态条
- 跨日/跨周目时短转场提示
- `closed_space_stage` 驱动的边框入侵效果
- `nagato_fatigue` 驱动的轻微字符噪声化

## 结局 ID

- `nagato_collapse`
- `haruhi_happy_new_world`
- `consensus_paradise`
- `kyon_breaks_loop`
- `meltdown_pact`
- `hollow_celebration`
- `archive_bound`
- `observer_bailout`
- `shinirappears_unstable_world`

结局条件详见 `docs/dev_endings.md`。

## 存档

默认在当前目录写入：

```text
.haruhiloop_runs/<run_id>/
  state.json
  history.jsonl
```

## 测试

```bash
uv run pytest -q
```
