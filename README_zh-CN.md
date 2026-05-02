<div align="center">

# Haruhi Loop CLI

[English](README.md)
[简体中文](README_zh-CN.md)

一个受《凉宫春日的忧郁》中“无尽的八月”主题启发的命令行时间循环模拟器。

</div>

受《凉宫春日的忧郁》中“无尽的八月”主题启发，这款命令行界面模拟了一个时间循环场景，主角凉宫春日不断重复经历同一天。该模拟在 `v0` 版本具有确定性，即相同的初始状态和行动序列总会产生相同的结果。

**界面语言**：终端输出、动作名称与 CLI 说明默认为**简体中文**。存档中的内部标记（如 `flags`、结局 `ending_id`）仍为英文键名，便于逻辑与测试保持一致。

## 玩法与剧情对应

这个原型把《凉宫春日》里的关键设定映射为可操作的状态机：

- **八月循环压力**：每天固定为 `morning`、`afternoon`、`evening` 三个时段，循环反复发生。
- **春日情绪影响现实**：`satisfaction` 表示春日情绪，长期无聊会让世界线失稳。
- **闭锁空间升级**：`stability` 过低会触发闭锁空间事件，对应动画中情绪失衡导致现实扭曲。
- **阿虚式微调破局**：通过微小且持续的行动积累（找线索、协调队友、补完遗留事项）逐步改写结局。
- **多世界线结局**：可能进入“新世界线”、成功跳出循环，或滑向崩坏结局（神人出现）。

你可以把每条命令理解成“推进这一集剧情的一步”，把每次选择的动作理解成 SOS 团的一次干预。

## 核心状态模型

每局 run 会维护以下关键状态：

- `loop_count`：完整日循环次数
- `satisfaction`：春日当前情绪值
- `stability`：世界线稳定度（决定闭锁空间风险）
- `clue_points`：线索和准备度累计值
- `flags`：叙事里程碑标记（用于结局判定）
- `homework_progress`：作业任务链进度（0–3，达标后写入 `homework_done`）
- `crew_sync`：SOS 团协同值（影响“同步循环真相”等关键动作收益）
- `closed_space_stage`：闭锁空间危机阶段（0–3）
- `memory_residue`：循环记忆残留（线索效率与协同恢复的缓慢增益）
- `worldline_mutation_profile`：世界线扰动系数（v0.4，可切换 deterministic / ai）

本模拟器默认采用确定性机制：

- 相同初始状态 + 相同行动序列 = 相同结果
- 便于复盘、调参与演示

## 行动与剧情含义（动作 ID 为中文）

下列 8 个动作在面板中以「序号」1–8 列出，`step` 时第二参数可填序号或完整中文名：

| 序号 | 动作 ID（中文） | 含义提要 |
|:---:|:---|:---|
| 1 | 老实上课 | 按部就班，风险低但推进有限 |
| 2 | 社团活动 | SOS 团日常，可短期缓解无聊 |
| 3 | 向长门核对异常 | 请长门核对违和与循环征兆（积累长门疲劳） |
| 4 | 向长门借资料 | 向长门借阅旁证与索引（积累更多长门疲劳） |
| 5 | 策划惊喜活动 | 用新鲜感对冲无聊 |
| 6 | 完成暑假作业 | 致敬八月篇「作业未完成」症结 |
| 7 | 同步循环真相 | 让众人知晓循环、统一行动 |
| 8 | 安抚春日 | 不稳时稳住春日情绪 |

## 结局与叙事解释（内部 ending_id）

- `haruhi_happy_new_world`：春日情绪被满足，关键条件达成，世界线转入更健康的未来。
- `kyon_breaks_loop`：细小改变累积到位，跳出重复日常。
- `shinirappears_unstable_world`：情绪与稳定度双重崩塌，闭锁空间灾害升级。

## 快速开始

```bash
uv sync --extra dev
uv run haruhi start
```

未安装 `uv` 时可在项目根目录：`pip install -e ".[dev]"`，再使用 `haruhi` 命令。

开局会先打印**开局说明**（简介、目标、常用命令），随后给出状态面板与 **运行标识**（如 `a1b2c3d4`），请记下并在后续命令中使用。

## 核心命令（位置参数）

以下示例中的 `RUN` 请替换为你的运行标识。

```bash
uv run haruhi start
uv run haruhi start RUN          # 可选：自定运行标识
uv run haruhi start --mutator-mode ai --seed 42 --ai-temperature 0.9

uv run haruhi step RUN 3         # 推进：第二参数为序号 1–8
uv run haruhi step RUN 向长门核对异常   # 或与面板一致的中文动作名

uv run haruhi status RUN
uv run haruhi history RUN --last 10
uv run haruhi replay RUN
uv run haruhi simulate --runs 100 --max-steps 30 --policy greedy
uv run haruhi simulate --runs 100 --policy random --mutator-mode ai --seed 7
```

## 命令详解

### `start`

创建新 run，并依次输出：

1. 开局说明（简介、目标、操作提示）
2. 当前状态面板与可用动作表（含序号）
3. 终端一行提示：`已开始运行：<run_id>`

### `step`

对已有 run 推进一个时段（`morning → afternoon → evening → 次日…`）。流程：应用动作增量 → 事件增量 → 判定结局 → 推进时间。

**用法**：`haruhi step <运行标识> <动作>`  
第二参数为 **序号 1–8**（与面板「序号」列对应），或与表中一致的 **中文动作名**（不可再加 `--run-id` / `--action` 长选项）。

### `status`

查看当前持久化状态与可用动作列表。

### `history`

读取 `history.jsonl`。可选 `--last N` / `-n`：仅最近 N 步。

### `replay`

回放轨迹并给出简要成败倾向小结。

### `simulate`

批量自动局，不写入手动存档；参数 `--runs`、`--max-steps`、`--policy`（`random` 或 `greedy`），并支持 `--mutator-mode`、`--seed`、`--ai-temperature`。

## CLI 帮助

```bash
uv run haruhi --help
uv run haruhi step --help
uv run haruhi simulate --help
```

## 存档位置

默认在项目运行时的当前目录下：`.haruhiloop_runs/<run_id>/`，内含 `state.json` 与 `history.jsonl`。

## 运行测试

```bash
uv run pytest -q
# 或：python -m pytest -q（需已 pip install -e ".[dev]" 且 pythonpath 配置正确）
```
